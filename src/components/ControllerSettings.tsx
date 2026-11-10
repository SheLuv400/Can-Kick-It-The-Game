import { useEffect, useState } from 'react'
import { isXboxEdge } from '../game/graphics'
import { captureNextGamepadButton, isGamepadApiAvailable } from '../input/gamepad'
import {
  DEFAULT_GAMEPAD_BINDINGS,
  GAMEPAD_ACTION_META,
  GAMEPAD_BINDINGS_EVENT,
  gamepadButtonLabel,
  gamepadButtonName,
  loadGamepadBindings,
  saveGamepadBindings,
  swapGamepadBinding,
  type GamepadAction,
  type GamepadBindings,
} from '../input/gamepad-bindings'
import { GameIcon } from './GameIcon'

function connectedPadCount(): number {
  if (!isGamepadApiAvailable()) return 0
  try {
    return Array.from(navigator.getGamepads()).filter((pad) => Boolean(pad?.connected))
      .length
  } catch {
    return 0
  }
}

export function ControllerSettings() {
  const [bindings, setBindings] = useState<GamepadBindings>(() =>
    loadGamepadBindings(),
  )
  const [capturing, setCapturing] = useState<GamepadAction | null>(null)
  const [padCount, setPadCount] = useState(connectedPadCount)
  const [status, setStatus] = useState('')
  const apiAvailable = isGamepadApiAvailable()
  const xboxEdge = isXboxEdge()

  useEffect(() => {
    const sync = () => setBindings(loadGamepadBindings())
    window.addEventListener(GAMEPAD_BINDINGS_EVENT, sync)
    return () => window.removeEventListener(GAMEPAD_BINDINGS_EVENT, sync)
  }, [])

  useEffect(() => {
    if (!apiAvailable) return
    const sync = () => setPadCount(connectedPadCount())
    const connected = () => sync()
    window.addEventListener('gamepadconnected', connected)
    window.addEventListener('gamepaddisconnected', connected)
    const poll = window.setInterval(sync, 2200)
    return () => {
      window.clearInterval(poll)
      window.removeEventListener('gamepadconnected', connected)
      window.removeEventListener('gamepaddisconnected', connected)
    }
  }, [apiAvailable])

  useEffect(() => {
    if (!capturing) return
    const meta = GAMEPAD_ACTION_META.find((item) => item.id === capturing)
    setStatus(`PRESS A CONTROLLER BUTTON FOR ${meta?.label ?? capturing.toUpperCase()}`)
    return captureNextGamepadButton((button) => {
      const next = saveGamepadBindings(
        swapGamepadBinding(loadGamepadBindings(), capturing, button),
      )
      setBindings(next)
      setStatus(`${gamepadButtonName(button)} IS NOW ${meta?.label ?? capturing.toUpperCase()}`)
      setCapturing(null)
    })
  }, [capturing])

  const resetBindings = () => {
    setCapturing(null)
    setBindings(saveGamepadBindings(DEFAULT_GAMEPAD_BINDINGS))
    setStatus('STANDARD XBOX / PLAYSTATION BINDINGS RESTORED')
  }

  return (
    <section className="settings-block settings-block--controller">
      <div className="settings-block__head">
        <span className="settings-block__icon">
          <GameIcon name="settings" />
        </span>
        <div>
          <h3>CONTROLLER / XBOX</h3>
          <p>
            Xbox, PlayStation and standard PC pads use the Gamepad API. Every
            controller action invokes the same validated game action as mouse,
            touch and keyboard.
          </p>
        </div>
      </div>

      <div className="settings-controller">
        <div className="settings-controller__status" role="status">
          <span className="settings-controller__dot" aria-hidden="true" />
          <div>
            <b>
              {apiAvailable
                ? padCount > 0
                  ? `${padCount} CONTROLLER${padCount === 1 ? '' : 'S'} DETECTED`
                  : 'GAMEPAD API READY · NO CONTROLLER YET'
                : 'GAMEPAD API UNAVAILABLE'}
            </b>
            <em>
              {apiAvailable
                ? padCount > 0
                  ? 'Press a button or move a stick to wake controller focus.'
                  : 'Connect a pad and press a button. Edge may require one press before it exposes input.'
                : 'This browser does not expose navigator.getGamepads(). Keyboard and mouse remain fully usable; no controller-only action is required.'}
            </em>
          </div>
        </div>

        {xboxEdge && (
          <p className="settings-controller__note">
            XBOX EDGE DETECTED. Controller support still depends on Edge
            delivering gamepad input to this page. If the pad stays invisible,
            use keyboard or mouse. The Xbox guide button remains reserved and
            cannot be remapped.
          </p>
        )}

        <div className="settings-controller__guide" aria-label="Controller guide">
          {GAMEPAD_ACTION_META.map((action) => (
            <div className="settings-controller__row" key={action.id}>
              <div>
                <b>{action.label}</b>
                <em>{action.detail}</em>
              </div>
              <button
                className={`settings-controller__key ${
                  capturing === action.id ? 'is-capturing' : ''
                }`}
                onClick={() => setCapturing(capturing === action.id ? null : action.id)}
                disabled={!apiAvailable}
                aria-label={`Remap ${action.label}, currently ${gamepadButtonName(bindings[action.id])}`}
              >
                {capturing === action.id
                  ? 'PRESS…'
                  : gamepadButtonLabel(bindings[action.id])}
              </button>
            </div>
          ))}
        </div>

        <div className="settings-controller__actions">
          <button
            className="btn btn--ghost btn--sm"
            onClick={resetBindings}
            disabled={!apiAvailable}
          >
            RESTORE STANDARD BINDINGS
          </button>
          {capturing && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCapturing(null)
                setStatus('REMAP CANCELLED')
              }}
            >
              CANCEL REMAP
            </button>
          )}
          {status && <span role="status">{status}</span>}
        </div>

        <p className="settings-controller__foot">
          In battle: D-pad or left stick moves focus, A selects, B backs out, X
          inspects the focused card, Y opens Backstage, LB/RB cycles hand cards,
          LT/RT cycles Stage, Crate, Backstage and the opposing stage, and
          Menu/Start pauses when Edge delivers it. TV mode is under Graphics &
          Display.
        </p>
      </div>
    </section>
  )
}
