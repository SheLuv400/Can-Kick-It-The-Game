import { useEffect, useState } from 'react'
import { announcerEngine } from '../game/announcer'
import { audioEngine } from '../game/audio'
import {
  installGamepadControls,
  type GamepadConnectionState,
} from '../input/gamepad'
import {
  GAMEPAD_BINDINGS_EVENT,
  gamepadButtonLabel,
  loadGamepadBindings,
  type GamepadBindings,
} from '../input/gamepad-bindings'

const DISCONNECTED: GamepadConnectionState = {
  connected: false,
  index: null,
  id: null,
}

interface Hint {
  button: string
  action: string
}

function menuHints(bindings: GamepadBindings): Hint[] {
  return [
    { button: 'D-PAD', action: 'MOVE' },
    { button: gamepadButtonLabel(bindings.confirm), action: 'SELECT' },
    { button: gamepadButtonLabel(bindings.back), action: 'BACK' },
    { button: gamepadButtonLabel(bindings.pause), action: 'SETTINGS' },
  ]
}

function battleHints(bindings: GamepadBindings): Hint[] {
  return [
    { button: 'D-PAD', action: 'MOVE' },
    { button: gamepadButtonLabel(bindings.confirm), action: 'SELECT' },
    { button: gamepadButtonLabel(bindings.back), action: 'BACK' },
    { button: gamepadButtonLabel(bindings.inspect), action: 'INSPECT' },
    { button: gamepadButtonLabel(bindings.backstage), action: 'BACKSTAGE' },
    {
      button: `${gamepadButtonLabel(bindings['hand-prev'])}/${gamepadButtonLabel(bindings['hand-next'])}`,
      action: 'HAND',
    },
    {
      button: `${gamepadButtonLabel(bindings['area-prev'])}/${gamepadButtonLabel(bindings['area-next'])}`,
      action: 'AREA',
    },
    { button: gamepadButtonLabel(bindings.pause), action: 'PAUSE' },
  ]
}

function padLabel(connection: GamepadConnectionState): string {
  const number = connection.index === null ? '' : ` ${connection.index + 1}`
  if (connection.id && /xbox/i.test(connection.id)) return `XBOX PAD${number}`
  return `PAD${number}`
}

export function ControllerHUD() {
  const [connection, setConnection] = useState<GamepadConnectionState>(DISCONNECTED)
  const [visible, setVisible] = useState(false)
  const [inBattle, setInBattle] = useState(false)
  const [bindings, setBindings] = useState<GamepadBindings>(() => loadGamepadBindings())

  useEffect(() => {
    const sync = () => setBindings(loadGamepadBindings())
    window.addEventListener(GAMEPAD_BINDINGS_EVENT, sync)
    return () => window.removeEventListener(GAMEPAD_BINDINGS_EVENT, sync)
  }, [])

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
        // A gamepad press is not a trusted activation in most browsers. Only
        // attempt a fresh unlock when Edge reports a real user activation;
        // otherwise resume an engine that the start gate already authorized.
        const activation = (
          navigator as Navigator & {
            userActivation?: { isActive?: boolean }
          }
        ).userActivation
        if (activation?.isActive) {
          void audioEngine.unlock()
          announcerEngine.unlock()
        } else {
          audioEngine.resumeIfReady()
          announcerEngine.resumeIfReady()
        }
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

  const hints = inBattle ? battleHints(bindings) : menuHints(bindings)

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
        {padLabel(connection)}
      </span>
      <span className="controller-hud__hints">
        {hints.map((hint) => (
          <span key={`${hint.button}-${hint.action}`}>
            <b>{hint.button}</b> {hint.action}
          </span>
        ))}
      </span>
    </div>
  )
}
