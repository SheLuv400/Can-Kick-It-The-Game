import { emptyPlayerStats, type PlayerStats } from '../account/account'

export interface BillboardBreakdown {
  battle: number
  badges: number
  roster: number
  label: number
  charts: number
  total: number
}

/**
 * The Billboard rewards the whole grind, not just one win column. Badge tiers
 * and lifetime badge XP carry the artist work; label score and chart heat carry
 * the owner work; wins, KOs and streaks carry the stage work.
 */
export function billboardBreakdown(stats: PlayerStats): BillboardBreakdown {
  const battle = stats.wins * 150 + stats.kos * 9 + stats.bestStreak * 20
  const badges = stats.badgeTiers * 115 + Math.floor(stats.badgeXp / 140)
  const roster = stats.artistLevels * 9
  const label = stats.labelScore * 7
  const charts = stats.chartHeat * 5
  return {
    battle,
    badges,
    roster,
    label,
    charts,
    total: battle + badges + roster + label + charts,
  }
}

export function billboardScore(stats: PlayerStats): number {
  return billboardBreakdown(stats).total
}

export function localBillboardStats(
  base: PlayerStats | null,
  input: {
    badgeXp: number
    badgeTiers: number
    artistLevels: number
    labelScore: number
    chartHeat: number
    wins: number
    losses: number
  },
): PlayerStats {
  const stats = base ?? emptyPlayerStats()
  return {
    ...stats,
    wins: Math.max(stats.wins, input.wins),
    losses: Math.max(stats.losses, input.losses),
    badgeXp: input.badgeXp,
    badgeTiers: input.badgeTiers,
    artistLevels: input.artistLevels,
    labelScore: input.labelScore,
    chartHeat: input.chartHeat,
  }
}
