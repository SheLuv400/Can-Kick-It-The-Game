import { useEffect, type CSSProperties } from 'react'
import {
  BADGE_BY_ID,
  BADGE_TIER_META,
  badgeTierPower,
  type BadgeUnlockNotice,
} from '../game/badges'
import { getArtist } from '../game/roster'

interface BadgeUnlockToastProps {
  notices: BadgeUnlockNotice[]
  onDismiss: (id: string) => void
}

export function BadgeUnlockToast({ notices, onDismiss }: BadgeUnlockToastProps) {
  useEffect(() => {
    if (notices.length === 0) return
    const timers = notices.map((notice) =>
      window.setTimeout(() => onDismiss(notice.id), 7_000),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [notices, onDismiss])

  if (notices.length === 0) return null

  return (
    <div className="badge-unlock-stack" aria-live="polite" aria-label="Badge progression">
      {notices.map((notice) => {
        const badge = BADGE_BY_ID.get(notice.badgeId)
        const artist = getArtist(notice.artistId)
        const tier = BADGE_TIER_META[notice.tier]
        if (!badge || !artist) return null
        return (
          <div
            className="badge-unlock"
            key={notice.id}
            style={
              {
                '--badge-accent': badge.accent,
                '--tier-color': tier.color,
                '--tier-glow': tier.glow,
              } as CSSProperties
            }
          >
            <span className="badge-unlock__glow" aria-hidden="true" />
            <span className="badge-unlock__icon">{badge.icon}</span>
            <div>
              <span>NEW BADGE TIER · {artist.name}</span>
              <b>
                {badge.name} <em>{tier.label}</em>
              </b>
              <p>{badge.effect(badgeTierPower(notice.tier))}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
