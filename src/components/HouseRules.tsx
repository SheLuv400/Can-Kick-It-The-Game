import { useEffect, useState } from 'react'
import {
  BATTLE_FORMATS,
  HOUSE_MODIFIERS,
  HOUSE_RULE_PRESETS,
  SHUFFLE_CHAOS,
  battleFormatById,
  canAddHouseModifier,
  houseModifierById,
  houseRulesSummary,
  houseRulesTitle,
  type BattleFormatDefinition,
  type BattleFormatId,
  type HouseModifierId,
  type HouseRulePreset,
  type HouseRulesConfig,
  type ShuffleChaos,
} from '../game/house-rules'
import type { RoomSeat } from '../online/protocol'

const MODIFIER_GLYPHS: Record<HouseModifierId, string> = {
  'hype-surge': '▲',
  'crate-frenzy': '▦',
  'double-time-delivery': '⏱',
  'big-stage': '◉',
  'golden-hooks': '✦',
  'sharp-pen-showcase': '✒',
  'backstage-bounce': '↺',
  'encore-spotlight': '♫',
  'last-verse-standing': '☗',
  'crate-lockdown': '▣',
}

function FormatRoomPreview({ format }: { format: BattleFormatDefinition }) {
  const seats = Array.from({ length: format.players }, (_, index) => index)
  const isTeams = format.id === '2v2'
  const isFatal = format.id === 'fatal-4'
  const isTriple = format.id === 'triple-threat'
  const seatLabel = (index: number) =>
    index === 0
      ? 'HOST'
      : format.id === 'triple-threat'
        ? `GUEST ${index}`
        : index === 1
          ? 'GUEST'
          : `OPEN SLOT ${index - 1}`

  return (
    <div className={`format-stage format-stage--${format.id} ${format.enabled ? 'is-live' : 'is-locked'}`}>
      <div className="format-stage__top">
        <span className="format-stage__eyebrow">ROOM PREVIEW · {format.shortName}</span>
        <b>{format.name}</b>
        <i>{format.subtitle}</i>
      </div>

      <div className={`format-stage__room ${isTeams ? 'is-teams' : isTriple ? 'is-triple' : isFatal ? 'is-fatal' : 'is-solo'}`}>
        {isTeams ? (
          <>
            <div className="format-team format-team--you">
              <span className="format-team__tag">YOUR SIDE</span>
              <div className="format-team__seats">
                {seats.slice(0, 2).map((index) => (
                  <span key={index} className={`format-pod ${index === 0 ? 'is-host' : 'is-open'}`}>
                    <i aria-hidden="true">{index === 0 ? '★' : '＋'}</i>
                    <b>{seatLabel(index)}</b>
                    <em>{index === 0 ? 'YOU' : 'TAG PARTNER'}</em>
                  </span>
                ))}
              </div>
              <div className="format-crowd"><span />SHARED CROWD · YOUR TEAM</div>
            </div>
            <div className="format-stage__versus">VS</div>
            <div className="format-team format-team--rival">
              <span className="format-team__tag">THE OTHER SIDE</span>
              <div className="format-team__seats">
                {seats.slice(2, 4).map((index) => (
                  <span key={index} className={`format-pod ${index === 2 ? 'is-guest' : 'is-open'}`}>
                    <i aria-hidden="true">{index === 2 ? '◈' : '＋'}</i>
                    <b>{index === 2 ? 'GUEST' : seatLabel(index)}</b>
                    <em>{index === 2 ? 'CHALLENGER' : 'TAG PARTNER'}</em>
                  </span>
                ))}
              </div>
              <div className="format-crowd format-crowd--rival"><span />SHARED CROWD · THEIR TEAM</div>
            </div>
          </>
        ) : (
          <div className="format-stage__pods">
            {seats.map((index) => (
              <span
                key={index}
                className={`format-pod ${index === 0 ? 'is-host' : index === 1 ? 'is-guest' : 'is-open'}`}
              >
                <i aria-hidden="true">{index === 0 ? '★' : index === 1 ? '◈' : '＋'}</i>
                <b>{seatLabel(index)}</b>
                <em>{index === 0 ? 'YOUR MIC' : index === 1 ? 'CHALLENGER' : 'OPEN MIC'}</em>
              </span>
            ))}
            <div className="format-stage__center">
              <span>{isTriple ? 'THREE MICS' : isFatal ? 'FOUR CORNERS' : 'MAIN EVENT'}</span>
              <b>{format.enabled ? 'LIVE ROOM' : 'ENGINE LOCKED'}</b>
              <div className="format-crowd"><span /></div>
            </div>
          </div>
        )}
      </div>

      <div className="format-stage__foot">
        <span>{format.players} PLAYER ROOM</span>
        <span>{format.teams === 2 ? 'TEAM CROWD' : 'ONE CROWN'}</span>
        <em>{format.enabled ? 'PLAYABLE IN THIS BUILD' : 'UI PREVIEW · LIVE PLAY LOCKED'}</em>
      </div>
      {!format.enabled && <p className="format-stage__reason">{format.unavailableReason}</p>}
    </div>
  )
}

interface HouseRulesPanelProps {
  rules: HouseRulesConfig
  isHost: boolean
  seat: RoomSeat
  accepted: RoomSeat[]
  ready: RoomSeat[]
  seatNames?: Partial<Record<RoomSeat, string>>
  canStart: boolean
  festivalLocked?: boolean
  onPreset: (preset: HouseRulePreset) => void
  onFormat: (format: BattleFormatId) => void
  onChaos: (chaos: ShuffleChaos) => void
  onToggle: (id: HouseModifierId) => void
  onRandomize: () => void
  onReady: (ready: boolean) => void
  onStart: () => void
}

export function HouseRulesPanel({
  rules,
  isHost,
  seat,
  accepted,
  ready,
  seatNames = {},
  canStart,
  festivalLocked = false,
  onPreset,
  onFormat,
  onChaos,
  onToggle,
  onRandomize,
  onReady,
  onStart,
}: HouseRulesPanelProps) {
  const localReady = ready.includes(seat)
  const opponentSeat: RoomSeat = seat === 'host' ? 'guest' : 'host'
  const readinessSeats: RoomSeat[] = rules.format === '2v2'
    ? ['host', 'guest', 'guest-2', 'guest-3']
    : rules.format === 'triple-threat'
      ? ['host', 'guest', 'guest-2']
      : [seat, opponentSeat]
  const seatLabelFor = (entry: RoomSeat) => {
    if (entry === seat) return 'YOU'
    if (rules.format === '2v2') {
      if (entry === 'host') return 'TEAM A · HOST'
      if (entry === 'guest') return 'TEAM A · PARTNER'
      if (entry === 'guest-2') return 'TEAM B · HOST'
      return 'TEAM B · PARTNER'
    }
    if (rules.format === 'triple-threat') {
      if (entry === 'host') return 'HOST'
      if (entry === 'guest') return 'GUEST 1'
      return 'GUEST 2'
    }
    return isHost ? 'GUEST' : 'HOST'
  }
  const locked = festivalLocked
  const canEdit = isHost && !locked
  const selectedFormat = battleFormatById(rules.format)
  const [formatPreview, setFormatPreview] = useState<BattleFormatId | null>(null)
  const previewFormat = battleFormatById(formatPreview ?? rules.format)
  const previewingLocked = previewFormat.id !== rules.format && !previewFormat.enabled

  useEffect(() => {
    setFormatPreview(null)
  }, [rules.format, rules.preset, rules.modifiers.join('|')])

  return (
    <section className="house-rules" aria-label="DJ's House Rules">
      <header className="house-rules__head">
        <div>
          <span className="online-panel__kicker">DJ&apos;S HOUSE RULES · {selectedFormat.shortName}</span>
          <h3>{houseRulesTitle(rules)}</h3>
          <p>{houseRulesSummary(rules)}</p>
        </div>
        <span className={`house-rules__revision ${locked ? 'is-locked' : ''}`}>
          {locked ? 'FESTIVAL LOCKED' : `ROOM CONFIG ${String(rules.modifiers.length)}/${rules.preset === 'shuffle' ? SHUFFLE_CHAOS.find((entry) => entry.id === rules.chaos)?.count : 3}`}
        </span>
      </header>

      {!locked && (
        <div className="house-rules__presets" role="group" aria-label="Rule preset">
          {HOUSE_RULE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`house-preset ${rules.preset === preset.id ? 'is-active' : ''}`}
              onClick={() => onPreset(preset.id)}
              disabled={!canEdit}
              aria-pressed={rules.preset === preset.id}
            >
              <b>{preset.name}</b>
              <i>{preset.tag}</i>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      )}

      <div className="house-rules__grid">
        <div className="house-rules__block">
          <span className="house-rules__label">BATTLE FORMAT</span>
          <div className="house-formats" role="group" aria-label="Battle format">
            {BATTLE_FORMATS.map((format) => (
              <button
                key={format.id}
                type="button"
                className={`house-format ${rules.format === format.id ? 'is-active' : ''} ${previewFormat.id === format.id && rules.format !== format.id ? 'is-preview' : ''} ${format.enabled ? '' : 'is-locked'}`}
                onClick={() => {
                  setFormatPreview(format.id)
                  if (canEdit && format.enabled && rules.format !== format.id) onFormat(format.id)
                }}
                title={format.enabled ? `Preview ${format.name}` : format.unavailableReason}
                aria-pressed={rules.format === format.id}
              >
                <b>{format.shortName}</b>
                <span>{format.name}</span>
                <i>{format.enabled ? format.subtitle : format.unavailableReason}</i>
              </button>
            ))}
          </div>
          <FormatRoomPreview format={previewFormat} />
        </div>

        <div className="house-rules__block">
          <span className="house-rules__label">
            {rules.preset === 'shuffle' ? 'SHUFFLE SETTINGS' : 'ACTIVE MODIFIERS'}
          </span>
          {rules.preset === 'shuffle' ? (
            <div className="house-chaos" role="group" aria-label="Shuffle chaos">
              {SHUFFLE_CHAOS.map((chaos) => (
                <button
                  key={chaos.id}
                  type="button"
                  className={`house-chaos__btn ${rules.chaos === chaos.id ? 'is-active' : ''}`}
                  onClick={() => onChaos(chaos.id)}
                  disabled={!canEdit}
                  aria-pressed={rules.chaos === chaos.id}
                >
                  <b>{chaos.name}</b>
                  <i>{chaos.tag}</i>
                </button>
              ))}
              {canEdit && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={onRandomize}>
                  RANDOMIZE RULES
                </button>
              )}
            </div>
          ) : rules.preset === 'standard' ? (
            <div className="house-empty">
              <b>OFFICIAL RULES ONLY</b>
              <span>No optional modifiers. Existing attack limits, Hype, Crate, Encore, Backstage, damage and victory rules are unchanged.</span>
            </div>
          ) : (
            <div className="house-modifiers" role="group" aria-label="Custom modifiers">
              {HOUSE_MODIFIERS.map((modifier) => {
                const active = rules.modifiers.includes(modifier.id)
                const blocked = !active && !canAddHouseModifier(modifier.id, rules.modifiers, rules.format)
                return (
                  <button
                    key={modifier.id}
                    type="button"
                    className={`house-mod ${active ? 'is-active' : ''} ${blocked || !modifier.enabled ? 'is-blocked' : ''}`}
                    onClick={() => onToggle(modifier.id)}
                    disabled={!canEdit || (!active && (blocked || !modifier.enabled))}
                    title={modifier.enabled ? modifier.description : modifier.unavailableReason}
                    aria-pressed={active}
                  >
                    <span className="house-mod__icon" aria-hidden="true">{MODIFIER_GLYPHS[modifier.id]}</span>
                    <span className="house-mod__copy">
                      <b>{modifier.name}</b>
                      <i>{modifier.enabled ? modifier.description : modifier.unavailableReason}</i>
                    </span>
                    <em>{active ? 'ON' : modifier.enabled ? 'ADD' : 'LOCKED'}</em>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {rules.preset !== 'standard' && rules.modifiers.length > 0 && (
        <div className="house-rules__preview" aria-label="Rules preview">
          <span>PREVIEW · LOCKED WHEN THE SHOW STARTS</span>
          <div>
            {rules.modifiers.map((id) => {
              const modifier = houseModifierById(id)
              return (
                <span key={id} className="house-preview-chip">
                  <i aria-hidden="true">{MODIFIER_GLYPHS[id]}</i> {modifier.name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <footer className="house-rules__footer">
        <div className="house-ready">
          {readinessSeats.map((entry) => {
            const seatReady = ready.includes(entry)
            const seatAccepted = accepted.includes(entry)
            return (
              <span key={entry} className={seatReady ? 'is-ready' : ''}>
                <i /> {seatNames[entry] ?? seatLabelFor(entry)} · {seatReady ? 'READY' : seatAccepted ? 'ACCEPTED' : 'WAITING'}
              </span>
            )
          })}
        </div>
        <div className="house-rules__actions">
          <button
            type="button"
            className={`btn ${localReady ? 'btn--ghost' : 'btn--primary'} btn--sm`}
            onClick={() => onReady(!localReady)}
          >
            {localReady ? 'CLEAR READY' : 'ACCEPT RULES · READY'}
          </button>
          {isHost && (
            <button type="button" className="btn btn--primary" onClick={onStart} disabled={!canStart || previewingLocked}>
              {previewingLocked ? 'PREVIEW ONLY · LIVE FORMAT LOCKED' : 'START MATCH'}
            </button>
          )}
        </div>
      </footer>
    </section>
  )
}
