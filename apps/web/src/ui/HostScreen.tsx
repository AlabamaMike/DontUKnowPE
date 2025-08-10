import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { getApiBase, getWsBase, isAzureWps } from '../lib/config'
import { CountdownBar } from './CountdownBar'

export function HostScreen() {
  const [code, setCode] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [players, setPlayers] = useState<Array<{id:string; name:string; score:number; avatar?: string}>>([])
  const [wsStatus, setWsStatus] = useState<'closed'|'open'|'connecting'>('closed')
  const wsRef = useRef<WebSocket | null>(null)
  const [attachCode, setAttachCode] = useState('')
  const apiBase = getApiBase()
  const [phase, setPhase] = useState<'lobby'|'question_preview'|'answer'|'reveal'|'inter'|'leaderboard'|'ended'>('lobby')
  const [q, setQ] = useState<any>(null)
  const [reveal, setReveal] = useState<{questionId?:string; correct?:any; perPlayer?:Array<{id:string; delta:number; score:number; correct:boolean; ms?:number}>}|null>(null)
  const [leaders, setLeaders] = useState<Array<{id:string; name:string; score:number; avgMs:number}>>([])
  const [until, setUntil] = useState<number | null>(null)
  const [round, setRound] = useState<number>(1)
  const [qIndex, setQIndex] = useState<number>(0)
  const [, forceTick] = useState(0)
  const [progress, setProgress] = useState<{count:number; total:number} | null>(null)
  useEffect(()=>{
    const t = setInterval(()=> forceTick(n=>n+1), 1000)
    return ()=> clearInterval(t)
  },[])

  const createRoom = async () => {
    setError(null)
    try {
  const res = await fetch(`${apiBase}/rooms`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { code: string }
      setCode(data.code)
      const joinUrl = `${location.origin}/join/${data.code}`
      setQr(await QRCode.toDataURL(joinUrl))
      openWsForCode(data.code)
    } catch (e: any) {
      setError(String(e.message || e))
    }
  }

  const openWsForCode = async (roomCode: string) => {
    let url = `${getWsBase()}/rooms/${roomCode}/ws`
    if (isAzureWps()) {
      const negotiate = await fetch(`${apiBase}/negotiate?userid=host-${roomCode}`, { method: 'POST' })
      const conn = await negotiate.json()
      url = conn.url
    }
    const ws = new WebSocket(url)
    wsRef.current = ws
    setWsStatus('connecting')
    ws.onopen = () => {
      setWsStatus('open')
      ws.send(JSON.stringify({ type: 'hello', role: 'host', room: roomCode }))
    }
    ws.onclose = () => setWsStatus('closed')
    ws.onerror = () => setWsStatus('closed')
    ws.onmessage = (ev) => {
      try{
        const msg = JSON.parse(ev.data)
        if (msg.type === 'lobby') { setPlayers(msg.players); setPhase('lobby') }
  if (msg.type === 'question') { setPhase('question_preview'); setQ(msg.q); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round); if(typeof msg.qIndex==='number') setQIndex(msg.qIndex) }
  if (msg.type === 'answer_open') { setPhase('answer'); setQ(msg.q); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round); if(typeof msg.qIndex==='number') setQIndex(msg.qIndex) }
  if (msg.type === 'reveal') { setPhase('reveal'); setReveal({ questionId: msg.questionId, correct: msg.correct, perPlayer: msg.perPlayer }); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round); if(typeof msg.qIndex==='number') setQIndex(msg.qIndex) }
  if (msg.type === 'inter') { setPhase('inter'); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round); if(typeof msg.qIndex==='number') setQIndex(msg.qIndex) }
  if (msg.type === 'leaderboard') { setPhase('leaderboard'); setLeaders(msg.players || []); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round) }
  if (msg.type === 'between_rounds') { setPhase('inter'); setUntil(msg.until || null); if(typeof msg.round==='number') setRound(msg.round) }
  if (msg.type === 'answer_progress') { setProgress({ count: msg.count||0, total: msg.total||0 }) }
  if (msg.type === 'ended') { setPhase('ended') }
      }catch{}
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">Host Screen</h2>
        {!code ? (
          <div className="grid gap-3">
            <button onClick={createRoom} className="px-6 py-3 rounded bg-sky-600 hover:bg-sky-500">Create Room</button>
            <div className="text-sm opacity-80 mt-2">Or attach to an existing code</div>
            <form className="grid gap-2" onSubmit={(e)=>{ e.preventDefault(); setCode(attachCode.toUpperCase()); setQr(null); openWsForCode(attachCode.toUpperCase()) }}>
              <input value={attachCode} onChange={e=>setAttachCode(e.target.value)} placeholder="Room Code" className="px-3 py-2 bg-white/5 rounded border border-white/10" />
              <button className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500">Attach</button>
            </form>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="text-2xl">Room Code: <span className="font-mono">{code}</span></div>
            {qr && <img alt="QR to join" className="mx-auto bg-white p-2 rounded" src={qr} />}
            <p className="opacity-80">Scan to join on your phone.</p>
            <div className="mt-4 text-left max-w-sm mx-auto">
              <div className="text-sm opacity-70">WS: {wsStatus}</div>
              {phase === 'lobby' && (
                <>
                  <div className="mt-2">Players:</div>
                  <ul className="text-left text-sm bg-white/5 rounded p-2">
                    {players.map(p=> (
                      <li key={p.id} className="flex items-center gap-2 py-1">
                        {p.avatar ? <img src={p.avatar} alt="av" className="w-6 h-6 rounded-full"/> : <div className="w-6 h-6 rounded-full bg-white/10"/>}
                        <span className="flex-1">{p.name}</span>
                        <span className="opacity-70">{p.score}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
        {phase === 'question_preview' && q && (
                <div className="mt-3 p-3 bg-white/5 rounded">
          <div className="text-sm opacity-70">Round {round} · Q{qIndex+1} · Get ready… {until ? `(${Math.max(0, Math.ceil((until - Date.now())/1000))}s)` : ''}</div>
          <CountdownBar phase="question_preview" until={until || undefined} />
                  <div className="text-lg">{q.text}</div>
                </div>
              )}
              {phase === 'answer' && q && (
                <div className="mt-3 p-3 bg-white/5 rounded">
          <div className="text-sm opacity-70">Round {round} · Q{qIndex+1} · Answering… {until ? `(${Math.max(0, Math.ceil((until - Date.now())/1000))}s)` : ''}</div>
          <CountdownBar phase="answer" until={until || undefined} />
                  <div className="text-lg">{q.text}</div>
                  {progress && <div className="mt-2 text-sm opacity-80">Answers: {progress.count}/{progress.total}</div>}
                  {q.kind === 'mc' && Array.isArray(q.options) && (
                    <ul className="mt-2 text-sm grid gap-1">
                      {q.options.map((opt:string, idx:number)=> (<li key={idx} className="px-2 py-1 bg-black/20 rounded">{idx}. {opt}</li>))}
                    </ul>
                  )}
                </div>
              )}
              {phase === 'reveal' && reveal && (
                <div className="mt-3 p-3 bg-white/5 rounded">
                  <div className="text-lg">Answer: <span className="font-mono">{q?.kind==='mc' && Array.isArray(q?.options) && typeof reveal.correct==='number' ? `${reveal.correct}. ${q?.options?.[Number(reveal.correct)]}` : String(reveal.correct)}</span></div>
                  <CountdownBar phase="reveal" until={until || undefined} />
                  <ul className="mt-2 text-sm grid gap-1">
                    {reveal.perPlayer?.map(p => (
                      <li key={p.id} className="flex justify-between px-2 py-1 bg-black/20 rounded">
                        <span>{players.find(x=>x.id===p.id)?.name || p.id}</span>
                        <span className={p.correct? 'text-emerald-400':'text-rose-400'}>{p.correct? `+${p.delta}`:'0'} → {p.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {phase === 'leaderboard' && (
                <div className="mt-3 p-3 bg-white/5 rounded">
                  <div className="text-lg mb-2">Leaderboard {until ? <span className="text-sm opacity-70">(next in {Math.max(0, Math.ceil((until - Date.now())/1000))}s)</span> : null}</div>
                  <CountdownBar phase="leaderboard" until={until || undefined} />
                  <ul className="text-sm grid gap-1">
                    {leaders.map((p,i)=> (
                      <li key={p.id} className={`flex justify-between px-2 py-1 rounded ${i<3? 'bg-amber-500/20':'bg-black/20'}`}><span>{i+1}. {p.name}</span><span>{p.score}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {phase === 'ended' && (
                <div className="mt-3 p-3 bg-white/5 rounded">
                  <div className="text-lg">Game Over</div>
                </div>
              )}
              <button disabled={players.length < 2 || phase !== 'lobby'} onClick={async ()=> {
                if (!code) return
                if (isAzureWps()) {
                  await fetch(`${apiBase}/rooms/${code}/start`, { method: 'POST' })
                } else {
                  wsRef.current?.send(JSON.stringify({ type: 'start' }))
                }
              }} className={`mt-3 px-4 py-2 rounded ${(players.length<2||phase!=='lobby')? 'bg-emerald-900 cursor-not-allowed':'bg-emerald-600 hover:bg-emerald-500'}`}>Start Game</button>
            </div>
          </div>
        )}
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    </div>
  )
}
