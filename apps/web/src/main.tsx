import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { App } from './ui/App'
import { HostScreen } from './ui/HostScreen'
import { Join } from './ui/Join'
import { Player } from './ui/Player'
import { Author } from './ui/Author'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/host', element: <HostScreen /> },
  { path: '/join/:roomCode?', element: <Join /> },
  { path: '/p/:roomId/:playerId', element: <Player /> },
  { path: '/author', element: <Author /> },
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
