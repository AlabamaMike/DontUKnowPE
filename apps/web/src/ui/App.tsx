import { Link } from 'react-router-dom'

export function App() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Don't U Know PE</h1>
      <div className="mt-4 grid gap-3">
        <Link to="/host" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded">Host Screen</Link>
        <Link to="/join" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded">Join Game</Link>
        <Link to="/author" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded">Author Questions</Link>
      </div>
    </div>
  )
}
