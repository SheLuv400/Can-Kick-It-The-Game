import { CAREER_PRESET_ART } from '../game/career-preset-art'
import { careerPreset } from '../game/career-presets'

export type CareerPresetArtMode = 'full' | 'card' | 'thumb'

export function CareerPresetArt({
  presetId,
  mode = 'card',
  className = '',
}: {
  presetId: string
  mode?: CareerPresetArtMode
  className?: string
}) {
  const preset = careerPreset(presetId)
  const sources = CAREER_PRESET_ART[preset.id]

  return (
    <span
      className={`career-preset-art career-preset-art--${mode} ${className}`}
      data-preset={preset.id}
    >
      <img
        src={mode === 'card' ? sources.card : sources.full}
        alt={`${preset.label} artist model`}
        draggable={false}
        decoding="async"
        loading={mode === 'thumb' ? 'lazy' : 'eager'}
      />
    </span>
  )
}
