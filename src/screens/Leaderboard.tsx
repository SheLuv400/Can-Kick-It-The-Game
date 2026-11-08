import { useMemo, useState, type CSSProperties } from 'react'
import type { ChartState } from '../game/charts'
import type { LabelState } from '../game/label'
import type { Settings } from '../game/types'
import { emptyPlayerStats, type PlayerStats } from '../account/account'
import { useAccount } from '../account/AccountProvider'
import { useSocial } from '../account/SocialProvider'
import { badgeProgramSummary } from '../game/badges'
import { loadLeaderboard, summarize } from '../online/leaderboard'
import { billboardBreakdown, billboardScore, localBillboardStats } from '../online/billboard'

interface LeaderboardProps {
  settings: Settings
  label: LabelState
  charts: ChartState
  onBack: () => void
}

type BoardTab = 'billboard' | 'rooms'

interface BoardEntry {
  key: string
  name: string
  stats: PlayerStats
  isYou: boolean
  code: string
  status: 'you' | 'online' | 'playing' | 'offline'
}

function rankLabel(index: number) {
  if (index === 0) return '♛'
  return String(index + 1).padStart(2, '0')
}

function statusLabel(entry: BoardEntry) {
  if (entry.isYou) return 'YOU · LOCAL FORM'
  if (entry.status === 'playing') return 'IN A MATCH · LAST SYNC'
  if (entry.status === 'online') return 'ONLINE · LIVE FORM'
  return 'OFFLINE · LAST SYNC'
}

export function Leaderboard({ settings, label, charts, onBack }: LeaderboardProps) {
  const { account } = useAccount()
  const { friends } = useSocial()
  const [tab, setTab] = useState<BoardTab>('billboard')
  const rooms = useMemo(() => loadLeaderboard(), [])
  const roomSummary = summarize(rooms, account?.username ?? settings.team.labelName)

  const local = useMemo(() => {
    const badgeSummary = badgeProgramSummary(settings.artistProgress)
    const artistLevels = Object.values(settings.artistProgress).reduce(
      (sum, entry) => sum + Math.max(1, entry.level),
      0,
    )
    const chartHeat = charts.entries.length
      ? Math.round(
          charts.entries.reduce((sum, entry) => sum + entry.popularity, 0) /
            charts.entries.length,
        )
      : 0
    const labelScore =
      label.reputation +
      label.signed.length * 25 +
      label.albums.filter((album) => album.status === 'RELEASED').length * 40
    return {
      badgeXp: badgeSummary.totalXp,
      badgeTiers: badgeSummary.tiers,
      artistLevels,
      labelScore,
      chartHeat,
    }
  }, [settings.artistProgress, charts.entries, label])

  const selfName = account?.username ?? settings.team.labelName
  const selfStats = useMemo(
    () =>
      localBillboardStats(account?.stats ?? null, {
        ...local,
        wins: settings.wins,
        losses: settings.losses,
      }),
    [account?.stats, local, settings.wins, settings.losses],
  )

  const board = useMemo<BoardEntry[]>(() => {
    const entries: BoardEntry[] = [
      {
        key: 'you',
        name: selfName,
        stats: selfStats,
        isYou: true,
        code: account?.friendCode ?? 'LOCAL',
        status: 'you',
      },
      ...friends.map((friend) => ({
        key: friend.code,
        name: friend.name,
        stats: friend.stats,
        isYou: false,
        code: friend.code,
        status: friend.status,
      })),
    ]
    return entries.sort((a, b) => {
      const score = billboardScore(b.stats) - billboardScore(a.stats)
      return score || b.stats.wins - a.stats.wins || a.name.localeCompare(b.name)
    })
  }, [selfName, selfStats, account?.friendCode, friends])

  const yourRank = Math.max(0, board.findIndex((entry) => entry.isYou))
  const yourScore = billboardScore(selfStats)
  const leader = billboardScore(board[0]?.stats ?? emptyPlayerStats())
  const gap = yourRank === 0 ? 0 : leader - yourScore
  const rankedRooms = useMemo(
    () =>
      [...rooms].sort(
        (a, b) =>
          b.wins - a.wins ||
          b.bestStreak - a.bestStreak ||
          b.matches - a.matches ||
          a.name.localeCompare(b.name),
      ),
    [rooms],
  )

  return (
    <main className="leaderboard">
      <div className="leaderboard__bg" aria-hidden="true">
        <span className="leaderboard__glow" />
        <span className="leaderboard__grid" />
      </div>

      <div className="leaderboard__shell">
        <header className="leaderboard__top">
          <button className="link-btn" onClick={onBack}>
            ← MAIN MENU
          </button>
          <span className="leaderboard__tag">
            <i /> FRIENDS ONLY · LIVE BILLBOARD
          </span>
        </header>

        <section className="leaderboard__hero">
          <span className="leaderboard__kicker">THE WORK LEAVES A MARK</span>
          <h1>
            THE <em>BILLBOARD</em>
          </h1>
          <p>
            A friends-only board for the whole artist grind. Badge tiers, battle wins, knockouts,
            label heat and chart presence all move your line. Nobody gets carried by one lucky show.
          </p>
          <div className="lb-tabs" role="tablist" aria-label="Leaderboard view">
            <button
              className={tab === 'billboard' ? 'is-on' : ''}
              onClick={() => setTab('billboard')}
              role="tab"
              aria-selected={tab === 'billboard'}
            >
              FRIENDS' BILLBOARD
            </button>
            <button
              className={tab === 'rooms' ? 'is-on' : ''}
              onClick={() => setTab('rooms')}
              role="tab"
              aria-selected={tab === 'rooms'}
            >
              ROOM RECORD
            </button>
          </div>
        </section>

        {tab === 'billboard' ? (
          <>
            <section className="leaderboard__stats" aria-label="Your Billboard standing">
              <div className="lb-stat lb-stat--gold">
                <span>YOUR RANK</span>
                <b>
                  #{String(yourRank + 1).padStart(2, '0')}
                  <i>/ {String(Math.max(1, board.length)).padStart(2, '0')}</i>
                </b>
                <em>{yourRank === 0 ? 'RUNNING THE BOARD' : `${gap.toLocaleString()} TO THE TOP`}</em>
              </div>
              <div className="lb-stat">
                <span>BILLBOARD SCORE</span>
                <b>{yourScore.toLocaleString()}</b>
                <em>{local.badgeTiers} BADGE TIERS · {Math.floor(local.badgeXp / 1000)}K XP</em>
              </div>
              <div className="lb-stat">
                <span>STAGE WORK</span>
                <b>
                  {selfStats.wins}<i>W</i> · {selfStats.kos}<i>KO</i>
                </b>
                <em>BEST STREAK {selfStats.bestStreak}</em>
              </div>
              <div className="lb-stat">
                <span>LABEL HEAT</span>
                <b>{local.labelScore}</b>
                <em>{local.chartHeat} CHART HEAT · {label.signed.length} SIGNED</em>
              </div>
            </section>

            <section className="billboard-panel" aria-label="Friends Billboard">
              <header className="billboard-panel__head">
                <div>
                  <span>THE FRIENDS LIST</span>
                  <b>LIVE STANDINGS</b>
                </div>
                <p>
                  {friends.length === 0
                    ? 'ADD A FRIEND IN THE ONLINE LOBBY TO START A BOARD.'
                    : `${friends.length} FRIEND${friends.length === 1 ? '' : 'S'} IN THE RUNNING · UPDATES WHEN YOU MEET ONLINE`}
                </p>
              </header>
              <div className="billboard-head">
                <span>RANK</span>
                <span>PLAYER</span>
                <span>BILLBOARD</span>
                <span>BADGES</span>
                <span>LABEL</span>
                <span>RECORD</span>
              </div>

              {board.map((entry, index) => {
                const score = billboardBreakdown(entry.stats)
                return (
                  <div className={`billboard-row ${entry.isYou ? 'is-you' : ''}`} key={entry.key}>
                    <span className="bb-rank">{rankLabel(index)}</span>
                    <span className="bb-player">
                      <b>{entry.name}</b>
                      <i>
                        {statusLabel(entry)} · {entry.code}
                      </i>
                    </span>
                    <span className="bb-score" title={`Battle ${score.battle} · Badges ${score.badges} · Roster ${score.roster} · Label ${score.label} · Charts ${score.charts}`}>
                      <b>{score.total.toLocaleString()}</b>
                      <i>POINTS</i>
                    </span>
                    <span className="bb-badges">
                      <b>{entry.stats.badgeTiers}<i> TIERS</i></b>
                      <i>{Math.floor(entry.stats.badgeXp / 1000)}K XP</i>
                    </span>
                    <span className="bb-label">
                      <b>{entry.stats.labelScore}</b>
                      <i>{entry.stats.chartHeat} HEAT</i>
                    </span>
                    <span className="bb-record">
                      {entry.stats.wins}–{entry.stats.losses}
                      <i>{entry.stats.kos} KO</i>
                    </span>
                  </div>
                )
              })}
            </section>

            <footer className="leaderboard__foot billboard-foot">
              <p>
                The Billboard is a live friends table. Work your badges, close shows and build the
                label — if your friends put in more, they take your spot. No weekly reset, no hiding.
              </p>
              <span className="billboard-foot__stamp">CIKI · ARTIST &amp; OWNER LEGACY</span>
            </footer>
          </>
        ) : (
          <>
            <section className="leaderboard__stats" aria-label="Your online record">
              <div className="lb-stat lb-stat--gold">
                <span>ONLINE RECORD</span>
                <b>
                  {roomSummary.wins}<i>W</i> · {roomSummary.losses}<i>L</i>
                </b>
                <em>{roomSummary.draws} DRAWN</em>
              </div>
              <div className="lb-stat">
                <span>WIN RATE</span>
                <b>{Math.round(roomSummary.winRate * 100)}<i>%</i></b>
                <em>{roomSummary.wins + roomSummary.losses} DECIDED</em>
              </div>
              <div className="lb-stat">
                <span>CURRENT STREAK</span>
                <b>{roomSummary.streak}<i>W</i></b>
                <em>BEST {roomSummary.bestStreak}</em>
              </div>
              <div className="lb-stat">
                <span>CAREER SHOWS</span>
                <b>{settings.wins}<i>W</i> · {settings.losses}<i>L</i></b>
                <em>{settings.team.circuitWins} CIRCUIT WINS</em>
              </div>
            </section>

            <section className="leaderboard__table" aria-label="Online standings">
              <header className="lb-row lb-row--head">
                <span>RANK</span>
                <span>PLAYER</span>
                <span>W – L</span>
                <span>WIN %</span>
                <span>STREAK</span>
              </header>

              {rankedRooms.length === 0 ? (
                <div className="lb-empty">
                  <span className="lb-empty__icon" aria-hidden="true">♛</span>
                  <b>THE ROOM BOARD IS WAITING</b>
                  <p>Play a private room and the first names land here.</p>
                </div>
              ) : (
                rankedRooms.map((entry, index) => {
                  const decided = entry.wins + entry.losses
                  const winRate = decided > 0 ? Math.round((entry.wins / decided) * 100) : 0
                  const isYou = entry.name === selfName.trim().toUpperCase()
                  return (
                    <div className={`lb-row ${isYou ? 'is-you' : ''}`} key={entry.name}>
                      <span className="lb-rank">{rankLabel(index)}</span>
                      <span className="lb-player">
                        <b>{entry.name}</b>
                        <i>
                          {entry.matches} MATCH{entry.matches === 1 ? '' : 'ES'}
                          {isYou ? ' · YOU' : ''}
                        </i>
                      </span>
                      <span className="lb-record">{entry.wins} – {entry.losses}</span>
                      <span className="lb-rate">
                        <b>{winRate}%</b>
                        <i style={{ '--rate': `${winRate}%` } as CSSProperties} />
                      </span>
                      <span className="lb-streak">
                        {entry.streak > 0 ? `${entry.streak} W` : '—'}
                        <i>BEST {entry.bestStreak}</i>
                      </span>
                    </div>
                  )
                })
              )}
            </section>

            <footer className="leaderboard__foot">
              <p>
                Room results are stored on this device. The Billboard above is the friends-only
                artist and label comparison.
              </p>
              <button className="btn btn--ghost" onClick={onBack}>
                BACK TO THE MENU
              </button>
            </footer>
          </>
        )}
      </div>
    </main>
  )
}
