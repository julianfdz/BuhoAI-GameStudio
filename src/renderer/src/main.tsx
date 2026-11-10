import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { aplicarTema } from './lib/temas'

// El último estilo, antes de pintar nada (así no se ve un parpadeo de otro color al arrancar)
let tema: string | undefined
try {
  tema = localStorage.getItem('estudio:tema') ?? undefined
} catch {
  /* nada */
}
aplicarTema(tema)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
