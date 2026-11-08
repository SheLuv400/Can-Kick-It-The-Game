import { useState } from 'react'
import {
  ANNOUNCER_MANIFEST,
  announcerEngine,
  useAnnouncerSnapshot,
  type AnnouncerEventName,
} from '../game/announcer'

const SIMULATORS: Array<[AnnouncerEventName, string]> = [
  ['normal_attack', 'NORMAL ATTACK'],
  ['heavy_attack', 'HEAVY ATTACK'],
  ['defense', 'SHIELD HIT'],
  ['block', 'FULL BLOCK'],
  ['fire', 'FIRE'],
  ['poison', 'POISON'],
  ['ice', 'ICE'],
  ['electric', 'ELECTRIC'],
  ['counter', 'COUNTER'],
  ['rewind', 'REWIND'],
  ['feature', 'FEATURE VERSE'],
  ['encore', 'ENCORE'],
  ['low_hp', 'LOW HP'],
  ['defeat', 'ARTIST DISBANDED'],
  ['revival', 'BACKSTAGE REVIVAL'],
  ['crate', 'CRATE DRAW'],
  ['crate_rare', 'RARE CRATE'],
  ['final_round', 'FINAL ROUND'],
  ['close_battle', 'CLOSE BATTLE'],
  ['comeback', 'COMEBACK'],
  ['victory', 'MATCH VICTORY'],
]

function duration(seconds: number) {
  return `${seconds.toFixed(2)}s`
}

function cooldownFor(clip: (typeof ANNOUNCER_MANIFEST.clips)[number]) {
  if (clip.cooldownMs <= 0) {
    return ANNOUNCER_MANIFEST.events[clip.event].once ? 'ONCE' : '—'
  }
  return `${(clip.cooldownMs / 1000).toFixed(1)}s`
}

export function DevAnnouncerPanel() {
  const snapshot = useAnnouncerSnapshot()
  const [open, setOpen] = useState(false)

  return (
    <div className={`dev-announcer ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="dev-announcer__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>DEV</span>
        DJ KICKIT TEST DECK
        <b>{snapshot.speaking ? 'ON AIR' : 'STANDBY'}</b>
      </button>

      {open && (
        <section className="dev-announcer__panel" aria-label="DJ KICKIT developer panel">
          <header className="dev-announcer__head">
            <div>
              <span className="dev-announcer__kicker">DEVELOPER ONLY · NOT SHOWN IN GAMEPLAY</span>
              <h2>DJ KICKIT / CUE MONITOR</h2>
              <p>
                {ANNOUNCER_MANIFEST.clips.length} extracted cues · {snapshot.loaded} decoded ·{' '}
                {snapshot.enabled ? 'announcer enabled' : 'announcer muted in settings'}
              </p>
            </div>
            <button
              type="button"
              className="dev-announcer__close"
              onClick={() => setOpen(false)}
              aria-label="Close announcer test panel"
            >
              ✕
            </button>
          </header>

          <div className="dev-announcer__status">
            <span className={snapshot.speaking ? 'is-live' : ''}>
              {snapshot.speaking ? 'PLAYING' : 'READY'}
            </span>
            <b>{snapshot.lastClipId ?? 'NO LINE YET'}</b>
            {snapshot.subtitle && <em>{snapshot.subtitle.text}</em>}
          </div>

          <div className="dev-announcer__simulators">
            <span>SIMULATE LIVE EVENTS</span>
            <div>
              {SIMULATORS.map(([event, label]) => (
                <button
                  type="button"
                  key={event}
                  onClick={() => announcerEngine.previewEvent(event)}
                  title={`Play an ${ANNOUNCER_MANIFEST.events[event].label} cue`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="dev-announcer__table" role="table" aria-label="Extracted announcer cues">
            <div className="dev-announcer__row dev-announcer__row--head" role="row">
              <span>FILE / CLIP</span>
              <span>GAMEPLAY EVENT</span>
              <span>DURATION</span>
              <span>PRIORITY</span>
              <span>COOLDOWN</span>
              <span>SUBTITLE</span>
              <span />
            </div>
            <div className="dev-announcer__list">
              {ANNOUNCER_MANIFEST.clips.map((clip) => (
                <div
                  className={`dev-announcer__row ${snapshot.lastClipId === clip.id ? 'is-current' : ''}`}
                  role="row"
                  key={clip.id}
                >
                  <span className="dev-announcer__clip">
                    <b>{clip.file.split('/').pop()}</b>
                    <i>{clip.id}</i>
                  </span>
                  <span>
                    <b>{ANNOUNCER_MANIFEST.events[clip.event].label}</b>
                    <i>{clip.event}</i>
                  </span>
                  <span>{duration(clip.duration)}</span>
                  <span className="dev-announcer__priority">P{clip.priority}</span>
                  <span>{cooldownFor(clip)}</span>
                  <span className="dev-announcer__subtitle">{clip.subtitle}</span>
                  <button
                    type="button"
                    className="dev-announcer__preview"
                    onClick={() => announcerEngine.previewClip(clip.id)}
                    aria-label={`Preview ${clip.id}`}
                  >
                    ▶ PREVIEW
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
