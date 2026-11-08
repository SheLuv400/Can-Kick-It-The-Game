import { useEffect, useState } from 'react'
import { GAME_VERSION } from '../game/version'
import {
  GAME_UPDATES,
  updateNoteCount,
  type UpdateSectionKey,
} from '../game/updates'
import { GameIcon } from './GameIcon'

const SECTIONS: Array<{ key: UpdateSectionKey; label: string; mark: string }> = [
  { key: 'new', label: 'NEW', mark: '+' },
  { key: 'fixed', label: 'FIXED', mark: '✓' },
  { key: 'changed', label: 'CHANGED', mark: '→' },
]

function plainVersion(version: string) {
  return version.startsWith('v') ? version : `V${version}`
}

export function UpdatesModal({
  isNewUpdate,
  onClose,
}: {
  isNewUpdate: boolean
  onClose: () => void
}) {
  const current = GAME_UPDATES.find((log) => log.version === GAME_VERSION) ?? GAME_UPDATES[0]
  const [selectedVersion, setSelectedVersion] = useState(current?.version ?? '')
  const log = GAME_UPDATES.find((entry) => entry.version === selectedVersion) ?? current

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!log) {
    return (
      <div className="modal updates-modal" role="dialog" aria-modal="true" aria-label="Updates">
        <button className="modal__scrim" onClick={onClose} aria-label="Close updates" />
        <div className="modal__panel updates-panel">
          <header className="modal__head updates-head">
            <div>
              <span className="kicker">BUILD ARCHIVE · CIKI {GAME_VERSION}</span>
              <h2>THE UPDATE LOG</h2>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Close updates">✕</button>
          </header>
          <div className="updates-empty">
            <GameIcon name="spark" />
            <b>NO UPDATE NOTES YET.</b>
            <p>Nothing has been logged for this build. Check back after the next drop.</p>
          </div>
        </div>
      </div>
    )
  }

  const noteCount = updateNoteCount(log)
  const isCurrent = log.version === GAME_VERSION

  return (
    <div className="modal updates-modal" role="dialog" aria-modal="true" aria-label="Updates">
      <button className="modal__scrim" onClick={onClose} aria-label="Close updates" />
      <div className="modal__panel updates-panel">
        <header className="modal__head updates-head">
          <div>
            <span className="kicker">BUILD ARCHIVE · CIKI {GAME_VERSION}</span>
            <h2>THE UPDATE LOG</h2>
            <p>RELEASES · BUG FIXES · WHAT CHANGED IN THE ROOM</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close updates">✕</button>
        </header>

        <div className={`updates-status ${isNewUpdate ? 'is-new' : ''}`}>
          <i aria-hidden="true" />
          <span>{isNewUpdate ? 'NEW UPDATE AVAILABLE' : 'UP TO DATE · NO NEW UPDATES'}</span>
          <em>
            {isNewUpdate
              ? `CIKI ${GAME_VERSION} JUST LANDED`
              : `YOU HAVE SEEN EVERYTHING IN ${GAME_VERSION}`}
          </em>
        </div>

        <div className="updates-shell">
          <nav className="updates-versions" aria-label="Update versions">
            <span className="updates-versions__label">VERSION HISTORY</span>
            {GAME_UPDATES.map((entry) => (
              <button
                key={entry.version}
                className={`updates-version ${entry.version === log.version ? 'is-active' : ''}`}
                onClick={() => setSelectedVersion(entry.version)}
                aria-pressed={entry.version === log.version}
              >
                <span className="updates-version__no">{plainVersion(entry.version)}</span>
                <b>{entry.title}</b>
                <em>{entry.label}</em>
                {entry.version === GAME_VERSION && (
                  <span className="updates-version__current">CURRENT</span>
                )}
              </button>
            ))}
          </nav>

          <section className="updates-release" aria-live="polite">
            <header className="updates-release__hero">
              <div className="updates-release__stamp">
                <span>VERSION</span>
                <b>{plainVersion(log.version)}</b>
              </div>
              <div className="updates-release__copy">
                <span>{log.label}</span>
                <h3>{log.title}</h3>
                <p>{log.summary}</p>
              </div>
              {isCurrent && <span className="updates-release__current">LATEST BUILD</span>}
            </header>

            {noteCount === 0 ? (
              <div className="updates-empty">
                <GameIcon name="spark" />
                <b>NOTHING NEW HAS BEEN LOGGED.</b>
                <p>
                  This build has no new features, fixes or changes recorded yet. The archive will
                  update when the next drop lands.
                </p>
              </div>
            ) : (
              <div className="updates-blocks">
                {SECTIONS.map((section) => {
                  const items = log.sections[section.key]
                  if (!items.length) return null
                  return (
                    <section
                      className={`updates-block updates-block--${section.key}`}
                      key={section.key}
                    >
                      <header>
                        <span className="updates-block__tag">{section.label}</span>
                        <b>{items.length.toString().padStart(2, '0')}</b>
                      </header>
                      <ul>
                        {items.map((item) => (
                          <li key={item}>
                            <span aria-hidden="true">{section.mark}</span>
                            <p>{item}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            )}

            <footer className="updates-foot">
              <p>
                NOTES ARE SAVED WITH THE BUILD · CIKI {GAME_VERSION} · LAST ARCHIVED RELEASE{' '}
                {GAME_UPDATES[0] ? plainVersion(GAME_UPDATES[0].version) : '—'}
              </p>
              <button className="btn btn--ghost btn--sm" onClick={onClose}>CLOSE LOG</button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  )
}
