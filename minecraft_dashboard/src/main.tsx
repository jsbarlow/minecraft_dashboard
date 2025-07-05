import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootDiv = document.getElementById('root');
if (!rootDiv) {
  throw new Error("React Container not found")
}
createRoot(rootDiv).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
