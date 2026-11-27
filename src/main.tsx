import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/space-grotesk'
import { App } from './app/App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
