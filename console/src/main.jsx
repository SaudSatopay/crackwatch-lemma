import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initBridge } from './lib/lemma-bridge.js'

// Boot the Lemma bridge (loads SDK, authenticates, patches fetch) before render.
initBridge().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
