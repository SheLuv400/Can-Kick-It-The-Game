import { announcerEngine } from '../game/announcer'
import { audioEngine, useAudioSnapshot } from '../game/audio'

/**
 * Only rendered after the start gate. If the browser kept the AudioContext
 * suspended, this gives the player a clear, trusted one-click retry without
 * claiming that a gamepad press can unlock audio.
 */
export function AudioNotice() {
  const sound = useAudioSnapshot()
  if (sound.unlocked) return null

  return (
    <aside className="audio-notice" role="alert" aria-live="assertive">
      <div className="audio-notice__copy">
        <b>AUDIO IS LOCKED</b>
        <span>
          Your browser needs one trusted click or key press before the room can
          play. On Xbox Edge, use this button with a mouse or connected keyboard
          if controller activation is not accepted.
        </span>
      </div>
      <button
        type="button"
        className="audio-notice__action"
        onClick={() => {
          void audioEngine.unlock()
          announcerEngine.unlock()
        }}
        data-gamepad-primary
      >
        ENABLE AUDIO
      </button>
    </aside>
  )
}
