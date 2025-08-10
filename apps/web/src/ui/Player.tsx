import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getApiBase, getWsBase, isAzureWps } from '../lib/config'

export function Player() {
  const params = useParams()
  const roomId = params.roomId!
  const stored = useMemo(()=> {
    try { return JSON.parse(sessionStorage.getItem('dukpe-player') || '{}') } catch { return {} }
  }, []) as { playerId?: string; name?: string; avatar?: string }
  const playerId = useMemo(()=> stored.playerId || crypto.randomUUID(), [stored])
  const [status, setStatus] = useState<'connecting'|'open'|'closed'>('connecting')
  const [phase, setPhase] = useState<string>('lobby')
  const [q, setQ] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const apiBase = getApiBase()

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
        if (msg.type === 'question') { setPhase('reveal'); setQ(msg.q) }
        if (msg.type === 'answer_open') { setPhase('answer'); setQ(msg.q) }
        if (msg.type === 'reveal') { setPhase('reveal') }
      }catch{}
      }
    })()
    return ()=> wsRef.current?.close()
  },[roomId, playerId])

  const answer = (payload: any) => {
    if (!wsRef.current || !q) return
    wsRef.current.send(JSON.stringify({ type: 'answer', playerId, questionId: q.id, payload, at: Date.now() }))
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Player Screen</h2>
  {stored?.avatar && <img src={stored.avatar} alt="avatar" className="w-16 h-16 rounded-full mt-2" />}
  {stored?.name && <div className="mt-1 text-lg">{stored.name}</div>}
      <div className="text-sm opacity-70">WS: {status} | Phase: {phase}</div>
      {phase === 'lobby' && <p className="opacity-80">Waiting for the host to start…</p>}
      {phase !== 'lobby' && q && (
        <div className="mt-4">
          <div className="text-xl mb-2">{q.id}: {q.kind}</div>
          {/* demo: for tf, buttons; for mc/numeric, we’ll expand later */}
          {q.kind === 'tf' && (
            <div className="grid grid-cols-2 gap-2">
              <button className="px-4 py-3 bg-emerald-600 rounded" onClick={()=>answer(true)}>True</button>
              <button className="px-4 py-3 bg-rose-600 rounded" onClick={()=>answer(false)}>False</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
