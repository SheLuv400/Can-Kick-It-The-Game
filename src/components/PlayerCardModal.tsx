import type { CSSProperties } from 'react'
import { favoriteArtistId, type PlayerStats } from '../account/account'
import { careerTitleForId } from '../game/career-data'
import { getArtist } from '../game/roster'
import { Portrait } from './Portrait'

interface PlayerCardModalProps {
  name: string
  code: string
  stats: PlayerStats
  avatarArtistId?: string | null
  titleId?: string | null
  isSelf?: boolean
  onEditAvatar?: () => void
  onClose: () => void
}

function recordRate(stats: PlayerStats) {
  const decided = stats.wins + stats.losses
  return decided > 0 ? Math.round((stats.wins / decided) * 100) : 0
}

function responseTime(stats: PlayerStats) {
  if (!stats.responseSamples) return '—'
  const seconds = stats.responseMs / stats.responseSamples / 1000
  return seconds >= 10 ? `${seconds.toFixed(0)}s` : `${seconds.toFixed(1)}s`
}

export function PlayerCardModal({
  name,
  code,
  stats,
  avatarArtistId = null,
  titleId = null,
  isSelf = false,
  onEditAvatar,
  onClose,
}: PlayerCardModalProps) {
  const winRate = recordRate(stats)
  const avatarArtist = avatarArtistId ? getArtist(avatarArtistId) : null
  const title = careerTitleForId(titleId ?? 'unsigned')
  const favoriteId = favoriteArtistId(stats)
  const favorite = favoriteId ? getArtist(favoriteId) : null
  const favoritePlays = favoriteId ? stats.artistPlays[favoriteId] ?? 0 : 0
  const actionCount = Math.max(stats.actions, stats.attacks, 1)
  const attackRate = Math.round((stats.attacks / actionCount) * 100)
  const onlineDecided = stats.casualWins + stats.casualLosses + stats.rankedWins + stats.rankedLosses

  return (
    <div
      className="modal player-card-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} player card`}
    >
      <button className="modal__scrim" onClick={onClose} aria-label="Close player card" />
      <div className="modal__panel player-card-panel">
        <header className="modal__head">
          <div>
            <span className="kicker">CIKI ID · SCOUTING REPORT</span>
            <h2>{isSelf ? 'YOUR PLAYER CARD' : 'PLAYER CARD'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close player card">
            ✕
          </button>
        </header>

        <section className="player-card-hero">
          <span className="player-card-avatar">
            {avatarArtist ? (
              <Portrait artist={avatarArtist} crop="avatar" />
            ) : (
              name.slice(0, 2).toUpperCase()
            )}
          </span>
          <div className="player-card-identity">
            <span>{isSelf ? 'SIGNED IN · YOU' : 'FRIEND ON THE LIST'}</span>
            <b>{name}</b>
            {title && (
              <em className="player-card-title" style={{ color: title.color }}>
                {title.label}
              </em>
            )}
            <i>CODE {code} · {stats.matches} MATCH{stats.matches === 1 ? '' : 'ES'} LOGGED</i>
          </div>
          <div
            className="player-card-rate"
            style={{ '--win-rate': `${winRate}%` } as CSSProperties}
            aria-label={`${winRate} percent win rate`}
          >
            <b>{winRate}<i>%</i></b>
            <span>WIN RATE</span>
          </div>
        </section>

        <div className="player-card-record">
          <div><span>WINS</span><b>{stats.wins}</b></div>
          <div><span>LOSSES</span><b>{stats.losses}</b></div>
          <div><span>DRAWS</span><b>{stats.draws}</b></div>
          <div><span>STREAK</span><b>{stats.streak}<i>W</i></b><em>BEST {stats.bestStreak}</em></div>
        </div>

        <div className="player-card-main">
          <section className={`player-card-favorite ${favorite ? '' : 'is-empty'}`}>
            <span className="player-card-kicker">FAVORITE CUT</span>
            {favorite ? (
              <>
                <span className="player-card-favorite__mark">
                  {favorite.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                </span>
                <div>
                  <b>{favorite.name}</b>
                  <span>{favorite.crew} · {favorite.genre}</span>
                  <em>{favoritePlays} PLAY{favoritePlays === 1 ? '' : 'S'} ON RECORD</em>
                </div>
              </>
            ) : (
              <p>NO CARD DATA YET. THE FIRST SHOW WRITES THE FIRST LINE.</p>
            )}
          </section>

          <section className="player-card-split">
            <span className="player-card-kicker">ROOM SPLIT</span>
            <div><span>CASUAL</span><b>{stats.casualWins}W · {stats.casualLosses}L</b></div>
            <div><span>RANKED</span><b>{stats.rankedWins}W · {stats.rankedLosses}L</b></div>
            <em>{onlineDecided ? `${onlineDecided} ONLINE DECIDED` : 'NO ONLINE REPS YET'}</em>
          </section>
        </div>

        <section className="player-card-metrics" aria-label="Detailed player metrics">
          <div><span>ATTACK RATE</span><b>{attackRate}%</b><em>{stats.attacks} OF {stats.actions} ACTIONS</em></div>
          <div><span>AVG RESPONSE</span><b>{responseTime(stats)}</b><em>{stats.responseSamples} TIMED TURNS</em></div>
          <div><span>CROWD DAMAGE</span><b>{stats.damage}</b><em>ACROSS ALL SHOWS</em></div>
          <div><span>KNOCKOUTS</span><b>{stats.kos}</b><em>{stats.features} FEATURE{stats.features === 1 ? '' : 'S'}</em></div>
          <div><span>ENCORES</span><b>{stats.encores}</b><em>TRANSFORMATIONS</em></div>
          <div><span>CRATE PULLS</span><b>{stats.crateDraws}</b><em>SPECIALS DRAWN</em></div>
        </section>

        <footer className="player-card-foot">
          <p>
            {isSelf
              ? 'Every finished show updates this sheet on your device. Friends see the latest copy while you are online.'
              : 'This card was sent by your friend’s game while you were both online. Records update after each finished show.'}
          </p>
          <div className="player-card-foot__actions">
            {onEditAvatar && (
              <button className="btn btn--ghost btn--sm" onClick={onEditAvatar}>
                EDIT PROFILE ARTIST
              </button>
            )}
            <button className="btn btn--ghost btn--sm" onClick={onClose}>CLOSE CARD</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
