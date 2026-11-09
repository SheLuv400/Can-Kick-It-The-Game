import { useMemo, useState, type CSSProperties } from 'react'
import type { Artist, ArtistProgress } from '../game/types'
import {
  BADGE_CATALOG,
  BADGE_MAX_EQUIPPED,
  BADGE_TIER_META,
  BADGE_TIER_ORDER,
  BADGE_TIER_THRESHOLDS,
  badgeEffectText,
  badgeNextTier,
  badgeProgressRatio,
  badgeTierPower,
  emptyBadgeProgress,
  normalizeBadgeRecords,
  sanitizeBadgeLoadout,
  type BadgeDefinition,
  type BadgeTierState,
} from '../game/badges'

interface BadgeLoadoutProps {
  artist: Artist
  progress: ArtistProgress
  onChange: (badgeLoadout: string[]) => void
  onClose: () => void
}

function tierOf(records: Record<string, ReturnType<typeof emptyBadgeProgress>>, id: string): BadgeTierState {
  return records[id]?.tier ?? 'locked'
}

function tierLabel(tier: BadgeTierState): string {
  return BADGE_TIER_META[tier].label
}

function thresholdText(tier: BadgeTierState): string {
  if (tier === 'diamond') return 'MAX TIER'
  return `${BADGE_TIER_THRESHOLDS[tier].toLocaleString()} XP TO ${tierLabel(badgeNextTier(tier))}`
}

export function BadgeLoadout({ artist, progress, onChange, onClose }: BadgeLoadoutProps) {
  const records = useMemo(() => normalizeBadgeRecords(progress.badges), [progress.badges])
  const equipped = useMemo(
    () => sanitizeBadgeLoadout(progress.badgeLoadout, records),
    [progress.badgeLoadout, records],
  )
  const [notice, setNotice] = useState('')
  const unlocked = BADGE_CATALOG.filter((badge) => tierOf(records, badge.id) !== 'locked').length
  const tiers = BADGE_CATALOG.reduce(
    (sum, badge) => sum + badgeTierPower(tierOf(records, badge.id)),
    0,
  )
  const totalXp = Object.values(records).reduce((sum, record) => sum + record.totalXp, 0)

  const toggle = (badge: BadgeDefinition) => {
    const tier = tierOf(records, badge.id)
    if (tier === 'locked') {
      setNotice(`${badge.name} IS LOCKED · ${badge.requirement.toUpperCase()} TO EARN MATCHING XP.`)
      return
    }
    if (equipped.includes(badge.id)) {
      onChange(equipped.filter((id) => id !== badge.id))
      setNotice(`${badge.name} REMOVED · ${equipped.length - 1}/${BADGE_MAX_EQUIPPED} SLOTS USED`)
      return
    }
    if (equipped.length >= BADGE_MAX_EQUIPPED) {
      setNotice('FIVE BADGES IS THE LIMIT · TAKE ONE OFF BEFORE EQUIPPING ANOTHER.')
      return
    }
    onChange([...equipped, badge.id])
    setNotice(`${badge.name} EQUIPPED · ${equipped.length + 1}/${BADGE_MAX_EQUIPPED} SLOTS USED`)
  }

  return (
    <div className="modal badge-modal" role="dialog" aria-modal="true" aria-label={`${artist.name} badges`}>
      <button className="modal__scrim" onClick={onClose} aria-label="Close badges" />
      <div className="modal__panel badge-panel">
        <header className="modal__head badge-panel__head">
          <div>
            <span className="kicker">BADGE PROGRAM · {artist.name}</span>
            <h2>BUILD A MONSTER</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close badges">
            ✕
          </button>
        </header>

        <section className="badge-hero">
          <div className="badge-hero__mark" style={{ '--badge-accent': artist.palette.accent } as CSSProperties}>
            <span>{artist.slot}</span>
            <small>BADGE</small>
          </div>
          <div className="badge-hero__copy">
            <span className="badge-eyebrow">TEN PROGRAMS · FIVE SLOTS · ZERO SHORTCUTS</span>
            <p>
              Every badge levels on its own actions. Earn the first tier, then keep grinding the
              same program through <b>Plastic → Bronze → Gold → Platinum → Diamond</b>. Only five
              can make the set.
            </p>
          </div>
          <div className="badge-hero__score">
            <span>SET POWER</span>
            <b>{equipped.length}<i>/5</i></b>
            <em>{unlocked}/10 UNLOCKED · {tiers} TIERS</em>
          </div>
        </section>

        <section className="badge-slots" aria-label="Equipped badges">
          <div className="badge-section-head">
            <span>YOUR FIVE</span>
            <i>{equipped.length}/{BADGE_MAX_EQUIPPED} EQUIPPED · {totalXp.toLocaleString()} LIFETIME XP</i>
          </div>
          <div className="badge-slot-row">
            {Array.from({ length: BADGE_MAX_EQUIPPED }, (_, index) => {
              const id = equipped[index]
              const badge = BADGE_CATALOG.find((entry) => entry.id === id)
              const tier = id ? tierOf(records, id) : 'locked'
              if (!badge || !id) {
                return (
                  <div className="badge-slot is-empty" key={`empty-${index}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <b>OPEN SLOT</b>
                    <i>EQUIP A BADGE</i>
                  </div>
                )
              }
              return (
                <button
                  className="badge-slot is-filled"
                  key={id}
                  onClick={() => toggle(badge)}
                  title={`Unequip ${badge.name}`}
                  style={
                    {
                      '--badge-accent': badge.accent,
                      '--tier-color': BADGE_TIER_META[tier].color,
                    } as CSSProperties
                  }
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <b>{badge.icon} {badge.name}</b>
                  <i>{tierLabel(tier)} · TAP TO REMOVE</i>
                </button>
              )
            })}
          </div>
        </section>

        <section className="badge-legend" aria-label="Badge tiers">
          {BADGE_TIER_ORDER.map((tier, index) => (
            <div
              className={`badge-legend__item badge-legend__item--${tier}`}
              key={tier}
              style={{ '--tier-color': BADGE_TIER_META[tier].color } as CSSProperties}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <b>{BADGE_TIER_META[tier].label}</b>
              <i>{BADGE_TIER_THRESHOLDS[index === 0 ? 'locked' : BADGE_TIER_ORDER[index - 1]].toLocaleString()} XP</i>
            </div>
          ))}
          <p>
            Each tier is its own grind. XP resets when you clear a tier; the next one asks for more.
          </p>
        </section>

        <section className="badge-catalog" aria-label="Badge catalog">
          <div className="badge-section-head">
            <span>THE TEN</span>
            <i>TAP AN UNLOCKED BADGE TO EQUIP · TAP AN EQUIPPED BADGE TO REMOVE</i>
          </div>
          <div className="badge-grid">
            {BADGE_CATALOG.map((badge) => {
              const tier = tierOf(records, badge.id)
              const record = records[badge.id] ?? emptyBadgeProgress()
              const isEquipped = equipped.includes(badge.id)
              const ratio = badgeProgressRatio(record)
              const next = badgeNextTier(tier)
              return (
                <button
                  className={`badge-card badge-card--${tier} ${isEquipped ? 'is-equipped' : ''}`}
                  key={badge.id}
                  onClick={() => toggle(badge)}
                  aria-pressed={isEquipped}
                  style={
                    {
                      '--badge-accent': badge.accent,
                      '--tier-color': BADGE_TIER_META[tier].color,
                      '--tier-glow': BADGE_TIER_META[tier].glow,
                    } as CSSProperties
                  }
                >
                  <span className="badge-card__ambient" aria-hidden="true" />
                  <span className="badge-card__top">
                    <span className="badge-card__tag">{badge.tag}</span>
                    <span className="badge-card__tier">{tierLabel(tier)}</span>
                  </span>
                  <span className="badge-card__icon">{badge.icon}</span>
                  <b className="badge-card__name">{badge.name}</b>
                  <span className="badge-card__action">{badge.action}</span>
                  <span className="badge-card__effect">{badgeEffectText(badge.id, tier)}</span>
                  <span className="badge-card__progress">
                    <i style={{ width: `${Math.round(ratio * 100)}%` }} />
                  </span>
                  <span className="badge-card__meta">
                    {tier === 'diamond'
                      ? 'MAXED · DIAMOND'
                      : tier === 'locked'
                        ? `LOCKED · ${BADGE_TIER_THRESHOLDS.locked.toLocaleString()} XP`
                        : `${record.xp.toLocaleString()} / ${BADGE_TIER_THRESHOLDS[tier].toLocaleString()} XP`}
                  </span>
                  <span className="badge-card__next">
                    {tier === 'diamond' ? 'DIAMOND COMPLETE' : thresholdText(tier)}
                  </span>
                  <span className="badge-card__dots" aria-hidden="true">
                    {BADGE_TIER_ORDER.map((step) => (
                      <i
                        className={BADGE_TIER_ORDER.indexOf(step) < badgeTierPower(tier) ? 'is-lit' : ''}
                        key={step}
                      />
                    ))}
                  </span>
                  <span className="badge-card__cta">
                    {isEquipped ? 'EQUIPPED · TAP TO REMOVE' : tier === 'locked' ? `${badge.requirement.toUpperCase()} TO UNLOCK` : 'TAP TO EQUIP'}
                  </span>
                  {next === 'diamond' && tier === 'platinum' && (
                    <span className="badge-card__max">DIAMOND IN SIGHT</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <footer className="badge-panel__foot">
          <p>
            Badge effects apply in <b>solo and ranked</b> play. Casual rooms strip custom levels,
            loadouts and badges to keep the stage even.
          </p>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            BACK TO {artist.name}
          </button>
        </footer>
      </div>
      {notice && (
        <div className="badge-notice badge-notice--toast" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss badge notice">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
