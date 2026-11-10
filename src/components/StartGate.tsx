import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { announcerEngine } from '../game/announcer'
import { audioEngine } from '../game/audio'

interface StartGateProps {
  onEnter: () => void
}

const UNLOCK_TIMEOUT_MS = 2200

/**
 * One trusted activation starts the room. Pointer and keyboard clicks are
 * handled here; a controller-driven DOM click is untrusted, so the gamepad
 * layer attempts an unlock only when Edge reports a real user activation.
 */
export function StartGate({ onEnter }: StartGateProps) {
  const [busy, setBusy] = useState(false)
  const started = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  const enter = async () => {
    if (started.current) return
    started.current = true
    setBusy(true)
    announcerEngine.unlock()
    const timeout = new Promise<boolean>((resolve) => {
      window.setTimeout(() => resolve(false), UNLOCK_TIMEOUT_MS)
    })
    await Promise.race([audioEngine.unlock(), timeout])
    onEnter()
  }

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!event.nativeEvent.isTrusted) {
      // Microsoft Edge may treat a controller press as activation. The HUD
      // has already attempted unlock when navigator.userActivation reports it;
      // never fake a trusted DOM gesture here.
      onEnter()
      return
    }
    void enter()
  }

  return (
    <div
      className="start-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-gate-title"
      aria-describedby="start-gate-copy"
    >
      <div className="start-gate__panel">
        <span className="start-gate__kicker">CIKI PRESENTS · THE MIDNIGHT GARDEN</span>
        <h1 id="start-gate-title">
          CAN I KICK IT
          <span>– THE GAME</span>
        </h1>
        <p id="start-gate-copy" className="start-gate__copy">
          The room is set. One trusted press starts the score, DJ KICKIT and the
          full sound system.
        </p>
        <button
          ref={buttonRef}
          type="button"
          className="start-gate__enter"
          onClick={handleClick}
          data-gamepad-primary
          aria-busy={busy}
        >
          <span>{busy ? 'STARTING THE ROOM…' : 'PRESS START TO ENTER'}</span>
          <i aria-hidden="true">{busy ? '◌' : '▶'}</i>
        </button>
        <p className="start-gate__hint">
          CLICK, TAP, PRESS ENTER OR USE A CONTROLLER. IF THE BROWSER BLOCKS
          AUDIO, THE GAME WILL SHOW A ONE-CLICK ENABLE CONTROL.
        </p>
        <div className="start-gate__meta" aria-hidden="true">
          <span>26 ARTISTS</span>
          <i />
          <span>03 CIRCUITS</span>
          <i />
          <span>ONE CROWN</span>
        </div>
      </div>
    </div>
  )
}
