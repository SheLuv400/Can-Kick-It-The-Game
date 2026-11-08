import type { CSSProperties } from 'react'
import { audioEngine } from '../game/audio'

interface VolumeSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  previewSfx?: boolean
  compact?: boolean
}

export function VolumeSlider({
  label,
  value,
  onChange,
  previewSfx = false,
  compact = false,
}: VolumeSliderProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <label className={`volume-slider ${compact ? 'is-compact' : ''}`}>
      <span className="volume-slider__head">
        <b>{label}</b>
        <em>{percent === 0 ? 'MUTED' : `${percent}%`}</em>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={percent}
        aria-label={`${label.toLowerCase()} volume`}
        style={{ '--fill': `${percent}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        onPointerUp={previewSfx ? () => audioEngine.playSfx('click') : undefined}
      />
    </label>
  )
}
