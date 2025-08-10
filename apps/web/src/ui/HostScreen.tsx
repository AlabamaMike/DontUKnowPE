import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { getApiBase, getWsBase, isAzureWps } from '../lib/config'

export function HostScreen() {
  const [code, setCode] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [players, setPlayers] = useState<Array<{id:string; name:string; score:number; avatar?: string}>>([])
  const [wsStatus, setWsStatus] = useState<'closed'|'open'|'connecting'>('closed')
  const wsRef = useRef<WebSocket | null>(null)
  const [attachCode, setAttachCode] = useState('')
  const apiBase = getApiBase()

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
        if (msg.type === 'lobby') setPlayers(msg.players)
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
              <button disabled={players.length < 2} onClick={async ()=> {
                if (!code) return
                if (isAzureWps()) {
                  await fetch(`${apiBase}/rooms/${code}/start`, { method: 'POST' })
                } else {
                  wsRef.current?.send(JSON.stringify({ type: 'start' }))
                }
              }} className={`mt-3 px-4 py-2 rounded ${players.length<2? 'bg-emerald-900 cursor-not-allowed':'bg-emerald-600 hover:bg-emerald-500'}`}>Start Game</button>
            </div>
          </div>
        )}
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    </div>
  )
}
