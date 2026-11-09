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
import './styles/audio.css'
import './styles/combat.css'
import './styles/team.css'
import './styles/builder.css'
import './styles/track.css'
import './styles/charts.css'
import './styles/label.css'
import './styles/ux-overhaul.css'
import './styles/tutorial.css'
import './styles/tutorial-soundcheck.css'
import './styles/mode-arena.css'
import './styles/menu-arena.css'
import './styles/circuit.css'
import './styles/announcer.css'
import './styles/mobile.css'
import './styles/online.css'
import './styles/chat.css'
import './styles/house-rules.css'
import './styles/social.css'
import './styles/profile-art.css'
import './styles/updates.css'
import './styles/controller.css'
import './styles/badges.css'
import './styles/loadout.css'
import './styles/festival.css'
import './styles/career.css'
import './styles/career-models.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AccountProvider } from './account/AccountProvider'
import { SocialProvider } from './account/SocialProvider'
import { applyArtFit, readArtFit } from './game/art-fit'
import { ControllerHUD } from './components/ControllerHUD'

applyArtFit(readArtFit())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountProvider>
      <SocialProvider>
        <App />
        <ControllerHUD />
      </SocialProvider>
    </AccountProvider>
  </StrictMode>,
)
