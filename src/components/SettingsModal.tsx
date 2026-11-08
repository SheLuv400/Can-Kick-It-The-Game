import { useEffect, useState } from 'react'
import type { Difficulty, Settings, ThemeId } from '../game/types'
import { DIFFICULTIES, THEME_META, THEME_ORDER } from '../game/themes'
import {
  canSwitchDesktopWindowMode,
  desktopPlatformLabel,
  getDesktopWindow,
  type DesktopWindowMode,
  type DesktopWindowState,
} from '../desktop/window'
import { GameIcon } from './GameIcon'
import { VolumeSlider } from './VolumeSlider'

interface SettingsModalProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
  onClose: () => void
  /** Borderless switches rebuild the Electron window, so battle play locks them. */
  desktopWindowModeLocked?: boolean
}

function readDisplay() {
  const dpr = window.devicePixelRatio || 1
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr,
    fullscreen: Boolean(document.fullscreenElement),
    supported:
      typeof document.documentElement.requestFullscreen === 'function' &&
      document.fullscreenEnabled !== false,
  }
}

export function SettingsModal({
  settings,
  onUpdate,
  onClose,
  desktopWindowModeLocked = false,
}: SettingsModalProps) {
  const desktop = getDesktopWindow()
  const [display, setDisplay] = useState(readDisplay)
  const [fullscreenError, setFullscreenError] = useState('')
  const [desktopState, setDesktopState] = useState<DesktopWindowState | null>(null)
  const [desktopError, setDesktopError] = useState('')
  const [pendingWindowMode, setPendingWindowMode] = useState<DesktopWindowMode | null>(null)
  const [quitting, setQuitting] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const sync = () => {
      setDisplay(readDisplay())
      setFullscreenError('')
    }
    document.addEventListener('fullscreenchange', sync)
    window.addEventListener('resize', sync)
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      window.removeEventListener('resize', sync)
      viewport?.removeEventListener('resize', sync)
    }
  }, [])

  useEffect(() => {
    if (!desktop) return
    let alive = true
    desktop
      .getState()
      .then((state) => {
        if (alive) setDesktopState(state)
      })
      .catch(() => {
        if (alive) setDesktopError('Could not read the desktop window state.')
      })
    const unsubscribe = desktop.onStateChange((state) => {
      if (alive) setDesktopState(state)
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [desktop])

  const toggleFullscreen = async () => {
    setFullscreenError('')
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }
      if (!document.documentElement.requestFullscreen) throw new Error('unsupported')
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      setFullscreenError('Fullscreen was blocked. Open the game in its own tab or press F11 on desktop.')
    }
  }

  const changeWindowMode = async (mode: DesktopWindowMode) => {
    if (!desktop || !desktopState || pendingWindowMode !== null || mode === desktopState.mode) return
    if (desktopWindowModeLocked && !canSwitchDesktopWindowMode(mode, desktopState, true)) return
    setDesktopError('')
    setPendingWindowMode(mode)
    try {
      const result = await desktop.setMode(mode)
      if (!result.reloading) {
        setDesktopState(result.state)
        setPendingWindowMode(null)
      }
    } catch {
      setDesktopError('Could not change the window mode. Try again from the main menu.')
      setPendingWindowMode(null)
    }
  }

  const quitGame = async () => {
    if (!desktop || quitting) return
    setDesktopError('')
    setQuitting(true)
    try {
      await desktop.quit()
    } catch {
      setDesktopError('Could not close the game. Use the window close button or Alt+F4.')
    } finally {
      setQuitting(false)
    }
  }

  const windowModeDisabled = (mode: DesktopWindowMode) =>
    !desktopState ||
    pendingWindowMode !== null ||
    (desktopWindowModeLocked && !canSwitchDesktopWindowMode(mode, desktopState, true))

  const desktopModes: { id: DesktopWindowMode; label: string; note: string }[] = [
    { id: 'windowed', label: 'WINDOWED', note: 'Standard frame. Move and resize.' },
    { id: 'borderless', label: 'BORDERLESS', note: 'Full display, no window frame.' },
    { id: 'fullscreen', label: 'FULLSCREEN', note: 'Native fullscreen. F11 toggles.' },
  ]

  const nativeWidth = Math.round(display.width * display.dpr)
  const nativeHeight = Math.round(display.height * display.dpr)
  const density = Number.isInteger(display.dpr) ? display.dpr.toFixed(0) : display.dpr.toFixed(2)

  const chooseTheme = (theme: ThemeId) => onUpdate({ theme, selectedDirection: theme })
  const chooseDifficulty = (difficulty: Difficulty) => onUpdate({ difficulty })
  const updateAnnouncer = (patch: Partial<Settings['announcer']>) =>
    onUpdate({ announcer: { ...settings.announcer, ...patch } })

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

          {desktop ? (
            <section className="settings-block settings-block--desktop">
              <div className="settings-block__head">
                <span className="settings-block__icon"><GameIcon name="settings" /></span>
                <div>
                  <h3>WINDOW MODE</h3>
                  <p>Choose how the Windows app fills your display. The setting is remembered on this PC.</p>
                </div>
              </div>
              <div className="settings-window">
                <div className="settings-window__modes" role="group" aria-label="Window mode">
                  {desktopModes.map((item) => {
                    const active = desktopState?.mode === item.id
                    return (
                      <button
                        key={item.id}
                        className={`settings-window__mode ${active ? 'is-on' : ''}`}
                        onClick={() => changeWindowMode(item.id)}
                        disabled={windowModeDisabled(item.id)}
                        aria-pressed={active}
                      >
                        <b>{item.label}</b>
                        <em>{item.note}</em>
                        <span>
                          {active
                            ? 'ACTIVE'
                            : pendingWindowMode === item.id
                              ? 'SWITCHING…'
                              : 'SELECT'}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="settings-window__meta">
                  <span className="settings-window__readout">
                    <b>{nativeWidth} × {nativeHeight} PX</b>
                    <span>
                      {density}× PIXEL DENSITY ·{' '}
                      {desktopState
                        ? `${desktopPlatformLabel(desktopState.platform)} · ${desktopState.mode.toUpperCase()}`
                        : 'READING WINDOW'}
                    </span>
                  </span>
                  <button
                    className="btn btn--ghost btn--sm settings-exit"
                    onClick={quitGame}
                    disabled={quitting}
                  >
                    {quitting ? 'CLOSING…' : 'EXIT GAME'}
                  </button>
                </div>
                {desktopWindowModeLocked && (
                  <span className="settings-window__note">
                    Window style changes are locked during a battle. Fullscreen is still available.
                  </span>
                )}
                {desktopState?.mode === 'borderless' && !desktopWindowModeLocked && (
                  <span className="settings-window__note">
                    Borderless fills the display without a window frame. Switching to or from it applies with a quick reload.
                  </span>
                )}
                {desktopError && <span className="settings-window__error">{desktopError}</span>}
              </div>
            </section>
          ) : (
            <section className="settings-block settings-block--display">
              <div>
                <div className="settings-block__head">
                  <span className="settings-block__icon"><GameIcon name="play" /></span>
                  <div>
                    <h3>DISPLAY QUALITY</h3>
                    <p>Runs at your screen's native pixel density. Fullscreen gives the whole display to the show.</p>
                  </div>
                </div>
              </div>
              <div className="settings-display">
                <span className="settings-display__readout">
                  <b>{nativeWidth} × {nativeHeight} PX</b>
                  <span>{density}× PIXEL DENSITY · {display.fullscreen ? 'FULLSCREEN' : 'WINDOWED'}</span>
                </span>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={toggleFullscreen}
                  disabled={!display.supported}
                  aria-pressed={display.fullscreen}
                >
                  {display.supported
                    ? display.fullscreen
                      ? 'EXIT FULLSCREEN'
                      : 'ENTER FULLSCREEN'
                    : 'FULLSCREEN UNAVAILABLE'}
                </button>
                {fullscreenError && <span className="settings-display__error">{fullscreenError}</span>}
              </div>
            </section>
          )}

          <section className="settings-block settings-block--announcer">
            <div className="settings-block__head">
              <span className="settings-block__icon"><GameIcon name="spark" /></span>
              <div>
                <h3>BATTLE ANNOUNCER</h3>
                <p>DJ KICKIT calls the show live. Tune his voice, the room, and how often he reacts.</p>
              </div>
            </div>
            <div className="settings-announcer">
              <div className="settings-announcer__options">
                <button
                  className={`settings-toggle ${settings.announcer.enabled ? 'is-on' : ''}`}
                  onClick={() => updateAnnouncer({ enabled: !settings.announcer.enabled })}
                  aria-pressed={settings.announcer.enabled}
                >
                  <span />
                  <b>{settings.announcer.enabled ? 'ANNOUNCER ON' : 'ANNOUNCER OFF'}</b>
                </button>
                <button
                  className={`settings-announcer__subtitles ${settings.announcer.subtitles ? 'is-on' : ''}`}
                  onClick={() => updateAnnouncer({ subtitles: !settings.announcer.subtitles })}
                  aria-pressed={settings.announcer.subtitles}
                >
                  <i />
                  SUBTITLES {settings.announcer.subtitles ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="settings-announcer__mix">
                <VolumeSlider
                  label="DJ KICKIT"
                  value={settings.announcer.volume}
                  onChange={(volume) => updateAnnouncer({ volume })}
                />
                <VolumeSlider
                  label="CROWD"
                  value={settings.announcer.crowdVolume}
                  onChange={(crowdVolume) => updateAnnouncer({ crowdVolume })}
                />
              </div>
              <div className="settings-frequency" role="group" aria-label="Commentary frequency">
                <span>COMMENTARY FREQUENCY</span>
                <div>
                  {([
                    ['LOW', 'LET IT BREATHE'],
                    ['NORMAL', 'LIVE HOST'],
                    ['HIGH', 'FULL HYPE'],
                  ] as const).map(([frequency, note]) => (
                    <button
                      key={frequency}
                      className={settings.announcer.frequency === frequency ? 'is-on' : ''}
                      onClick={() => updateAnnouncer({ frequency })}
                      aria-pressed={settings.announcer.frequency === frequency}
                    >
                      <b>{frequency}</b>
                      <em>{note}</em>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="settings-block settings-block--split settings-block--audio">
            <div>
              <div className="settings-block__head">
                <span className="settings-block__icon"><GameIcon name="play" /></span>
                <div>
                  <h3>SOUND MIX</h3>
                  <p>Menu theme, battle score and show effects. Changes apply instantly.</p>
                </div>
              </div>
            </div>
            <div className="settings-audio">
              <VolumeSlider
                label="MUSIC"
                value={settings.musicVolume}
                onChange={(musicVolume) => onUpdate({ musicVolume })}
              />
              <VolumeSlider
                label="FX"
                value={settings.sfxVolume}
                onChange={(sfxVolume) => onUpdate({ sfxVolume })}
                previewSfx
              />
            </div>
          </section>
        </div>

        <footer className="settings-foot">
          <span>
            Theme, difficulty, motion, the sound mix and DJ KICKIT apply immediately. Your mixtape and progress are saved{' '}
            {desktop ? 'on this PC.' : 'in this browser.'}
          </span>
          <button className="btn btn--primary btn--sm" onClick={onClose}>
            BACK TO THE SHOW
          </button>
        </footer>
      </div>
    </div>
  )
}
