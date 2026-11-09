import { useEffect, useState } from 'react'
import type { Difficulty, GraphicsPreset, Settings, ThemeId, UiScale } from '../game/types'
import { GRAPHICS_DEFAULTS } from '../game/settings'
import { PRESET_VALUES, advancedMatchesPreset, type GraphicsRuntime } from '../game/graphics'
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
  graphics: GraphicsRuntime
  onUpdate: (patch: Partial<Settings>) => void
  onClose: () => void
  /** Borderless switches rebuild the Electron window, so battle play locks them. */
  desktopWindowModeLocked?: boolean
}

const GRAPHICS_PRESETS: { id: GraphicsPreset; label: string; note: string }[] = [
  { id: 'auto', label: 'AUTO', note: 'MEASURED FRAME SAMPLE' },
  { id: 'low', label: 'LOW', note: 'MINIMAL LIGHT · NO MATERIAL' },
  { id: 'medium', label: 'MEDIUM', note: 'BALANCED LIGHTS · LIGHTER' },
  { id: 'high', label: 'HIGH', note: 'FULL RIG · HOLO MATERIAL' },
  { id: 'ultra', label: 'ULTRA', note: 'MAX LIGHT · FULL BLOOM' },
]

function GraphicsChoice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  note,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  note?: string
}) {
  return (
    <div className="settings-choice">
      <span className="settings-choice__label">{label}</span>
      <div className="settings-choice__options">
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? 'is-on' : ''}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
      {note && <em>{note}</em>}
    </div>
  )
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
  graphics,
  onUpdate,
  onClose,
  desktopWindowModeLocked = false,
}: SettingsModalProps) {
  const desktop = getDesktopWindow()
  const narrowScreen = typeof window !== 'undefined' && window.innerWidth < 520
  const uiScaleOptions: { value: UiScale; label: string }[] = [
    { value: 90, label: '90%' },
    { value: 100, label: '100%' },
    { value: 110, label: '110%' },
    ...(narrowScreen ? [] : [{ value: 125 as UiScale, label: '125%' }]),
  ]
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
  const baseQuality = settings.graphicsPreset === 'auto' ? graphics.quality : settings.graphicsPreset
  const customTweaks = !advancedMatchesPreset(settings, baseQuality)
  const choosePreset = (preset: GraphicsPreset) => {
    if (preset === 'auto') {
      // Auto still starts from the measured tier's full effect set. The advanced
      // controls remain independent overrides after that.
      onUpdate({ graphicsPreset: 'auto', ...PRESET_VALUES[graphics.quality] })
      return
    }
    onUpdate({ graphicsPreset: preset, ...PRESET_VALUES[preset] })
  }
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

          <section className="settings-block settings-block--graphics">
            <div className="settings-block__head">
              <span className="settings-block__icon"><GameIcon name="spark" /></span>
              <div>
                <h3>GRAPHICS & DISPLAY</h3>
                <p>
                  Pick a base preset, then tune the effects the renderer actually draws. Changes apply immediately
                  and are stored on this device.
                </p>
              </div>
            </div>
            <div className="settings-graphics">
              <div className="settings-presets" role="group" aria-label="Graphics quality preset">
                {GRAPHICS_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className={settings.graphicsPreset === preset.id ? 'is-on' : ''}
                    onClick={() => choosePreset(preset.id)}
                    aria-pressed={settings.graphicsPreset === preset.id}
                  >
                    <b>{preset.label}</b>
                    <em>
                      {preset.id === 'auto'
                        ? `${graphics.quality.toUpperCase()}${graphics.autoMeasured && graphics.autoFps ? ` · ${graphics.autoFps} FPS` : ' · SAMPLING'}`
                        : preset.note}
                    </em>
                  </button>
                ))}
              </div>
              <div className="settings-graphics__meta">
                <span>
                  {settings.graphicsPreset === 'auto'
                    ? `AUTO SAMPLE ${graphics.autoMeasured && graphics.autoFps ? `${graphics.autoFps} FPS` : 'IN PROGRESS'} → ${graphics.quality.toUpperCase()}`
                    : `BASE PRESET · ${settings.graphicsPreset.toUpperCase()}`}
                </span>
                {customTweaks && <b>CUSTOM TWEAKS</b>}
              </div>

              <div className="settings-graphics__grid">
                <GraphicsChoice
                  label="FRAME RATE LIMIT"
                  value={settings.frameLimit}
                  options={[
                    { value: 'auto', label: 'AUTO' },
                    { value: 30, label: '30' },
                    { value: 60, label: '60' },
                  ]}
                  onChange={(frameLimit) => onUpdate({ frameLimit })}
                  note="Caps effect updates; the browser still composites at display refresh."
                />
                <GraphicsChoice
                  label="RENDER RESOLUTION"
                  value={settings.renderScale}
                  options={[
                    { value: 70, label: '70%' },
                    { value: 85, label: '85%' },
                    { value: 100, label: '100%' },
                  ]}
                  onChange={(renderScale) => onUpdate({ renderScale })}
                  note="Scales card textures and atmospheric blur. Text stays native."
                />
                <GraphicsChoice
                  label="UI SCALE"
                  value={graphics.uiScale}
                  options={uiScaleOptions}
                  onChange={(uiScale) => onUpdate({ uiScale })}
                  note={
                    narrowScreen
                      ? '125% is hidden on narrow phones so every control stays on screen.'
                      : 'Scales the whole interface for readability.'
                  }
                />
                <div className="settings-choice">
                  <span className="settings-choice__label">PERFORMANCE</span>
                  <div className="settings-choice__toggles">
                    <button
                      className={`settings-toggle ${settings.showFps ? 'is-on' : ''}`}
                      onClick={() => onUpdate({ showFps: !settings.showFps })}
                      aria-pressed={settings.showFps}
                    >
                      <span />
                      <b>SHOW FPS {settings.showFps ? 'ON' : 'OFF'}</b>
                    </button>
                  </div>
                  <em>{nativeWidth} × {nativeHeight} · {density}× PIXEL DENSITY</em>
                </div>
              </div>

              <div className="settings-advanced">
                <GraphicsChoice
                  label="ARTIST CARD IMAGE QUALITY"
                  value={settings.cardImageQuality}
                  options={[
                    { value: 'low', label: 'LOW' },
                    { value: 'medium', label: 'MEDIUM' },
                    { value: 'hd', label: 'HD' },
                  ]}
                  onChange={(cardImageQuality) => onUpdate({ cardImageQuality })}
                  note="Downsamples the displayed texture; original art stays untouched."
                />
                <GraphicsChoice
                  label="CARD MATERIAL EFFECTS"
                  value={settings.cardMaterial}
                  options={[
                    { value: 'off', label: 'OFF' },
                    { value: 'basic', label: 'BASIC' },
                    { value: 'enhanced', label: 'ENHANCED' },
                    { value: 'full', label: 'FULL' },
                  ]}
                  onChange={(cardMaterial) => onUpdate({ cardMaterial })}
                  note="Foil, sheen and scan layers on the existing card art."
                />
                <GraphicsChoice
                  label="CONCERT LIGHTING"
                  value={settings.concertLighting}
                  options={[
                    { value: 'low', label: 'LOW' },
                    { value: 'medium', label: 'MEDIUM' },
                    { value: 'high', label: 'HIGH' },
                  ]}
                  onChange={(concertLighting) => onUpdate({ concertLighting })}
                />
                <GraphicsChoice
                  label="SHADOWS"
                  value={settings.shadows}
                  options={[
                    { value: 'off', label: 'OFF' },
                    { value: 'low', label: 'LOW' },
                    { value: 'high', label: 'HIGH' },
                  ]}
                  onChange={(shadows) => onUpdate({ shadows })}
                />
                <GraphicsChoice
                  label="BLOOM"
                  value={settings.bloom}
                  options={[
                    { value: 'off', label: 'OFF' },
                    { value: 'low', label: 'LOW' },
                    { value: 'high', label: 'HIGH' },
                  ]}
                  onChange={(bloom) => onUpdate({ bloom })}
                />
                <GraphicsChoice
                  label="PARTICLES"
                  value={settings.particles}
                  options={[
                    { value: 'low', label: 'LOW' },
                    { value: 'medium', label: 'MEDIUM' },
                    { value: 'high', label: 'HIGH' },
                  ]}
                  onChange={(particles) => onUpdate({ particles })}
                />
                <GraphicsChoice
                  label="BACKGROUND ANIMATIONS"
                  value={settings.backgroundMotion}
                  options={[
                    { value: 'off', label: 'OFF' },
                    { value: 'reduced', label: 'REDUCED' },
                    { value: 'full', label: 'FULL' },
                  ]}
                  onChange={(backgroundMotion) => onUpdate({ backgroundMotion })}
                />
                <div className="settings-advanced__toggles">
                  <button
                    className={`settings-toggle ${settings.holoFoil ? 'is-on' : ''}`}
                    onClick={() => onUpdate({ holoFoil: !settings.holoFoil })}
                    aria-pressed={settings.holoFoil}
                  >
                    <span />
                    <b>HOLOGRAPHIC FOIL {settings.holoFoil ? 'ON' : 'OFF'}</b>
                  </button>
                  <button
                    className={`settings-toggle ${settings.audioVisualizers ? 'is-on' : ''}`}
                    onClick={() => onUpdate({ audioVisualizers: !settings.audioVisualizers })}
                    aria-pressed={settings.audioVisualizers}
                  >
                    <span />
                    <b>AUDIO VISUALIZERS {settings.audioVisualizers ? 'ON' : 'OFF'}</b>
                  </button>
                  <button
                    className={`settings-toggle ${settings.cardTilt ? 'is-on' : ''}`}
                    onClick={() => onUpdate({ cardTilt: !settings.cardTilt })}
                    aria-pressed={settings.cardTilt}
                  >
                    <span />
                    <b>CARD TILT & PARALLAX {settings.cardTilt ? 'ON' : 'OFF'}</b>
                  </button>
                  <button
                    className={`settings-toggle ${settings.vhsEffects ? 'is-on' : ''}`}
                    onClick={() => onUpdate({ vhsEffects: !settings.vhsEffects })}
                    aria-pressed={settings.vhsEffects}
                  >
                    <span />
                    <b>RETRO VHS / CRT {settings.vhsEffects ? 'ON' : 'OFF'}</b>
                  </button>
                  <button
                    className={`settings-toggle ${settings.reducedMotion ? 'is-on' : ''}`}
                    onClick={() => onUpdate({ reducedMotion: !settings.reducedMotion })}
                    aria-pressed={settings.reducedMotion}
                  >
                    <span />
                    <b>REDUCE MOTION {settings.reducedMotion ? 'ON' : 'OFF'}</b>
                  </button>
                  <button
                    className={`settings-toggle ${settings.flashEffects ? 'is-on' : ''}`}
                    onClick={() => onUpdate({ flashEffects: !settings.flashEffects })}
                    aria-pressed={settings.flashEffects}
                  >
                    <span />
                    <b>FLASHING EFFECTS {settings.flashEffects ? 'ON' : 'OFF'}</b>
                  </button>
                </div>
              </div>

              <div className="settings-graphics__foot">
                <button className="btn btn--ghost btn--sm" onClick={() => onUpdate(GRAPHICS_DEFAULTS)}>
                  RESTORE GRAPHICS DEFAULTS
                </button>
                <span>Local to this device. Graphics never change damage, HP, Hype, abilities, matchmaking or online results.</span>
              </div>
            </div>
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
            Theme, difficulty, visual quality, motion, the sound mix and DJ KICKIT apply immediately. Your mixtape and progress are saved{' '}
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
