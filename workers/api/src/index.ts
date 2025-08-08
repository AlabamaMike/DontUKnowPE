import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { roomCode, roomNameFromCode } from './utils/room'
import { GAME_RULES } from './game/constants'
import { normalizeQuestion, selectQuestions } from './utils/db'
import type { ClientMsg, ServerMsg } from './game/protocol'

export type Bindings = {
  KV_CONFIG: KVNamespace
  DB: D1Database
  ROOMS: DurableObjectNamespace
  ELEVENLABS_API_KEY?: string
  AZURE_OPENAI_API_KEY?: string
  AZURE_OPENAI_ENDPOINT?: string
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('*', cors())

app.get('/', (c) => c.json({ ok: true, service: 'dontuknowpe-api' }))
app.get('/healthz', (c) => c.text('ok'))
app.post('/rooms', async (c) => {
  const code = roomCode()
  const name = roomNameFromCode(code)
  const id = c.env.ROOMS.idFromName(name)
  const stub = c.env.ROOMS.get(id)
  await stub.fetch('http://room/init', { method: 'POST', body: JSON.stringify({ code }) })
  return c.json({ code, ws: `/rooms/${code}/ws`, created: true })
})
app.get('/rooms/:code/ws', async (c) => {
  const code = c.req.param('code')
  const name = roomNameFromCode(code)
  const id = c.env.ROOMS.idFromName(name)
  const stub = c.env.ROOMS.get(id)
  return await stub.fetch('http://room/ws', c.req.raw)
})

export default app

export class RoomDO implements DurableObject {
  state: DurableObjectState
  env: Bindings
  code: string | null = null
  sockets: Set<WebSocket> = new Set()
  host?: WebSocket
  players: Map<string, { id: string; name: string; avatar?: string; score: number; avgMs: number; answers: number }> = new Map()
  round: 1 | 2 | 3 = 1
  qIndex = 0
  phase: 'lobby' | 'reveal' | 'question' | 'inter' = 'lobby'
  currentQ?: { id: string; kind: 'tf'|'mc'|'num'; text: string; correct: any; options?: string[]; tolerance?: number }
  usedIds: Set<string> = new Set()
  answerStartAt = 0
  answers: Map<string, { correct: boolean; ms: number; at: number }> = new Map()
  constructor(state: DurableObjectState, env: Bindings) {
    this.state = state
    this.env = env
  }
  async fetch(req: Request) {
    const url = new URL(req.url)
    if (url.pathname === '/init' && req.method === 'POST') {
      const { code } = await req.json<any>()
      await this.state.storage.put('code', code)
      this.code = code
      return new Response('ok')
    }
    if (url.pathname === '/ws' && req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]
  // Cloudflare WebSocket
  ;(server as any).accept()
      this.sockets.add(server)
      server.addEventListener('close', () => {
        this.sockets.delete(server)
        if (this.host === server) this.host = undefined
      })
      server.addEventListener('message', (e: MessageEvent) => this.onMessage(server, e))
  return new Response(null as any, { status: 101, webSocket: client as any } as any)
    }
    return new Response('Room DO', { status: 200 })
  }

  private send(ws: WebSocket, msg: ServerMsg) {
  ;(ws as any).send(JSON.stringify(msg))
  }
  private broadcast(msg: ServerMsg) {
    for (const ws of this.sockets) this.send(ws, msg)
  }
  private lobbyUpdate() {
    this.broadcast({ type: 'lobby', code: this.code || '', players: Array.from(this.players.values()).map(p => ({ id: p.id, name: p.name, score: p.score, avatar: p.avatar })) })
  }
  private onMessage(ws: WebSocket, e: MessageEvent) {
    let msg: ClientMsg
    try { msg = JSON.parse(String(e.data)) } catch { return }
    if (msg.type === 'hello') {
      if (msg.role === 'host') {
        this.host = ws
        this.lobbyUpdate()
        return
      }
      // player hello
      const id = msg.playerId || crypto.randomUUID()
      const name = msg.name || `Player-${id.slice(0, 4)}`
      const avatar = msg.avatar
      if (!this.players.has(id)) this.players.set(id, { id, name, avatar, score: 0, avgMs: 0, answers: 0 })
      else {
        const p = this.players.get(id)!
        p.name = name
        p.avatar = avatar
      }
      this.lobbyUpdate()
      return
    }
    if (msg.type === 'start' && ws === this.host) {
      this.round = 1; this.qIndex = 0; this.phase = 'inter'
      this.nextQuestion()
      return
    }
    if (msg.type === 'answer' && this.phase === 'question') {
      const p = this.players.get(msg.playerId)
      if (!p) return
      const at = msg.at ?? Date.now()
      const ms = Math.max(0, at - this.answerStartAt)
      const correct = this.checkAnswer(msg)
      // record first answer per player only
      if (!this.answers.has(p.id)) this.answers.set(p.id, { correct, ms, at })
      return
    }
  }
  private checkAnswer(msg: { questionId: string; payload: any }) {
    if (!this.currentQ || this.currentQ.id !== msg.questionId) return false
    const c = this.currentQ.correct
    if (this.currentQ.kind === 'tf') {
      return Boolean(c) === Boolean(msg.payload)
    }
    if (this.currentQ.kind === 'mc') {
      return Number(c) === Number(msg.payload)
    }
    // numeric with tolerance
    const tol = Number(this.currentQ.tolerance || 0)
    const ans = Number(msg.payload)
    const corr = Number(c)
    return Math.abs(ans - corr) <= tol
  }
  private async nextQuestion() {
    if (this.qIndex >= GAME_RULES.questionsPerRound) {
      if (this.round < 3) {
        this.phase = 'inter'
        const nextAt = Date.now() + 3000
        this.broadcast({ type: 'between_rounds', round: this.round as any, nextAt })
        setTimeout(() => { this.round = (this.round + 1) as any; this.qIndex = 0; this.nextQuestion() }, 3000)
        return
      }
      // leaderboard
      const players = Array.from(this.players.values()).map(p => ({ id: p.id, name: p.name, score: p.score, avgMs: p.avgMs }))
      players.sort((a,b)=> b.score - a.score || a.avgMs - b.avgMs)
      this.broadcast({ type: 'leaderboard', players, top3: players.slice(0,3).map(p=>p.id) })
      return
    }
    // Fetch next random question from D1 excluding used ones
  const rows = await selectQuestions(this.env.DB, 1, Array.from(this.usedIds), [], ['tf'])
    if (!rows.length) {
      // fallback simple TF if DB empty
      this.currentQ = { id: crypto.randomUUID(), kind: 'tf', text: 'PE is fun?', correct: true }
    } else {
      const nq = normalizeQuestion(rows[0])
      this.currentQ = nq as any
      this.usedIds.add(nq.id)
    }
  this.phase = 'reveal'
  const revealAt = Date.now() + GAME_RULES.answerDelayMs
  const cq = this.currentQ!
  const qBrief: any = { id: cq.id, text: cq.text, kind: cq.kind }
  if (cq.kind === 'mc') qBrief.options = cq.options
  this.broadcast({ type: 'question', q: qBrief, revealAt })
    setTimeout(() => this.openAnswers(), GAME_RULES.answerDelayMs)
  }
  private openAnswers() {
    if (!this.currentQ) return
    this.phase = 'question'
    this.answers.clear()
    this.answerStartAt = Date.now()
    const closesAt = this.answerStartAt + GAME_RULES.answerWindowMs
    this.broadcast({ type: 'answer_open', q: { id: this.currentQ.id, kind: this.currentQ.kind }, closesAt })
    setTimeout(() => this.reveal(), GAME_RULES.answerWindowMs)
  }
  private reveal() {
    if (!this.currentQ) return
    this.phase = 'reveal'
    const isLast = this.qIndex === GAME_RULES.questionsPerRound - 1
    const perPlayer: Array<{ id: string; correct: boolean; delta: number; score: number; ms?: number }> = []
    for (const p of this.players.values()) {
      const a = this.answers.get(p.id)
      if (!a) { perPlayer.push({ id: p.id, correct: false, delta: 0, score: p.score }) ; continue }
      const base = isLast ? GAME_RULES.lastQuestionBonus : GAME_RULES.normalPoints
      const mult = this.round === 3 ? GAME_RULES.round3Multiplier : 1
      const delta = a.correct ? base * mult : 0
      p.score += delta
      p.answers += 1
      // average only across answered questions (speed tie-breaker)
      p.avgMs = ((p.avgMs * (p.answers - 1)) + (a.ms || 0)) / p.answers
      perPlayer.push({ id: p.id, correct: !!a.correct, delta, score: p.score, ms: a.ms })
    }
    this.broadcast({ type: 'reveal', questionId: this.currentQ.id, correct: this.currentQ.correct, perPlayer })
    this.qIndex += 1
    // brief interlude with commentary hook point
    const nextAt = Date.now() + 2000
    this.broadcast({ type: 'inter', message: 'Nice one!', nextAt })
    setTimeout(() => this.nextQuestion(), 2000)
  }
}
