import { useEffect } from 'react'
import type { Difficulty, Settings, ThemeId } from '../game/types'
import { DIFFICULTIES, THEME_META, THEME_ORDER } from '../game/themes'
import { GameIcon } from './GameIcon'

interface SettingsModalProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
  onClose: () => void
}

export function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const chooseTheme = (theme: ThemeId) => onUpdate({ theme, selectedDirection: theme })
  const chooseDifficulty = (difficulty: Difficulty) => onUpdate({ difficulty })

  return (
    <div className="modal settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
      <button className="modal__scrim" onClick={onClose} aria-label="Close settings" />
      <div className="modal__panel settings-panel">
        <header className="modal__head">
          <div>
            <span className="kicker">THE CONTROL ROOM</span>
            <h2>SETTINGS</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <GameIcon name="close" />
          </button>
        </header>

        <div className="settings-grid">
          <section className="settings-block">
            <div className="settings-block__head">
              <span className="settings-block__icon"><GameIcon name="spark" /></span>
              <div>
                <h3>VISUAL THEME</h3>
                <p>Switch the whole show between the three art directions.</p>
              </div>
            </div>
            <div className="settings-themes">
              {THEME_ORDER.map((id) => {
                const meta = THEME_META[id]
                return (
                  <button
                    key={id}
                    className={`settings-theme ${settings.theme === id ? 'is-on' : ''}`}
                    onClick={() => chooseTheme(id)}
                    aria-pressed={settings.theme === id}
                  >
                    <span className="settings-theme__swatch" aria-hidden="true">
                      {meta.palette.map((color) => (
                        <i key={color} style={{ background: color }} />
                      ))}
                    </span>
                    <span className="settings-theme__copy">
                      <b>{meta.name}</b>
                      <em>{meta.mood}</em>
                    </span>
                    <span className="settings-theme__tick">{settings.theme === id ? 'ACTIVE' : 'SELECT'}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="settings-block">
            <div className="settings-block__head">
              <span className="settings-block__icon"><GameIcon name="circuit" /></span>
              <div>
                <h3>SHOW DIFFICULTY</h3>
                <p>Set the crowd size and how hard the Headliner pushes back.</p>
              </div>
            </div>
            <div className="settings-difficulty">
              {DIFFICULTIES.map((item) => (
                <button
                  key={item.id}
                  className={settings.difficulty === item.id ? 'is-on' : ''}
                  onClick={() => chooseDifficulty(item.id)}
                  aria-pressed={settings.difficulty === item.id}
                >
                  <b>{item.label}</b>
                  <em>{item.note}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-block settings-block--split">
            <div>
              <div className="settings-block__head">
                <span className="settings-block__icon"><GameIcon name="play" /></span>
                <div>
                  <h3>MOTION</h3>
                  <p>Turn off animated stage lights, card lifts and cinematic movement.</p>
                </div>
              </div>
            </div>
            <button
              className={`settings-toggle ${settings.reducedMotion ? 'is-on' : ''}`}
              onClick={() => onUpdate({ reducedMotion: !settings.reducedMotion })}
              aria-pressed={settings.reducedMotion}
            >
              <span />
              <b>{settings.reducedMotion ? 'REDUCED MOTION ON' : 'FULL MOTION ON'}</b>
            </button>
          </section>

          <section className="settings-block settings-block--split">
            <div>
              <div className="settings-block__head">
                <span className="settings-block__icon"><GameIcon name="rules" /></span>
                <div>
                  <h3>AUDIO</h3>
                  <p>The menu theme has its own audio chip in the top bar. Battle sound is visual-only for now.</p>
                </div>
              </div>
            </div>
            <span className="settings-note">SAVES AUTOMATICALLY</span>
          </section>
        </div>

        <footer className="settings-foot">
          <span>Theme, difficulty and motion apply immediately. Your mixtape and progress are saved in this browser.</span>
          <button className="btn btn--primary btn--sm" onClick={onClose}>
            BACK TO THE SHOW
          </button>
        </footer>
      </div>
    </div>
  )
}
