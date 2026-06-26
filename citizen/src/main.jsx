import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initBridge } from './lib/lemma-bridge.js'

// Boot the Lemma bridge (loads SDK, authenticates, patches fetch) before render —
// every page's fetch('http://localhost:8000/...') is then served from the Lemma pod.
initBridge().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
