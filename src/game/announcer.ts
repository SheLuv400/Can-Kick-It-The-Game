import { useSyncExternalStore } from 'react'
import commentaryManifest from '../../audio/announcer/commentary_manifest.json'
import type { AnnouncerSettings } from './types'
import { audioEngine } from './audio'

export const ANNOUNCER_EVENT_NAMES = [
  'battle_start',
  'normal_attack',
  'heavy_attack',
  'healing',
  'defense',
  'block',
  'counter',
  'rewind',
  'fire',
  'poison',
  'ice',
  'electric',
  'feature',
  'encore',
  'low_hp',
  'defeat',
  'revival',
  'crate',
  'crate_rare',
  'close_battle',
  'final_round',
  'comeback',
  'victory',
] as const

export type AnnouncerEventName = (typeof ANNOUNCER_EVENT_NAMES)[number]
export type AnnouncerSide = 'player' | 'rival'

export interface AnnouncerEventMeta {
  priority: number
  cooldownMs: number
  once: boolean
  label: string
}

export interface AnnouncerClip {
  id: string
  event: AnnouncerEventName
  file: string
  duration: number
  priority: number
  cooldownMs: number
  weight: number
  subtitle: string
  sourceStart: number
  sourceEnd: number
}

interface AnnouncerManifest {
  version: number
  announcer: string
  generatedAt: string
  source: {
    file: string
    sha256: string
    duration: number
    masterUnchanged: boolean
    derivative: string
  }
  events: Record<AnnouncerEventName, AnnouncerEventMeta>
  clips: AnnouncerClip[]
}

export const ANNOUNCER_MANIFEST = commentaryManifest as unknown as AnnouncerManifest

export interface AnnouncerCue {
  event: AnnouncerEventName
  side?: AnnouncerSide
}

export interface AnnouncerSubtitle {
  text: string
  clipId: string
}

export interface AnnouncerSnapshot {
  speaking: boolean
  subtitle: AnnouncerSubtitle | null
  lastEvent: AnnouncerEventName | null
  lastClipId: string | null
  loaded: number
  total: number
  enabled: boolean
}

const FALLBACK_SETTINGS: AnnouncerSettings = {
  enabled: true,
  volume: 0.88,
  crowdVolume: 0.42,
  subtitles: true,
  frequency: 'NORMAL',
}

const TIE_BREAK: Record<AnnouncerEventName, number> = {
  battle_start: 4,
  normal_attack: 1,
  heavy_attack: 2,
  healing: 1,
  defense: 1,
  block: 3,
  counter: 3,
  rewind: 3,
  fire: 1,
  poison: 1,
  ice: 1,
  electric: 1,
  feature: 3,
  encore: 4,
  low_hp: 5,
  defeat: 7,
  revival: 4,
  crate: 1,
  crate_rare: 2,
  close_battle: 0,
  final_round: 4,
  comeback: 4,
  victory: 9,
}

type CrowdKind = 'small' | 'cheer' | 'big' | 'gasp' | 'boo' | 'applause' | 'murmur' | 'victory'

interface CurrentPlayback {
  token: number
  clip: AnnouncerClip
  event: AnnouncerEventName
  rank: number
  source: AudioBufferSourceNode
  gain: GainNode
}

function clampVolume(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

function frequencyMultiplier(frequency: AnnouncerSettings['frequency']) {
  if (frequency === 'LOW') return 1.65
  if (frequency === 'HIGH') return 0.62
  return 1
}

function eventRank(event: AnnouncerEventName) {
  return ANNOUNCER_MANIFEST.events[event].priority * 100 + TIE_BREAK[event]
}

function crowdKindFor(event: AnnouncerEventName, side?: AnnouncerSide): { kind: CrowdKind; intensity: number } {
  switch (event) {
    case 'heavy_attack':
      return { kind: 'big', intensity: 0.78 }
    case 'defense':
      return { kind: 'small', intensity: 0.28 }
    case 'block':
      return { kind: 'gasp', intensity: 0.62 }
    case 'counter':
      return { kind: 'big', intensity: 0.58 }
    case 'rewind':
      return { kind: 'gasp', intensity: 0.52 }
    case 'healing':
      return { kind: 'applause', intensity: 0.45 }
    case 'fire':
    case 'poison':
    case 'ice':
    case 'electric':
      return { kind: 'cheer', intensity: 0.4 }
    case 'feature':
      return { kind: 'big', intensity: 0.68 }
    case 'encore':
      return { kind: 'big', intensity: 0.82 }
    case 'low_hp':
      return { kind: 'gasp', intensity: 0.5 }
    case 'defeat':
      return side === 'player' ? { kind: 'boo', intensity: 0.8 } : { kind: 'big', intensity: 1 }
    case 'revival':
      return { kind: 'cheer', intensity: 0.9 }
    case 'crate':
      return { kind: 'murmur', intensity: 0.35 }
    case 'crate_rare':
      return { kind: 'gasp', intensity: 0.55 }
    case 'close_battle':
      return { kind: 'murmur', intensity: 0.42 }
    case 'final_round':
      return { kind: 'big', intensity: 0.9 }
    case 'comeback':
      return { kind: 'cheer', intensity: 0.92 }
    case 'victory':
      return { kind: 'victory', intensity: 1 }
    case 'battle_start':
      return { kind: 'cheer', intensity: 0.58 }
    case 'normal_attack':
    default:
      return { kind: 'small', intensity: 0.2 }
  }
}

class AnnouncerEngine {
  private snapshot: AnnouncerSnapshot = {
    speaking: false,
    subtitle: null,
    lastEvent: null,
    lastClipId: null,
    loaded: 0,
    total: ANNOUNCER_MANIFEST.clips.length,
    enabled: FALLBACK_SETTINGS.enabled,
  }

  private settings: AnnouncerSettings = { ...FALLBACK_SETTINGS }
  private listeners = new Set<() => void>()
  private context: AudioContext | null = null
  private busInput: GainNode | null = null
  private busGain: GainNode | null = null
  private crowdGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private buffers = new Map<string, AudioBuffer>()
  private loading = new Map<string, Promise<AudioBuffer>>()
  private current: CurrentPlayback | null = null
  private currentSubtitle: AnnouncerSubtitle | null = null
  private serial = 0
  private matchActive = false
  private paused = false
  private batch: AnnouncerCue[] = []
  private batchTimer: number | null = null
  private preloadStarted = false
  private lastPlayed = new Map<string, number>()
  private lastEventAt = new Map<AnnouncerEventName, number>()
  private onceEvents = new Set<AnnouncerEventName>()
  private history: string[] = []

  getSnapshot = (): AnnouncerSnapshot => this.snapshot

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private publish(patch: Partial<AnnouncerSnapshot>) {
    const next = { ...this.snapshot, ...patch }
    if (
      next.speaking === this.snapshot.speaking &&
      next.subtitle?.text === this.snapshot.subtitle?.text &&
      next.subtitle?.clipId === this.snapshot.subtitle?.clipId &&
      next.lastEvent === this.snapshot.lastEvent &&
      next.lastClipId === this.snapshot.lastClipId &&
      next.loaded === this.snapshot.loaded &&
      next.total === this.snapshot.total &&
      next.enabled === this.snapshot.enabled
    ) {
      return
    }
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }

  configure(settings: AnnouncerSettings) {
    const next: AnnouncerSettings = {
      enabled: Boolean(settings.enabled),
      volume: clampVolume(settings.volume, FALLBACK_SETTINGS.volume),
      crowdVolume: clampVolume(settings.crowdVolume, FALLBACK_SETTINGS.crowdVolume),
      subtitles: Boolean(settings.subtitles),
      frequency:
        settings.frequency === 'LOW' || settings.frequency === 'HIGH' ? settings.frequency : 'NORMAL',
    }
    const wasEnabled = this.settings.enabled
    this.settings = next
    if (this.busGain && this.context) {
      this.busGain.gain.setTargetAtTime(next.volume, this.context.currentTime, 0.025)
    }
    if (this.crowdGain && this.context) {
      this.crowdGain.gain.setTargetAtTime(
        this.paused ? 0 : next.crowdVolume,
        this.context.currentTime,
        0.025,
      )
    }
    this.publish({
      enabled: next.enabled,
      subtitle: next.subtitles ? this.currentSubtitle : null,
    })
    if (!next.enabled && wasEnabled) this.halt()
  }

  unlock() {
    const context = this.ensureContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume().catch(() => {})
  }

  /** Controller input may resume an already-authorized announcer bus. */
  resumeIfReady() {
    const context = this.context
    if (!context) return
    if (context.state === 'suspended') void context.resume().catch(() => {})
  }

  startMatch() {
    if (this.matchActive) return
    this.matchActive = true
    this.paused = false
    this.lastPlayed.clear()
    this.lastEventAt.clear()
    this.onceEvents.clear()
    this.history = []
    if (this.crowdGain && this.context) {
      this.crowdGain.gain.setTargetAtTime(this.settings.crowdVolume, this.context.currentTime, 0.04)
    }
    void this.preloadAll()
    this.requestEvents([{ event: 'battle_start' }])
  }

  stop() {
    this.halt()
    this.matchActive = false
    this.paused = false
    this.lastPlayed.clear()
    this.lastEventAt.clear()
    this.onceEvents.clear()
    this.history = []
    this.batch = []
    this.publish({ lastEvent: null, lastClipId: null })
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return
    this.paused = paused
    if (this.crowdGain && this.context) {
      this.crowdGain.gain.setTargetAtTime(
        paused ? 0 : this.settings.crowdVolume,
        this.context.currentTime,
        0.03,
      )
    }
    if (paused) {
      this.halt()
    } else {
      const context = this.ensureContext()
      if (context?.state === 'suspended') void context.resume().catch(() => {})
    }
  }

  triggerEvent(event: AnnouncerEventName, side?: AnnouncerSide) {
    this.requestEvents([{ event, side }])
  }

  triggerEvents(cues: AnnouncerCue[]) {
    this.requestEvents(cues)
  }

  private requestEvents(cues: AnnouncerCue[]) {
    if (!this.settings.enabled || this.paused || !this.matchActive) return
    const valid = cues.filter((cue) => ANNOUNCER_EVENT_NAMES.includes(cue.event))
    if (valid.length === 0) return
    this.batch.push(...valid)
    if (this.batchTimer !== null) return
    this.batchTimer = window.setTimeout(() => {
      this.batchTimer = null
      const queued = this.batch
      this.batch = []
      this.flush(queued)
    }, 70)
  }

  private flush(queued: AnnouncerCue[]) {
    if (!this.settings.enabled || this.paused) return
    const multiplier = frequencyMultiplier(this.settings.frequency)
    const now = Date.now()
    const choices: Array<{ cue: AnnouncerCue; clip: AnnouncerClip; rank: number }> = []

    for (const cue of queued) {
      const meta = ANNOUNCER_MANIFEST.events[cue.event]
      if (!meta) continue
      if (meta.once && this.onceEvents.has(cue.event)) continue
      if (
        meta.cooldownMs > 0 &&
        now - (this.lastEventAt.get(cue.event) ?? 0) < meta.cooldownMs * multiplier
      ) {
        continue
      }
      // Low frequency deliberately leaves some small moments to the room.
      if (this.settings.frequency === 'LOW' && meta.priority <= 2 && Math.random() < 0.34) {
        continue
      }
      const clip = this.pickClip(cue.event, multiplier)
      if (!clip) continue
      choices.push({ cue, clip, rank: eventRank(cue.event) })
    }

    choices.sort((a, b) => b.rank - a.rank)
    const choice = choices[0]
    if (!choice) return
    if (this.current && choice.rank <= this.current.rank) return
    void this.playClip(choice.clip, choice.cue, false)
  }

  private pickClip(event: AnnouncerEventName, multiplier: number): AnnouncerClip | null {
    const meta = ANNOUNCER_MANIFEST.events[event]
    if (!meta) return null
    const now = Date.now()
    let candidates = ANNOUNCER_MANIFEST.clips.filter((clip) => {
      if (clip.event !== event) return false
      if (clip.cooldownMs <= 0) return true
      return now - (this.lastPlayed.get(clip.id) ?? 0) >= clip.cooldownMs * multiplier
    })
    if (candidates.length === 0) return null

    if (candidates.length > 1) {
      const withoutRecent = candidates.filter((clip) => !this.history.slice(-2).includes(clip.id))
      if (withoutRecent.length > 0) candidates = withoutRecent
    } else if (this.history.slice(-2).includes(candidates[0].id)) {
      return null
    }

    const total = candidates.reduce((sum, clip) => sum + Math.max(0.1, clip.weight), 0)
    let roll = Math.random() * total
    for (const clip of candidates) {
      roll -= Math.max(0.1, clip.weight)
      if (roll <= 0) return clip
    }
    return candidates[candidates.length - 1]
  }

  private ensureContext() {
    if (typeof window === 'undefined') return null
    if (this.context?.state === 'closed') {
      this.context = null
      this.busInput = null
      this.busGain = null
      this.crowdGain = null
      this.noiseBuffer = null
    }
    if (!this.context) {
      const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return null
      const context = new AudioCtor()
      this.context = context
      this.buildBus(context)
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    return this.context
  }

  private buildBus(context: AudioContext) {
    const input = context.createGain()
    const highPass = context.createBiquadFilter()
    highPass.type = 'highpass'
    highPass.frequency.value = 68
    const presence = context.createBiquadFilter()
    presence.type = 'peaking'
    presence.frequency.value = 2800
    presence.Q.value = 0.9
    presence.gain.value = 2.2
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.knee.value = 20
    compressor.ratio.value = 3.2
    compressor.attack.value = 0.004
    compressor.release.value = 0.22
    const shaper = context.createWaveShaper()
    shaper.curve = saturationCurve(1.8)
    shaper.oversample = '2x'

    const dry = context.createGain()
    dry.gain.value = 0.96
    const bus = context.createGain()
    bus.gain.value = this.settings.volume

    input.connect(highPass)
    highPass.connect(presence)
    presence.connect(compressor)
    compressor.connect(shaper)
    shaper.connect(dry)
    dry.connect(bus)
    bus.connect(context.destination)

    // A short PA slapback gives DJ KICKIT projection without smearing consonants.
    const delay = context.createDelay(0.5)
    delay.delayTime.value = 0.112
    const feedback = context.createGain()
    feedback.gain.value = 0.11
    const delayWet = context.createGain()
    delayWet.gain.value = 0.17
    shaper.connect(delay)
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(delayWet)
    delayWet.connect(bus)

    // Small arena tail, deliberately short so it cannot cover the next line.
    const reverb = context.createConvolver()
    reverb.buffer = makeImpulse(context, 1.55, 2.4)
    const reverbWet = context.createGain()
    reverbWet.gain.value = 0.105
    shaper.connect(reverb)
    reverb.connect(reverbWet)
    reverbWet.connect(bus)

    const crowd = context.createGain()
    crowd.gain.value = this.paused ? 0 : this.settings.crowdVolume
    crowd.connect(context.destination)

    this.busInput = input
    this.busGain = bus
    this.crowdGain = crowd
    this.noiseBuffer = makeNoiseBuffer(context, 3.5)
  }

  private async loadClip(clip: AnnouncerClip): Promise<AudioBuffer> {
    const cached = this.buffers.get(clip.id)
    if (cached) return cached
    const pending = this.loading.get(clip.id)
    if (pending) return pending
    const context = this.ensureContext()
    if (!context) throw new Error('Web Audio is unavailable.')
    const task = (async () => {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/announcer/${clip.file}`)
      if (!response.ok) throw new Error(`Could not load ${clip.file} (${response.status}).`)
      const data = await response.arrayBuffer()
      const buffer = await context.decodeAudioData(data)
      this.buffers.set(clip.id, buffer)
      this.publish({ loaded: this.buffers.size })
      return buffer
    })()
    this.loading.set(clip.id, task)
    try {
      return await task
    } finally {
      this.loading.delete(clip.id)
    }
  }

  private async preloadAll() {
    if (this.preloadStarted || !this.settings.enabled) return
    this.preloadStarted = true
    const ordered = [...ANNOUNCER_MANIFEST.clips].sort((a, b) => {
      if (a.event === 'battle_start') return -1
      if (b.event === 'battle_start') return 1
      return a.priority - b.priority
    })
    for (const clip of ordered) {
      if (!this.settings.enabled) return
      try {
        await this.loadClip(clip)
      } catch (error) {
        console.warn('[DJ KICKIT]', error)
      }
      await new Promise((resolve) => window.setTimeout(resolve, 45))
    }
  }

  private async playClip(clip: AnnouncerClip, cue: AnnouncerCue, force: boolean, token = ++this.serial) {
    const context = this.ensureContext()
    if (!context || !this.busInput) return false
    if (!force && (!this.settings.enabled || this.paused)) return false
    let buffer: AudioBuffer
    try {
      buffer = await this.loadClip(clip)
    } catch (error) {
      console.warn('[DJ KICKIT]', error)
      return false
    }
    if (token !== this.serial) return false
    if (!force && (!this.settings.enabled || this.paused)) return false
    const targetRank = eventRank(cue.event)
    if (this.current && targetRank <= this.current.rank) return false

    if (this.current) this.stopCurrent(0.075)

    const now = context.currentTime + 0.018
    const source = context.createBufferSource()
    source.buffer = buffer
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(1, now + 0.025)
    source.connect(gain)
    gain.connect(this.busInput)
    source.onended = () => this.finish(token)

    this.current = {
      token,
      clip,
      event: cue.event,
      rank: targetRank,
      source,
      gain,
    }
    this.currentSubtitle = { text: clip.subtitle, clipId: clip.id }
    this.publish({
      speaking: true,
      subtitle: this.settings.subtitles ? this.currentSubtitle : null,
      lastEvent: cue.event,
      lastClipId: clip.id,
    })
    audioEngine.setDucking(true)

    if (!force) {
      const nowMs = Date.now()
      this.lastPlayed.set(clip.id, nowMs)
      this.lastEventAt.set(cue.event, nowMs)
      if (ANNOUNCER_MANIFEST.events[cue.event].once) this.onceEvents.add(cue.event)
      this.history = [...this.history, clip.id].slice(-8)
    }

    source.start(now)
    this.playCrowd(crowdKindFor(cue.event, cue.side).kind, crowdKindFor(cue.event, cue.side).intensity)
    return true
  }

  private finish(token: number) {
    if (this.current?.token !== token) return
    this.current = null
    this.currentSubtitle = null
    this.publish({ speaking: false, subtitle: null })
    audioEngine.setDucking(false)
  }

  private stopCurrent(fade: number) {
    const current = this.current
    if (!current) return
    const context = this.context
    if (!context) return
    const now = context.currentTime
    current.source.onended = null
    current.gain.gain.cancelScheduledValues(now)
    current.gain.gain.setValueAtTime(Math.max(0.0001, current.gain.gain.value), now)
    current.gain.gain.exponentialRampToValueAtTime(0.0001, now + fade)
    try {
      current.source.stop(now + fade + 0.02)
    } catch {
      // The source may already have finished.
    }
    this.current = null
    this.currentSubtitle = null
    this.publish({ speaking: false, subtitle: null })
    audioEngine.setDucking(false)
  }

  private halt() {
    if (this.batchTimer !== null) {
      window.clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    this.batch = []
    this.stopCurrent(0.045)
  }

  previewClip(clipId: string) {
    const clip = ANNOUNCER_MANIFEST.clips.find((entry) => entry.id === clipId)
    if (!clip) return
    void this.playClip(clip, { event: clip.event }, true)
  }

  previewEvent(event: AnnouncerEventName) {
    const candidates = ANNOUNCER_MANIFEST.clips.filter((clip) => clip.event === event)
    if (candidates.length === 0) return
    const clip = candidates[Math.floor(Math.random() * candidates.length)]
    void this.playClip(clip, { event }, true)
  }

  // ---------------------------------------------------------------------------
  // Procedural crowd. Everything is synthesized at runtime from filtered noise,
  // claps and tuning-fork whistles, so the project ships no unlicensed samples.
  // ---------------------------------------------------------------------------

  private playCrowd(kind: CrowdKind, intensity: number) {
    const context = this.context
    const crowd = this.crowdGain
    if (!context || !crowd || this.settings.crowdVolume <= 0.001 || this.paused) return
    const level = Math.max(0.05, Math.min(1, intensity)) * this.settings.crowdVolume
    const start = context.currentTime + 0.14

    if (kind === 'victory') {
      this.crowdCheer(start, 3.4, level, 22)
      this.crowdApplause(start + 0.1, 2.8, level * 0.75)
      this.crowdWhistle(start + 0.3, level)
      this.crowdWhistle(start + 1.4, level * 0.7)
      return
    }

    if (kind === 'big') {
      this.crowdCheer(start, 2.1, level, 13)
      this.crowdApplause(start + 0.04, 1.35, level * 0.55)
      if (level > 0.6) this.crowdWhistle(start + 0.2, level * 0.7)
      return
    }

    if (kind === 'cheer') {
      this.crowdCheer(start, 1.85, level, 7)
      this.crowdApplause(start + 0.05, 0.95, level * 0.3)
      return
    }

    if (kind === 'applause') {
      this.crowdApplause(start, 1.5, level)
      return
    }

    if (kind === 'gasp') {
      this.crowdGasp(start, level)
      return
    }

    if (kind === 'boo') {
      this.crowdBoo(start, level)
      this.crowdGasp(start + 0.05, level * 0.55)
      return
    }

    if (kind === 'murmur') {
      this.crowdMurmur(start, level)
      return
    }

    this.crowdCheer(start, 1.05, level * 0.8, 2)
  }

  private crowdCheer(start: number, duration: number, level: number, claps: number) {
    const context = this.context
    const crowd = this.crowdGain
    if (!context || !crowd) return
    this.crowdLayer(start, duration, 620, 0.7, 0.1 * level, 3.6, 0.045)
    this.crowdLayer(start + 0.05, duration * 0.92, 1650, 0.55, 0.058 * level, 5.1, 0.035)
    for (let index = 0; index < claps; index += 1) {
      this.crowdClap(start + 0.06 + Math.random() * duration * 0.68, 0.028 + Math.random() * 0.03, level)
    }
  }

  private crowdApplause(start: number, duration: number, level: number) {
    const context = this.context
    if (!context) return
    const count = Math.min(30, Math.max(8, Math.round(duration * 11)))
    for (let index = 0; index < count; index += 1) {
      this.crowdClap(start + Math.random() * duration, 0.025 + Math.random() * 0.035, level)
    }
  }

  private crowdLayer(
    start: number,
    duration: number,
    frequency: number,
    q: number,
    peak: number,
    lfoRate: number,
    lfoDepth: number,
  ) {
    const context = this.context
    const crowd = this.crowdGain
    if (!context || !crowd || !this.noiseBuffer) return
    const source = context.createBufferSource()
    source.buffer = this.noiseBuffer
    source.loop = true
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    const mod = context.createGain()
    mod.gain.value = 1
    const env = context.createGain()
    const lfo = context.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = lfoRate
    const lfoGain = context.createGain()
    lfoGain.gain.value = lfoDepth
    lfo.connect(lfoGain)
    lfoGain.connect(mod.gain)
    source.connect(filter)
    filter.connect(mod)
    mod.connect(env)
    env.connect(crowd)
    const t = start
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.18)
    env.gain.setValueAtTime(Math.max(0.0002, peak), t + duration * 0.45)
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    source.start(t, Math.random() * 1.2)
    source.stop(t + duration + 0.03)
    lfo.start(t)
    lfo.stop(t + duration + 0.03)
  }

  private crowdClap(start: number, duration: number, level: number) {
    const context = this.context
    const crowd = this.crowdGain
    if (!context || !crowd || !this.noiseBuffer) return
    const source = context.createBufferSource()
    source.buffer = this.noiseBuffer
    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 1100 + Math.random() * 900
    const env = context.createGain()
    const peak = 0.035 + Math.random() * 0.055
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(peak * level, start + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter)
    filter.connect(env)
    env.connect(crowd)
    source.start(start, Math.random() * 2.2)
    source.stop(start + duration + 0.01)
  }

  private crowdGasp(start: number, level: number) {
    const context = this.context
    const crowd = this.crowdGain
    if (!context || !crowd) return
    this.crowdLayer(start, 0.9, 1150, 0.7, 0.1 * level, 2.2, 0.012)
    this.crowdLayer(start + 0.05, 0.65, 2500, 0.6, 0.055 * level, 2.6, 0.012)
  }

  private crowdBoo(start: number, level: number) {
    const context = this.context
    const crowd = this.crowdGain
    if (!context || !crowd) return
    const t = start
    const env = context.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.018 * level, t + 0.16)
    env.gain.setValueAtTime(0.018 * level, t + 1.15)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.65)
    env.connect(crowd)
    ;[106, 142, 177].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      oscillator.type = index === 2 ? 'triangle' : 'sawtooth'
      oscillator.frequency.value = frequency + Math.random() * 4
      const low = context.createBiquadFilter()
      low.type = 'lowpass'
      low.frequency.value = 460
      const gain = context.createGain()
      gain.gain.value = 0.34 / (index + 1)
      oscillator.connect(low)
      low.connect(gain)
      gain.connect(env)
      oscillator.start(t)
      oscillator.stop(t + 1.7)
    })
    this.crowdLayer(start, 1.6, 360, 0.6, 0.025 * level, 4.2, 0.008)
  }

  private crowdMurmur(start: number, level: number) {
    this.crowdLayer(start, 2.1, 460, 0.55, 0.035 * level, 3.1, 0.014)
    this.crowdLayer(start + 0.2, 1.7, 1250, 0.5, 0.016 * level, 4.4, 0.01)
  }

  private crowdWhistle(start: number, level: number) {
    const context = this.context
    const crowd = this.crowdGain
    if (!context || !crowd) return
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(1450, start)
    oscillator.frequency.exponentialRampToValueAtTime(2240, start + 0.17)
    oscillator.frequency.exponentialRampToValueAtTime(1760, start + 0.48)
    const env = context.createGain()
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(0.012 * level, start + 0.05)
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.54)
    oscillator.connect(env)
    env.connect(crowd)
    oscillator.start(start)
    oscillator.stop(start + 0.58)
  }
}

function saturationCurve(drive: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(2048)
  const normalizer = Math.tanh(drive)
  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1
    curve[index] = Math.tanh(x * drive) / normalizer
  }
  return curve
}

function makeImpulse(context: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds))
  const buffer = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let index = 0; index < length; index += 1) {
      const envelope = Math.pow(1 - index / length, decay)
      data[index] = (Math.random() * 2 - 1) * envelope * 0.55
    }
  }
  return buffer
}

function makeNoiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds))
  const buffer = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    let last = 0
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1
      last = last * 0.22 + white * 0.78
      data[index] = last
    }
  }
  return buffer
}

export const announcerEngine = new AnnouncerEngine()

export function useAnnouncerSnapshot() {
  return useSyncExternalStore(
    announcerEngine.subscribe,
    announcerEngine.getSnapshot,
    announcerEngine.getSnapshot,
  )
}
