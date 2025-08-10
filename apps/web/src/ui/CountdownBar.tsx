import { useEffect, useMemo, useState } from 'react'
import { DURATIONS } from '../lib/rules'

export function CountdownBar({ until, phase }: { until?: number | null; phase: 'answer'|'reveal'|'inter'|'leaderboard'|'question_preview' }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(()=>{ const t = setInterval(()=> setNow(Date.now()), 200); return ()=> clearInterval(t) }, [])
  if (!until) return null
  const msLeft = Math.max(0, until - now)
  const total = phase === 'answer' ? DURATIONS.answerWindowMs : phase === 'reveal' ? DURATIONS.revealMs : phase === 'inter' ? DURATIONS.interMs : phase === 'leaderboard' ? DURATIONS.betweenMs : DURATIONS.revealMs
  const pct = Math.max(0, Math.min(100, (msLeft / total) * 100))
  return (
    <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
      <div className="h-full bg-emerald-500" style={{ width: pct + '%' }} />
    </div>
  )
}
