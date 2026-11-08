import { useEffect, useState } from 'react'
import {
  careerPreset,
  careerPresetsFor,
  type CareerPresetCategory,
  type CareerPresetId,
} from '../game/career-presets'
import { CareerPresetArt } from './CareerPresetArt'

export function CareerPresetPicker({
  value,
  onChange,
  compact = false,
}: {
  value: CareerPresetId
  onChange: (id: CareerPresetId) => void
  compact?: boolean
}) {
  const selected = careerPreset(value)
  const [category, setCategory] = useState<CareerPresetCategory>(selected.category)

  useEffect(() => {
    setCategory(careerPreset(value).category)
  }, [value])

  const presets = careerPresetsFor(category)

  return (
    <section className={`career-preset-picker ${compact ? 'is-compact' : ''}`}>
      <header className="career-preset-picker__head">
        <div>
          <span>SELECT YOUR ARTIST MODEL</span>
          <b>12/12 BUILT-IN MODELS</b>
        </div>
      </header>

      <div className="career-preset-tabs" role="tablist" aria-label="Artist model category">
        {(['male', 'female'] as CareerPresetCategory[]).map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={category === item}
            className={category === item ? 'is-on' : ''}
            onClick={() => setCategory(item)}
          >
            {item === 'male' ? 'MALE ARTISTS' : 'FEMALE ARTISTS'}
            <i>6/6</i>
          </button>
        ))}
      </div>

      <div className="career-preset-grid" role="tabpanel">
        {presets.map((preset) => {
          const active = value === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              className={`career-model-card ${active ? 'is-on' : ''} is-ready`}
              onClick={() => onChange(preset.id)}
              aria-pressed={active}
              aria-label={`Select ${preset.label}`}
            >
              <span className="career-model-card__art">
                <CareerPresetArt presetId={preset.id} mode="thumb" />
                <i aria-hidden="true">{String(preset.number).padStart(2, '0')}</i>
              </span>
              <b>{preset.label}</b>
              <em>READY</em>
            </button>
          )
        })}
      </div>
    </section>
  )
}
