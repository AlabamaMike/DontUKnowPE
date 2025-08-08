import { useState } from 'react'

export function Join() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold">Join a Game</h2>
      <form className="mt-4 grid gap-3" onSubmit={(e) => { 
        e.preventDefault(); 
        const pid = crypto.randomUUID(); 
        sessionStorage.setItem('dukpe-player', JSON.stringify({ playerId: pid, name: name || undefined, avatar }));
        window.location.href = `/p/${code}/${pid}` 
      }}>
        <input className="px-3 py-2 bg-white/5 rounded border border-white/10" placeholder="Room Code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />
        <input className="px-3 py-2 bg-white/5 rounded border border-white/10" placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)} />
        <div className="grid gap-2">
          <div className="text-sm opacity-80">Avatar (optional)</div>
          <div className="flex items-center gap-3">
            {avatar ? <img src={avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-white/10" />}
            <input type="file" accept="image/*" onChange={async (e)=>{
              setUploadError(null);
              const file = e.target.files?.[0];
              if (!file) { setAvatar(null); return }
              if (file.size > 1024*1024*2) { setUploadError('Max 2MB'); return }
              const reader = new FileReader();
              reader.onload = () => setAvatar(reader.result as string)
              reader.readAsDataURL(file)
            }} />
          </div>
          {uploadError && <div className="text-rose-400 text-sm">{uploadError}</div>}
        </div>
        <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded">Join</button>
      </form>
    </div>
  )
}
