import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  roomSeatName,
  roomTeam,
  type RoomChatControl,
} from '../online/protocol'

interface RoomChatProps {
  control: RoomChatControl
  compact?: boolean
  onClose?: () => void
}

const MAX_MESSAGE = 180

function messageTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function RoomChat({ control, compact = false, onClose }: RoomChatProps) {
  const {
    messages,
    seats,
    localSeat,
    seatTeams = {},
    teamMode: teamModeSetting,
    textEnabled,
    voiceEnabled,
    voiceStatus,
    voiceError,
    voiceActive,
    onToggleText,
    onToggleVoice,
    onSend,
  } = control
  const [draft, setDraft] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const teamMode = teamModeSetting ?? Boolean(seats['guest-2'] || seats['guest-3'])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages.length, textEnabled])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !textEnabled) return
    onSend(text)
    setDraft('')
  }

  const voiceLabel =
    voiceStatus === 'requesting'
      ? 'CONNECTING…'
      : voiceEnabled
        ? 'VOICE ON'
        : voiceStatus === 'error'
          ? 'TRY VOICE AGAIN'
          : 'VOICE OFF'
  const connectedVoices = voiceActive.filter((seat) => seat !== localSeat).length

  return (
    <section
      className={`room-chat ${compact ? 'room-chat--compact' : ''}`}
      aria-label="Room chat"
    >
      <header className="room-chat__head">
        <div>
          <span>ROOM CHAT</span>
          <b>
            {textEnabled ? 'TEXT ON' : 'TEXT OFF'} · {voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}
          </b>
        </div>
        {onClose && (
          <button className="room-chat__close" onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        )}
      </header>

      <div className="room-chat__toggles">
        <button
          type="button"
          className={`room-chat__toggle ${textEnabled ? 'is-on' : ''}`}
          onClick={onToggleText}
          aria-pressed={textEnabled}
        >
          {textEnabled ? 'TEXT ON' : 'TEXT OFF'}
        </button>
        <button
          type="button"
          className={`room-chat__toggle room-chat__toggle--voice ${voiceEnabled ? 'is-on' : ''}`}
          onClick={onToggleVoice}
          aria-pressed={voiceEnabled}
          disabled={voiceStatus === 'requesting'}
        >
          {voiceLabel}
        </button>
      </div>

      <p className="room-chat__hint">
        VOICE USES YOUR DEVICE MIC — PHONE, HEADSET OR BLUETOOTH.
        {connectedVoices > 0 ? ` ${connectedVoices} OTHER ${connectedVoices === 1 ? 'VOICE' : 'VOICES'} LIVE.` : ''}
      </p>
      {voiceError && (
        <p className="room-chat__error" role="alert">
          {voiceError}
        </p>
      )}

      {textEnabled ? (
        <>
          <div className="room-chat__log" ref={logRef} aria-live="polite">
            {messages.length === 0 && (
              <p className="room-chat__empty">NO MESSAGES YET. SAY HI BEFORE THE SHOW.</p>
            )}
            {messages.map((message) => {
              const you = message.seat === localSeat
              const side = teamMode ? roomTeam(message.seat, seatTeams) : null
              return (
                <article
                  key={message.id}
                  className={`room-chat__message ${you ? 'is-you' : ''} ${side === 'rival' ? 'is-rival' : ''}`}
                >
                  <div className="room-chat__meta">
                    <b>{you ? 'YOU' : message.name}</b>
                    <span>
                      {roomSeatName(message.seat)}
                      {side ? ` · ${side === 'player' ? 'TEAM A' : 'TEAM B'}` : ''} · {messageTime(message.at)}
                    </span>
                  </div>
                  <p>{message.text}</p>
                </article>
              )
            })}
          </div>
          <form className="room-chat__form" onSubmit={submit}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_MESSAGE))}
              placeholder="MESSAGE THE ROOM"
              aria-label="Chat message"
              maxLength={MAX_MESSAGE}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" disabled={!draft.trim()}>
              SEND
            </button>
          </form>
          <span className="room-chat__count">
            {messages.length}/80 MESSAGES · {MAX_MESSAGE} CHARACTER LIMIT
          </span>
        </>
      ) : (
        <div className="room-chat__off">
          <b>TEXT CHAT IS OFF.</b>
          <span>Messages are hidden on this device until you turn it back on.</span>
          <button type="button" onClick={onToggleText}>
            ENABLE TEXT CHAT
          </button>
        </div>
      )}
    </section>
  )
}
