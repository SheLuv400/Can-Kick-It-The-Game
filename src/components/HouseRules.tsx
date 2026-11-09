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
import { roomSeatName, roomTeam, type RoomSeat, type RoomTeam } from '../online/protocol'
import mode1v1Art from '../assets/mode-previews/1v1.webp'
import mode2v2Art from '../assets/mode-previews/2v2.webp'
import modeTripleArt from '../assets/mode-previews/triple-threat.webp'
import modeFatal4Art from '../assets/mode-previews/fatal-4.webp'

const FORMAT_ART: Record<BattleFormatId, string> = {
  '1v1': mode1v1Art,
  '2v2': mode2v2Art,
  'triple-threat': modeTripleArt,
  'fatal-4': modeFatal4Art,
}

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
  return (
    <div className={`format-stage format-stage--${format.id} ${format.enabled ? 'is-live' : 'is-locked'}`}>
      <div className="format-stage__screen">
        <img
          className="format-stage__image"
          src={FORMAT_ART[format.id]}
          alt={`Live gameplay from a ${format.name} match`}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="format-stage__scrim" aria-hidden="true" />
        <span className={`format-stage__badge ${format.enabled ? 'is-live' : ''}`}>
          <i /> {format.enabled ? 'LIVE GAMEPLAY' : 'PREVIEW LOCKED'}
        </span>
        <span className="format-stage__count">
          {format.players === 2 ? '1V1' : `${format.players} PLAYERS`}
        </span>
        <div className="format-stage__caption">
          <span>ROOM PREVIEW · {format.shortName}</span>
          <b>{format.name}</b>
          <i>{format.subtitle}</i>
        </div>
      </div>

      <div className="format-stage__foot">
        <span>{format.players} PLAYER ROOM</span>
        <span>{format.teams === 2 ? 'TAG-TEAM CROWD' : 'ONE CROWN'}</span>
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
  seatTeams?: Partial<Record<RoomSeat, RoomTeam>>
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
  seatTeams = {},
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
      : rules.format === 'fatal-4'
        ? ['host', 'guest', 'guest-2', 'guest-3']
        : [seat, opponentSeat]
  const seatLabelFor = (entry: RoomSeat) => {
    if (entry === seat) return 'YOU'
    if (rules.format === '2v2') {
      const team = roomTeam(entry, seatTeams) === 'player' ? 'TEAM A' : 'TEAM B'
      return `${team} · ${entry === 'host' ? 'HOST' : 'PARTNER'}`
    }
    if (rules.format === 'triple-threat') {
      if (entry === 'host') return 'HOST'
      if (entry === 'guest') return 'GUEST 1'
      return 'GUEST 2'
    }
    if (rules.format === 'fatal-4') {
      if (entry === 'host') return 'HOST'
      if (entry === 'guest') return 'GUEST 1'
      if (entry === 'guest-2') return 'GUEST 2'
      return 'GUEST 3'
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
                <i />{' '}
                {rules.format === '2v2'
                  ? `${roomTeam(entry, seatTeams) === 'player' ? 'TEAM A' : 'TEAM B'} · ${seatNames[entry] ?? roomSeatName(entry)}`
                  : seatNames[entry] ?? seatLabelFor(entry)}{' '}
                · {seatReady ? 'READY' : seatAccepted ? 'ACCEPTED' : 'WAITING'}
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
