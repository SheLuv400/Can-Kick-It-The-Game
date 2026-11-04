import '@fontsource/anton/latin-400.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/latin-900.css'
import '@fontsource/playfair-display/latin-700-italic.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/syncopate/latin-400.css'
import '@fontsource/syncopate/latin-700.css'
import './styles/base.css'
import './styles/themes.css'
import './styles/card.css'
import './styles/menu.css'
import './styles/screens.css'
import './styles/battle.css'
import './styles/combat.css'
import './styles/team.css'
import './styles/builder.css'
import './styles/track.css'
import './styles/charts.css'
import './styles/label.css'
import './styles/ux-overhaul.css'
import './styles/tutorial.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyArtFit, readArtFit } from './game/art-fit'

applyArtFit(readArtFit())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
