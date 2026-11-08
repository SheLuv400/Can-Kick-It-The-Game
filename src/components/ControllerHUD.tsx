import { useEffect, useState } from 'react'
import { announcerEngine } from '../game/announcer'
import { audioEngine } from '../game/audio'
import {
  installGamepadControls,
  type GamepadConnectionState,
} from '../input/gamepad'

const DISCONNECTED: GamepadConnectionState = {
  connected: false,
  index: null,
  id: null,
}

interface Hint {
  button: string
  action: string
}

const MENU_HINTS: Hint[] = [
  { button: 'D-PAD', action: 'MOVE' },
  { button: 'A', action: 'SELECT' },
  { button: 'B', action: 'BACK' },
  { button: 'START', action: 'SETTINGS' },
]

const BATTLE_HINTS: Hint[] = [
  { button: 'D-PAD', action: 'MOVE' },
  { button: 'A', action: 'SELECT' },
  { button: 'B', action: 'BACK' },
  { button: 'X', action: 'END TURN' },
  { button: 'Y', action: 'NEXT READY' },
  { button: 'LB/RB', action: 'TARGET' },
  { button: 'START', action: 'PAUSE' },
]

export function ControllerHUD() {
  const [connection, setConnection] = useState<GamepadConnectionState>(DISCONNECTED)
  const [visible, setVisible] = useState(false)
  const [inBattle, setInBattle] = useState(false)

  useEffect(() => {
    let hideTimer: number | undefined

    const reveal = (duration = 4200) => {
      window.clearTimeout(hideTimer)
      setVisible(true)
      hideTimer = window.setTimeout(() => setVisible(false), duration)
    }

    const syncBattle = () => {
      setInBattle(Boolean(document.querySelector('.battle')))
    }

    const dispose = installGamepadControls({
      onConnectionChange: (next) => {
        setConnection(next)
        syncBattle()
        if (next.connected) reveal(6000)
        else {
          window.clearTimeout(hideTimer)
          setVisible(false)
        }
      },
      onInput: () => {
        audioEngine.unlock()
        announcerEngine.unlock()
        syncBattle()
        reveal()
      },
    })

    const hide = (event: Event) => {
      if (event instanceof KeyboardEvent && !event.isTrusted) return
      window.clearTimeout(hideTimer)
      setVisible(false)
    }
    window.addEventListener('pointerdown', hide)
    window.addEventListener('keydown', hide)

    return () => {
      dispose()
      window.clearTimeout(hideTimer)
      window.removeEventListener('pointerdown', hide)
      window.removeEventListener('keydown', hide)
    }
  }, [])

  if (!connection.connected) return null

  const hints = inBattle ? BATTLE_HINTS : MENU_HINTS

  return (
    <div
      className={`controller-hud ${visible ? 'is-visible' : ''} ${
        inBattle ? 'controller-hud--battle' : ''
      }`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="controller-hud__status">
        <i aria-hidden="true" />
        PAD {connection.index === null ? '' : connection.index + 1}
      </span>
      <span className="controller-hud__hints">
        {hints.map((hint) => (
          <span key={hint.button}>
            <b>{hint.button}</b> {hint.action}
          </span>
        ))}
      </span>
    </div>
  )
}
