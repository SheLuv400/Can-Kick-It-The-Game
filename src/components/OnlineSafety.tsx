import { useEffect, useState } from 'react'
import {
  ONLINE_REPORT_REASONS,
  submitOnlineReport,
  type OnlineReportReason,
  type OnlineReportResult,
} from '../online/conduct'
import {
  roomSeatName,
  type PlayerProfile,
  type RoomSeat,
} from '../online/protocol'

interface OnlineSafetyProps {
  visible: boolean
  seats: Partial<Record<RoomSeat, PlayerProfile>>
  localSeat: RoomSeat
  roomCode: string
  reporterId: string
}

function opponentSeats(
  seats: Partial<Record<RoomSeat, PlayerProfile>>,
  localSeat: RoomSeat,
): RoomSeat[] {
  return (Object.keys(seats) as RoomSeat[]).filter(
    (seat) => seat !== localSeat && Boolean(seats[seat]),
  )
}

export function OnlineSafety({
  visible,
  seats,
  localSeat,
  roomCode,
  reporterId,
}: OnlineSafetyProps) {
  const [open, setOpen] = useState(false)
  const opponents = opponentSeats(seats, localSeat)
  const [target, setTarget] = useState<RoomSeat | ''>(opponents[0] ?? '')
  const [reason, setReason] = useState<OnlineReportReason>('harassment')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<OnlineReportResult | null>(null)

  useEffect(() => {
    if (!opponents.includes(target as RoomSeat)) {
      setTarget(opponents[0] ?? '')
    }
  }, [opponents, target])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!visible) return null

  const profile = target ? seats[target] : undefined
  const targetName = profile?.name ?? (target ? roomSeatName(target) : '')

  const openDesk = () => {
    setOpen(true)
    setError('')
    setResult(null)
    setNote('')
    setTarget(opponents[0] ?? '')
  }

  const send = async () => {
    if (!target || !profile || !reporterId || sending) return
    setSending(true)
    setError('')
    setResult(null)
    try {
      const report = await submitOnlineReport({
        targetId: profile.playerId,
        targetName,
        reporterId,
        reason,
        note,
        roomCode,
      })
      setResult(report)
      setNote('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'THE REPORT COULD NOT BE SENT.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="online-safety__trigger"
        onClick={openDesk}
        aria-label="Open online safety and player report desk"
      >
        <span aria-hidden="true">⚑</span> SAFETY / REPORT
      </button>

      {open && (
        <div
          className="online-safety"
          role="dialog"
          aria-modal="true"
          aria-labelledby="online-safety-title"
        >
          <button
            type="button"
            className="online-safety__scrim"
            onClick={() => setOpen(false)}
            aria-label="Close safety desk"
          />
          <section className="online-safety__panel">
            <header className="online-safety__head">
              <div>
                <span>ONLINE CONDUCT · REPORT DESK</span>
                <h2 id="online-safety-title">KEEP THE ROOM SAFE.</h2>
              </div>
              <button
                type="button"
                className="online-safety__close"
                onClick={() => setOpen(false)}
                aria-label="Close report desk"
              >
                ✕
              </button>
            </header>

            <p className="online-safety__copy">
              Report bullying, harassment, racial or vocal abuse, cheating or another safety issue.
              Reports are tied to the player code in this room. Three separate reports in 30 days
              trigger a 30-minute online ban; each later report ban doubles.
            </p>

            {opponents.length === 0 ? (
              <p className="online-safety__empty">NO OTHER PLAYER IS IN THE ROOM YET.</p>
            ) : (
              <>
                <label className="online-safety__field">
                  <span>WHO ARE YOU REPORTING?</span>
                  <select
                    value={target}
                    onChange={(event) => setTarget(event.target.value as RoomSeat)}
                  >
                    {opponents.map((seat) => (
                      <option key={seat} value={seat}>
                        {seats[seat]?.name ?? roomSeatName(seat)}
                        {seats[seat]?.playerId ? ` · ${seats[seat]?.playerId}` : ' · CODE UNAVAILABLE'}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="online-safety__reasons">
                  <legend>WHAT HAPPENED?</legend>
                  {ONLINE_REPORT_REASONS.map((option) => (
                    <label key={option.id} className={reason === option.id ? 'is-selected' : ''}>
                      <input
                        type="radio"
                        name="online-report-reason"
                        value={option.id}
                        checked={reason === option.id}
                        onChange={() => setReason(option.id)}
                      />
                      <b>{option.label}</b>
                      <em>{option.detail}</em>
                    </label>
                  ))}
                </fieldset>

                <label className="online-safety__field">
                  <span>WHAT SHOULD THE SAFETY DESK KNOW? (OPTIONAL)</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value.slice(0, 280))}
                    placeholder="Add the call, message or match detail that matters."
                    rows={3}
                    maxLength={280}
                  />
                  <small>{note.length}/280</small>
                </label>

                {error && (
                  <p className="online-safety__notice is-error" role="alert">
                    {error}
                  </p>
                )}
                {result && (
                  <p className="online-safety__notice is-success" role="status">
                    {result.banApplied
                      ? `REPORT ACCEPTED · ${result.banMinutes ?? 30}-MINUTE ONLINE BAN APPLIED.`
                      : `REPORT ACCEPTED · ${result.reports}/${result.needed} REPORTS LOGGED AGAINST THIS PLAYER.`}
                  </p>
                )}

                <div className="online-safety__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => void send()}
                    disabled={sending || !profile}
                  >
                    {sending ? 'SENDING…' : 'SEND REPORT'}
                  </button>
                  <span>
                    REPORTING: {targetName.toUpperCase()}
                    {profile?.playerId ? ` · ${profile.playerId}` : ''}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}
