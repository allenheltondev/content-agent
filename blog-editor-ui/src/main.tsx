import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Initialize Amplify configuration as early as possible
import './config/amplify'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
