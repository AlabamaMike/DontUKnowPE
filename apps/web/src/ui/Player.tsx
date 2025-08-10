import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getApiBase, getWsBase, isAzureWps } from '../lib/config'
import { CountdownBar } from './CountdownBar'

export function Player() {
  const params = useParams()
  const roomId = params.roomId!
  const stored = useMemo(()=> {
    try { return JSON.parse(sessionStorage.getItem('dukpe-player') || '{}') } catch { return {} }
  }, []) as { playerId?: string; name?: string; avatar?: string }
  const playerId = useMemo(()=> stored.playerId || crypto.randomUUID(), [stored])
  const [status, setStatus] = useState<'connecting'|'open'|'closed'>('connecting')
  const [phase, setPhase] = useState<'lobby'|'question_preview'|'answer'|'reveal'|'inter'|'leaderboard'|'ended'>('lobby')
  const [q, setQ] = useState<any>(null)
  const [numInput, setNumInput] = useState('')
  const [answered, setAnswered] = useState(false)
  const [myReveal, setMyReveal] = useState<{correct?: boolean; delta?: number; score?: number; ms?: number} | null>(null)
  const [leaders, setLeaders] = useState<Array<{id:string; name:string; score:number; avgMs:number}>>([])
  const [until, setUntil] = useState<number | null>(null)
  const [round, setRound] = useState<number>(1)
  const [qIndex, setQIndex] = useState<number>(0)
  const [, forceTick] = useState(0)
  useEffect(()=>{ const t = setInterval(()=> forceTick(n=>n+1), 1000); return ()=> clearInterval(t) }, [])
  const wsRef = useRef<WebSocket | null>(null)
  const apiBase = getApiBase()

  const revealCorrectLabel = (opts: string[] = [], idx: number) => {
    if (typeof idx !== 'number') return ''
    if (!Array.isArray(opts) || idx < 0 || idx >= opts.length) return String(idx)
    return `${idx}. ${opts[idx]}`
  }

  useEffect(()=>{
    (async () => {
      let url = `${getWsBase()}/rooms/${roomId}/ws`
      if (isAzureWps()) {
        const negotiate = await fetch(`${apiBase}/negotiate?userid=${playerId}`, { method: 'POST' })
        const conn = await negotiate.json()
        url = conn.url
      }
      const ws = new WebSocket(url)
      wsRef.current = ws
      ws.onopen = () => { setStatus('open'); ws.send(JSON.stringify({ type: 'hello', role: 'player', room: roomId, playerId, name: stored.name, avatar: stored.avatar })) }
      ws.onclose = () => setStatus('closed')
      ws.onerror = () => setStatus('closed')
      ws.onmessage = (ev) => {
      try{
        const msg = JSON.parse(ev.data)
        if (msg.type === 'lobby') { setPhase('lobby'); setQ(null); setAnswered(false); setMyReveal(null); setUntil(null) }
  if (msg.type === 'question') { setPhase('question_preview'); setQ(msg.q); setAnswered(false); setMyReveal(null); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round); if(typeof msg.qIndex==='number') setQIndex(msg.qIndex) }
  if (msg.type === 'answer_open') { setPhase('answer'); setQ(msg.q); setAnswered(false); setMyReveal(null); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round); if(typeof msg.qIndex==='number') setQIndex(msg.qIndex) }
        if (msg.type === 'reveal') {
          setPhase('reveal')
          const mine = Array.isArray(msg.perPlayer) ? msg.perPlayer.find((p:any)=> p.id === playerId) : null
          if (mine) setMyReveal({ correct: !!mine.correct, delta: mine.delta, score: mine.score, ms: mine.ms })
          setUntil(msg.until || null)
          if(typeof msg.round==='number') setRound(msg.round); if(typeof msg.qIndex==='number') setQIndex(msg.qIndex)
        }
        if (msg.type === 'inter') { setPhase('inter'); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round); if(typeof msg.qIndex==='number') setQIndex(msg.qIndex) }
        if (msg.type === 'leaderboard') { setPhase('leaderboard'); setLeaders(msg.players || []); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round) }
        if (msg.type === 'ended') { setPhase('ended') }
      }catch{}
      }
    })()
    return ()=> wsRef.current?.close()
  },[roomId, playerId])

  const answer = (payload: any) => {
    if (!wsRef.current || !q || phase !== 'answer' || answered) return
    wsRef.current.send(JSON.stringify({ type: 'answer', room: roomId, playerId, questionId: q.id, payload, at: Date.now() }))
    setAnswered(true)
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Player Screen</h2>
  {stored?.avatar && <img src={stored.avatar} alt="avatar" className="w-16 h-16 rounded-full mt-2" />}
  {stored?.name && <div className="mt-1 text-lg">{stored.name}</div>}
      <div className="text-sm opacity-70">WS: {status} | Phase: {phase}</div>
      {phase === 'lobby' && <p className="opacity-80">Waiting for the host to start…</p>}
    {phase === 'question_preview' && q && (
        <div className="mt-4">
      <div className="text-sm opacity-70">Round {round} · Q{qIndex+1} · Get ready… {until ? `(${Math.max(0, Math.ceil((until - Date.now())/1000))}s)` : ''}</div>
      <CountdownBar phase="question_preview" until={until || undefined} />
          <div className="text-xl mb-2">{q.text}</div>
          {q.kind === 'mc' && Array.isArray(q.options) && (
            <ul className="mt-2 text-sm grid gap-1">
              {q.options.map((opt:string, idx:number)=> (<li key={idx} className="px-2 py-1 bg-black/20 rounded">{idx}. {opt}</li>))}
            </ul>
          )}
        </div>
      )}
    {phase === 'answer' && q && (
        <div className="mt-4">
      <div className="text-sm opacity-70">Round {round} · Q{qIndex+1} · Answer now {until ? `(${Math.max(0, Math.ceil((until - Date.now())/1000))}s)` : ''}</div>
      <CountdownBar phase="answer" until={until || undefined} />
          <div className="text-xl mb-2">{q.text}</div>
          {q.kind === 'tf' && (
            <div className="grid grid-cols-2 gap-2">
              <button disabled={answered} className={`px-4 py-3 rounded ${answered? 'bg-emerald-900':'bg-emerald-600'}`} onClick={()=>answer(true)}>True</button>
              <button disabled={answered} className={`px-4 py-3 rounded ${answered? 'bg-rose-900':'bg-rose-600'}`} onClick={()=>answer(false)}>False</button>
            </div>
          )}
          {q.kind === 'mc' && Array.isArray(q.options) && (
            <div className="grid gap-2">
              {q.options.map((opt:string, idx:number)=>(
                <button key={idx} disabled={answered} className={`px-4 py-3 rounded ${answered? 'bg-indigo-900':'bg-indigo-600'}`} onClick={()=>answer(idx)}>{opt}</button>
              ))}
            </div>
          )}
          {q.kind === 'num' && (
            <form className="grid gap-2" onSubmit={(e)=>{ e.preventDefault(); if(!answered){ answer(Number(numInput)); setNumInput('') } }}>
              <input value={numInput} onChange={e=>setNumInput(e.target.value)} className="px-3 py-2 bg-white/10 rounded" placeholder="Enter number" disabled={answered} />
              <button className={`px-4 py-2 rounded ${answered? 'bg-sky-900':'bg-sky-600'}`} type="submit" disabled={answered}>Submit</button>
            </form>
          )}
          {answered && <div className="mt-2 text-sm opacity-80">Answer received. Waiting for reveal…</div>}
        </div>
      )}
      {phase === 'reveal' && (
        <div className="mt-4">
          <div className="text-xl mb-1">Reveal</div>
          {q?.kind==='mc' && Array.isArray(q?.options) && typeof (myReveal as any)?.correct==='number' && (
            <div className="text-sm opacity-80">Correct: {(revealCorrectLabel(q.options, (myReveal as any)?.correct))}</div>
          )}
          {myReveal ? (
            <div className="text-lg">
              <span className={myReveal.correct ? 'text-emerald-400' : 'text-rose-400'}>
                {myReveal.correct ? 'Correct' : 'Incorrect'}
              </span>
              {typeof myReveal.delta === 'number' && <span> (+{myReveal.delta})</span>} {typeof myReveal.score === 'number' && <span> → {myReveal.score}</span>}
            </div>
          ) : (
            <div className="opacity-80">No answer recorded.</div>
          )}
          <CountdownBar phase="reveal" until={until || undefined} />
        </div>
      )}
      {phase === 'inter' && (
        <div className="mt-4 opacity-80">Next question starting soon…</div>
      )}
      {phase === 'leaderboard' && (
        <div className="mt-4">
          <div className="text-xl mb-2">Leaderboard {until ? <span className="text-sm opacity-70">(next in {Math.max(0, Math.ceil((until - Date.now())/1000))}s)</span> : null}</div>
          <CountdownBar phase="leaderboard" until={until || undefined} />
          <ul className="text-sm grid gap-1">
            {leaders.map((p,i)=> (
              <li key={p.id} className={`flex justify-between px-2 py-1 rounded ${i<3? 'bg-amber-500/20':'bg-black/20'} ${p.id===playerId? 'ring-1 ring-white/40':''}`}><span>{i+1}. {p.name}</span><span>{p.score}</span></li>
            ))}
          </ul>
        </div>
      )}
      {phase === 'ended' && (
        <div className="mt-6 text-xl">Game Over</div>
      )}
    </div>
  )
}
