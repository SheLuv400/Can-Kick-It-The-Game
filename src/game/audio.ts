import { useSyncExternalStore } from 'react'
import type { Element as BattleElement } from './types'

export type MusicScene = 'menu' | 'battle'
export type MusicStatus = 'loading' | 'playing' | 'paused' | 'blocked'
export type SfxName =
  | 'click'
  | 'pause'
  | 'resume'
  | 'shuffle'
  | 'card'
  | 'draw'
  | 'ability'
  | 'hit'
  | 'ko'
  | 'turn'
  | 'encore'
  | 'feature'
  | 'win'
  | 'lose'
  | 'drawMatch'

export interface AudioSnapshot {
  scene: MusicScene
  status: MusicStatus
  musicVolume: number
  sfxVolume: number
  /** True once the browser has actually allowed this session's AudioContext to run. */
  unlocked: boolean
}

export interface VisualizerBands {
  level: number
  bass: number
  mid: number
  high: number
}

const SILENT_BANDS: VisualizerBands = { level: 0, bass: 0, mid: 0, high: 0 }

export const BATTLE_TRACK = {
  title: 'Southern Steel',
  artist: 'can i kick it',
}

const MENU_SRC = `${import.meta.env.BASE_URL}audio/ciki-main-theme.webm`
const BATTLE_SRC = `${import.meta.env.BASE_URL}audio/southern-steel.webm`
const DEFAULT_MUSIC_VOLUME = 0.32
const DEFAULT_SFX_VOLUME = 0.55

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

type ToneOptions = {
  freq: number
  to?: number
  duration: number
  type?: OscillatorType
  gain?: number
  delay?: number
}

type NoiseOptions = {
  duration: number
  gain?: number
  delay?: number
  freq?: number
  freqTo?: number
  q?: number
  type?: BiquadFilterType
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

class GameAudio {
  private snapshot: AudioSnapshot = {
    scene: 'menu',
    status: 'loading',
    musicVolume: DEFAULT_MUSIC_VOLUME,
    sfxVolume: DEFAULT_SFX_VOLUME,
    unlocked: false,
  }

  private listeners = new Set<() => void>()
  private menu: HTMLAudioElement | null = null
  private battle: HTMLAudioElement | null = null
  private enabled = true
  private recordOpen = false
  private context: AudioContext | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicAnalyser: AnalyserNode | null = null
  private musicSpectrum: Uint8Array<ArrayBuffer> | null = null
  private musicSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()
  private musicGraphFailed = false
  private noiseBuffer: AudioBuffer | null = null
  private duckActive = false
  private resumeTimer: number | null = null
  private resumeAttempts = 0
  /** Focus/visibility recovery must never create a context before a real starting gesture. */
  private activationAttempted = false

  constructor() {
    if (typeof window === 'undefined') return
    const recover = () => {
      if (document.visibilityState === 'hidden' || !this.activationAttempted) return
      void this.recoverPlayback()
    }
    document.addEventListener('visibilitychange', recover)
    window.addEventListener('focus', recover)
    window.addEventListener('pageshow', recover)
  }

  getSnapshot = (): AudioSnapshot => this.snapshot

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private publish(patch: Partial<AudioSnapshot>) {
    const next = { ...this.snapshot, ...patch }
    if (
      next.scene === this.snapshot.scene &&
      next.status === this.snapshot.status &&
      next.musicVolume === this.snapshot.musicVolume &&
      next.sfxVolume === this.snapshot.sfxVolume &&
      next.unlocked === this.snapshot.unlocked
    ) {
      return
    }
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }

  private activeElement() {
    return this.snapshot.scene === 'battle' ? this.battle : this.menu
  }

  private ensureTracks() {
    if (typeof window === 'undefined') return
    if (!this.menu) {
      this.menu = new Audio(MENU_SRC)
      this.menu.loop = true
      this.menu.preload = 'auto'
      this.menu.volume = this.snapshot.musicVolume * this.duckMultiplier()
      this.wireMusicEvents(this.menu)
    }
    if (!this.battle) {
      this.battle = new Audio(BATTLE_SRC)
      this.battle.loop = true
      this.battle.preload = 'auto'
      this.battle.volume = this.snapshot.musicVolume * this.duckMultiplier()
      this.wireMusicEvents(this.battle)
    }
    if (this.context) this.attachMusicElements()
  }

  private wireMusicEvents(element: HTMLAudioElement) {
    element.addEventListener('playing', () => {
      if (this.resumeTimer !== null) {
        window.clearTimeout(this.resumeTimer)
        this.resumeTimer = null
      }
      this.resumeAttempts = 0
      if (this.activeElement() === element) this.publish({ status: 'playing' })
    })
    element.addEventListener('pause', () => {
      if (this.activeElement() === element && this.enabled && this.snapshot.status !== 'blocked') {
        this.publish({ status: 'paused' })
        this.scheduleRecovery(element)
      }
    })
    element.addEventListener('ended', () => {
      if (this.activeElement() !== element || !this.enabled || this.recordOpen) return
      try {
        element.currentTime = 0
      } catch {
        // The media pipeline is unavailable; the next play attempt will retry.
      }
      void this.startElement(element)
    })
    element.addEventListener('error', () => {
      if (this.activeElement() === element) this.publish({ status: 'blocked' })
    })
  }

  private pauseAll() {
    this.menu?.pause()
    this.battle?.pause()
  }

  private scheduleRecovery(element: HTMLAudioElement) {
    if (typeof window === 'undefined' || this.resumeAttempts >= 4) return
    if (this.resumeTimer !== null) window.clearTimeout(this.resumeTimer)
    this.resumeTimer = window.setTimeout(() => {
      this.resumeTimer = null
      if (
        this.activeElement() !== element ||
        !this.enabled ||
        this.recordOpen ||
        !element.paused
      ) {
        return
      }
      this.resumeAttempts += 1
      void this.startElement(element)
    }, 300)
  }

  private async recoverPlayback() {
    if (!this.activationAttempted) return
    this.ensureTracks()
    const context = this.ensureContext()
    if (context && (context.state as string) !== 'running') {
      try {
        await context.resume()
      } catch {
        // A later user gesture will retry.
      }
    }
    this.publish({ unlocked: Boolean(context && (context.state as string) === 'running') })
    if (!this.enabled || this.recordOpen) return
    const element = this.activeElement()
    if (element?.paused) await this.startElement(element)
  }

  private async startElement(element: HTMLAudioElement) {
    if (!this.enabled || this.recordOpen) return
    const context = this.ensureContext()
    if (context && (context.state as string) !== 'running') {
      try {
        await context.resume()
      } catch {
        // Autoplay policy can keep the context suspended until the next tap.
      }
    }
    try {
      await element.play()
      if (this.activeElement() === element) this.publish({ status: 'playing' })
    } catch {
      if (this.activeElement() === element) this.publish({ status: 'blocked' })
    }
  }

  private async playDesired() {
    this.ensureTracks()
    if (this.recordOpen) {
      this.pauseAll()
      this.publish({ status: 'paused' })
      return
    }
    const element = this.activeElement()
    if (!element) return
    if (!this.enabled) {
      this.pauseAll()
      this.publish({ status: 'paused' })
      return
    }
    const other = element === this.menu ? this.battle : this.menu
    other?.pause()
    this.applyMusicVolume(false)
    await this.startElement(element)
  }

  setScene(scene: MusicScene, restart = false) {
    const changed = this.snapshot.scene !== scene
    this.publish({ scene })
    this.resumeAttempts = 0
    this.ensureTracks()
    if (this.recordOpen) {
      this.pauseAll()
      this.publish({ status: 'paused' })
      return
    }
    const element = this.activeElement()
    if (!element) return
    if (restart) {
      try {
        element.currentTime = 0
      } catch {
        // Streaming metadata can still be settling; the next play starts at zero.
      }
    }
    if (!this.enabled) {
      this.pauseAll()
      this.publish({ status: 'paused' })
      return
    }
    if (!element.paused && !changed && !restart) {
      this.publish({ status: 'playing' })
      return
    }
    void this.playDesired()
  }

  setVolumes(musicVolume: number, sfxVolume: number) {
    const music = clampVolume(musicVolume)
    const sfx = clampVolume(sfxVolume)
    this.publish({ musicVolume: music, sfxVolume: sfx })
    this.applyMusicVolume(false)
    if (this.sfxGain) this.sfxGain.gain.value = sfx
  }

  private duckMultiplier() {
    // −5 dB while DJ KICKIT has the microphone. Manual music settings remain the base level.
    return this.duckActive ? 0.5623 : 1
  }

  private applyMusicVolume(animate: boolean) {
    const elements = [this.menu, this.battle].filter(
      (element): element is HTMLAudioElement => Boolean(element),
    )
    const target = this.snapshot.musicVolume * this.duckMultiplier()
    // iOS ignores HTMLAudioElement.volume, so music runs through a Web Audio gain.
    if (this.context && this.musicGain) {
      this.attachMusicElements()
      const gain = this.musicGain.gain
      const now = this.context.currentTime
      gain.cancelScheduledValues(now)
      gain.setValueAtTime(gain.value, now)
      if (animate) {
        gain.linearRampToValueAtTime(target, now + 0.24)
      } else {
        gain.setValueAtTime(target, now)
      }
      elements.forEach((element) => {
        if (!this.musicSources.has(element)) element.volume = target
      })
      return
    }
    elements.forEach((element) => {
      element.volume = target
    })
  }

  private attachMusicElements() {
    if (!this.context || !this.musicGain || this.musicGraphFailed) return
    for (const element of [this.menu, this.battle]) {
      if (!element || this.musicSources.has(element)) continue
      try {
        const source = this.context.createMediaElementSource(element)
        source.connect(this.musicGain)
        this.musicSources.set(element, source)
        element.volume = 1
      } catch {
        this.musicGraphFailed = true
      }
    }
  }

  /**
   * Reads the live music bus for decorative motion only. Silence is returned
   * when music is paused, blocked or the tab is hidden so visualizers never
   * continue burning frames in the background.
   */
  readVisualBands(): VisualizerBands {
    if (typeof document === 'undefined' || document.visibilityState === 'hidden') return SILENT_BANDS
    if (
      !this.musicAnalyser ||
      !this.musicSpectrum ||
      this.snapshot.status !== 'playing' ||
      this.snapshot.musicVolume <= 0.001
    ) {
      return SILENT_BANDS
    }
    this.musicAnalyser.getByteFrequencyData(this.musicSpectrum)
    const spectrum = this.musicSpectrum
    const count = spectrum.length
    if (!count) return SILENT_BANDS
    const average = (from: number, to: number) => {
      const start = Math.max(0, Math.min(count - 1, Math.floor(count * from)))
      const end = Math.max(start + 1, Math.min(count, Math.ceil(count * to)))
      let sum = 0
      for (let index = start; index < end; index += 1) sum += spectrum[index]
      return sum / (end - start) / 255
    }
    const bass = average(0, 0.1)
    const mid = average(0.1, 0.42)
    const high = average(0.42, 0.88)
    return {
      bass,
      mid,
      high,
      level: Math.min(1, bass * 0.52 + mid * 0.31 + high * 0.17),
    }
  }

  setDucking(active: boolean) {
    if (this.duckActive === active) return
    this.duckActive = active
    this.applyMusicVolume(true)
  }

  /**
   * Call only from a genuine browser activation (pointer, keyboard, or an Edge
   * controller press for which `navigator.userActivation.isActive` is true).
   * The returned promise resolves only after the shared context is running.
   */
  async unlock(): Promise<boolean> {
    this.ensureTracks()
    this.activationAttempted = true
    this.resumeAttempts = 0
    const context = this.ensureContext()
    if (!context) {
      this.publish({ unlocked: false })
      return false
    }
    if ((context.state as string) !== 'running') {
      try {
        await context.resume()
      } catch {
        // Autoplay policy can still keep the context suspended.
      }
    }
    const unlocked = (context.state as string) === 'running'
    this.publish({ unlocked })
    if (!unlocked) return false
    this.applyMusicVolume(false)
    if (this.recordOpen) return true
    if (this.enabled) {
      const element = this.activeElement()
      if (element?.paused) void this.startElement(element)
    }
    return true
  }

  /** Controller input may resume an already-authorized engine, but must not create one. */
  resumeIfReady() {
    const context = this.context
    if (!context) return
    if ((context.state as string) === 'running') {
      this.publish({ unlocked: true })
      return
    }
    const resume = context.resume().catch(() => {})
    void resume.then(() => {
      if (this.context === context) {
        this.publish({ unlocked: (context.state as string) === 'running' })
      }
    })
  }

  async toggleMusic() {
    this.ensureTracks()
    const element = this.activeElement()
    if (!element) return
    if (!element.paused) {
      this.enabled = false
      this.pauseAll()
      this.publish({ status: 'paused' })
      return
    }
    this.enabled = true
    this.activationAttempted = true
    this.resumeAttempts = 0
    const context = this.ensureContext()
    if (context && (context.state as string) !== 'running') {
      try {
        await context.resume()
      } catch {
        // The click that fired this toggle may still be enough for play().
      }
    }
    this.applyMusicVolume(false)
    await this.playDesired()
  }

  setRecordOpen(open: boolean) {
    if (this.recordOpen === open) return
    this.recordOpen = open
    this.ensureTracks()
    if (open) {
      this.pauseAll()
      this.publish({ status: 'paused' })
      return
    }
    if (this.enabled) void this.playDesired()
  }

  private ensureContext() {
    if (typeof window === 'undefined') return null
    if (this.context?.state === 'closed') {
      this.context = null
      this.sfxGain = null
      this.musicGain = null
      this.musicAnalyser = null
      this.musicSpectrum = null
      this.musicSources = new WeakMap()
      this.musicGraphFailed = false
    }
    if (!this.context) {
      const AudioCtor =
        window.AudioContext || (window as AudioWindow).webkitAudioContext
      if (!AudioCtor) return null
      this.context = new AudioCtor()
      const createdContext = this.context
      createdContext.addEventListener('statechange', () => {
        const state = createdContext.state as string
        this.publish({ unlocked: state === 'running' })
        if (
          state !== 'running' &&
          document.visibilityState !== 'hidden' &&
          this.activationAttempted &&
          this.enabled &&
          !this.recordOpen
        ) {
          void createdContext.resume().catch(() => {})
        }
      })
      this.publish({ unlocked: (createdContext.state as string) === 'running' })
      this.sfxGain = this.context.createGain()
      this.sfxGain.gain.value = this.snapshot.sfxVolume
      this.sfxGain.connect(this.context.destination)
      this.musicGain = this.context.createGain()
      this.musicGain.gain.value = this.snapshot.musicVolume * this.duckMultiplier()
      this.musicAnalyser = this.context.createAnalyser()
      this.musicAnalyser.fftSize = 256
      this.musicAnalyser.smoothingTimeConstant = 0.82
      this.musicGain.connect(this.musicAnalyser)
      this.musicAnalyser.connect(this.context.destination)
      this.musicSpectrum = new Uint8Array(this.musicAnalyser.frequencyBinCount)
      this.noiseBuffer = null
    }
    if ((this.context.state as string) === 'suspended' && this.activationAttempted) {
      void this.context.resume().catch(() => {})
    }
    return this.context
  }

  private tone(context: AudioContext, options: ToneOptions) {
    if (!this.sfxGain) return
    const start = context.currentTime + (options.delay ?? 0)
    const duration = Math.max(0.02, options.duration)
    const gain = Math.max(0.0001, options.gain ?? 0.12)
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = options.type ?? 'sine'
    oscillator.frequency.setValueAtTime(Math.max(20, options.freq), start)
    if (options.to) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.to),
        start + duration,
      )
    }
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.025, duration / 3))
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(envelope).connect(this.sfxGain)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.035)
  }

  private noise(context: AudioContext, options: NoiseOptions) {
    if (!this.sfxGain) return
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== context.sampleRate) {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let index = 0; index < data.length; index += 1) {
        data[index] = Math.random() * 2 - 1
      }
      this.noiseBuffer = buffer
    }
    const start = context.currentTime + (options.delay ?? 0)
    const duration = Math.max(0.03, options.duration)
    const source = context.createBufferSource()
    source.buffer = this.noiseBuffer
    const filter = context.createBiquadFilter()
    filter.type = options.type ?? 'bandpass'
    const freq = Math.min(16000, Math.max(80, options.freq ?? 1400))
    filter.frequency.setValueAtTime(freq, start)
    if (options.freqTo) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.min(18000, Math.max(80, options.freqTo)),
        start + duration,
      )
    }
    filter.Q.value = options.q ?? 0.7
    const envelope = context.createGain()
    const gain = Math.max(0.0001, options.gain ?? 0.1)
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.015, duration / 3))
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter).connect(envelope).connect(this.sfxGain)
    source.start(start, Math.random() * 0.5)
    source.stop(start + duration + 0.03)
  }

  private ability(context: AudioContext, element?: BattleElement | null) {
    switch (element) {
      case 'FIRE':
        this.tone(context, { freq: 180, to: 56, duration: 0.42, type: 'sawtooth', gain: 0.16 })
        this.noise(context, { duration: 0.32, freq: 900, freqTo: 240, gain: 0.12, type: 'lowpass' })
        break
      case 'ICE':
        this.tone(context, { freq: 1180, to: 1760, duration: 0.28, type: 'sine', gain: 0.1 })
        this.tone(context, { freq: 1760, to: 1240, duration: 0.22, type: 'triangle', gain: 0.07, delay: 0.07 })
        this.noise(context, { duration: 0.2, freq: 4800, gain: 0.05, q: 1.5 })
        break
      case 'ELECTRICITY':
        this.tone(context, { freq: 160, to: 90, duration: 0.18, type: 'square', gain: 0.12 })
        this.tone(context, { freq: 460, to: 220, duration: 0.12, type: 'square', gain: 0.06, delay: 0.1 })
        this.noise(context, { duration: 0.22, freq: 2800, gain: 0.1, q: 2.2 })
        break
      case 'WIND':
        this.noise(context, { duration: 0.42, freq: 620, freqTo: 2800, gain: 0.14, q: 0.9 })
        this.tone(context, { freq: 420, to: 300, duration: 0.32, type: 'triangle', gain: 0.05 })
        break
      case 'EARTH':
        this.tone(context, { freq: 92, to: 42, duration: 0.38, type: 'sine', gain: 0.28 })
        this.noise(context, { duration: 0.24, freq: 260, gain: 0.1, type: 'lowpass' })
        break
      case 'WATER':
        this.tone(context, { freq: 360, to: 180, duration: 0.35, type: 'triangle', gain: 0.11 })
        this.noise(context, { duration: 0.3, freq: 1200, freqTo: 500, gain: 0.06, type: 'lowpass' })
        break
      case 'LIGHT':
        this.tone(context, { freq: 880, to: 1320, duration: 0.35, type: 'triangle', gain: 0.1 })
        this.tone(context, { freq: 1320, to: 1760, duration: 0.28, type: 'sine', gain: 0.06, delay: 0.09 })
        break
      case 'POISON':
        this.tone(context, { freq: 220, to: 108, duration: 0.44, type: 'sawtooth', gain: 0.1 })
        this.noise(context, { duration: 0.34, freq: 620, gain: 0.06, type: 'lowpass' })
        break
      default:
        this.tone(context, { freq: 210, to: 76, duration: 0.32, type: 'sawtooth', gain: 0.14 })
        break
    }
    this.tone(context, { freq: 104, to: 48, duration: 0.2, type: 'sine', gain: 0.16 })
  }

  playSfx(name: SfxName, options: { element?: BattleElement | null } = {}) {
    if (typeof window === 'undefined' || document.visibilityState === 'hidden') return
    if (this.snapshot.sfxVolume <= 0.001) return
    // Sound starts only after the start gate has authorized this session. This
    // prevents a gamepad poll from creating a suspended context and throwing
    // an autoplay warning on every navigation press.
    const context = this.context
    if (!context || !this.sfxGain || (context.state as string) !== 'running') return
    const run = () => {
      if (this.context !== context) return
      switch (name) {
        case 'click':
          this.tone(context, { freq: 680, to: 460, duration: 0.055, type: 'triangle', gain: 0.055 })
          break
        case 'pause':
          this.tone(context, { freq: 430, to: 320, duration: 0.09, type: 'triangle', gain: 0.08 })
          this.tone(context, { freq: 320, to: 240, duration: 0.1, type: 'triangle', gain: 0.06, delay: 0.09 })
          break
        case 'resume':
          this.tone(context, { freq: 300, to: 440, duration: 0.09, type: 'triangle', gain: 0.07 })
          this.tone(context, { freq: 440, to: 620, duration: 0.11, type: 'triangle', gain: 0.05, delay: 0.08 })
          break
        case 'shuffle':
          for (let index = 0; index < 7; index += 1) {
            this.noise(context, {
              duration: 0.05 + Math.random() * 0.045,
              freq: 1500 + Math.random() * 2600,
              q: 1.8,
              gain: 0.055,
              delay: index * 0.045 + Math.random() * 0.02,
            })
          }
          break
        case 'card':
          this.noise(context, { duration: 0.14, freq: 640, freqTo: 2600, gain: 0.1, q: 0.9 })
          this.tone(context, { freq: 130, to: 82, duration: 0.09, type: 'sine', gain: 0.11, delay: 0.035 })
          break
        case 'draw':
          this.noise(context, { duration: 0.24, freq: 700, freqTo: 3200, gain: 0.08, q: 0.8 })
          this.tone(context, { freq: 660, to: 990, duration: 0.13, type: 'triangle', gain: 0.08, delay: 0.15 })
          break
        case 'ability':
          this.ability(context, options.element)
          break
        case 'hit':
          this.tone(context, { freq: 88, to: 42, duration: 0.16, type: 'sine', gain: 0.22 })
          this.noise(context, { duration: 0.1, freq: 420, gain: 0.1, type: 'lowpass' })
          break
        case 'ko':
          this.tone(context, { freq: 72, to: 35, duration: 0.44, type: 'sine', gain: 0.26 })
          this.tone(context, { freq: 210, to: 52, duration: 0.32, type: 'sawtooth', gain: 0.09 })
          this.noise(context, { duration: 0.35, freq: 1100, freqTo: 280, gain: 0.1, type: 'lowpass' })
          break
        case 'turn':
          this.noise(context, { duration: 0.13, freq: 900, freqTo: 300, gain: 0.06, type: 'bandpass' })
          this.tone(context, { freq: 180, to: 118, duration: 0.11, type: 'triangle', gain: 0.07 })
          break
        case 'encore':
          ;[392, 523.25, 659.25, 783.99].forEach((freq, index) => {
            this.tone(context, {
              freq,
              to: freq * 1.01,
              duration: 0.3,
              type: 'triangle',
              gain: 0.075,
              delay: index * 0.07,
            })
          })
          break
        case 'feature':
          ;[261.63, 329.63, 392].forEach((freq) => {
            this.tone(context, { freq, duration: 0.42, type: 'sawtooth', gain: 0.045 })
          })
          this.noise(context, { duration: 0.25, freq: 1800, gain: 0.05 })
          break
        case 'win':
          ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
            this.tone(context, {
              freq,
              duration: 0.36,
              type: 'triangle',
              gain: 0.09,
              delay: index * 0.1,
            })
          })
          this.tone(context, { freq: 130.81, duration: 0.8, type: 'sine', gain: 0.12, delay: 0.02 })
          this.noise(context, { duration: 1.25, freq: 760, gain: 0.055, type: 'bandpass', q: 0.45 })
          break
        case 'lose':
          ;[392, 329.63, 261.63, 196].forEach((freq, index) => {
            this.tone(context, {
              freq,
              to: freq * 0.985,
              duration: 0.42,
              type: 'triangle',
              gain: 0.075,
              delay: index * 0.14,
            })
          })
          this.tone(context, { freq: 98, to: 65.4, duration: 0.95, type: 'sine', gain: 0.13 })
          break
        case 'drawMatch':
          this.tone(context, { freq: 392, duration: 0.35, type: 'triangle', gain: 0.07 })
          this.tone(context, { freq: 392, duration: 0.35, type: 'triangle', gain: 0.07, delay: 0.18 })
          break
      }
    }
    if (context.state === 'suspended') {
      void context.resume().then(run).catch(() => {})
    } else {
      run()
    }
  }
}

export const audioEngine = new GameAudio()

export function useAudioSnapshot() {
  return useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot, audioEngine.getSnapshot)
}
