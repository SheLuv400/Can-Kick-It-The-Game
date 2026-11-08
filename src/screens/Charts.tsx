import { Portrait } from '../components/Portrait'
import { chartEntry, CHART_SIZE, movement, type ChartState } from '../game/charts'
import { ARTISTS, getArtist } from '../game/roster'
import { trackFor } from '../game/tracks'
import { chartRoyalties, type LabelState } from '../game/label'
import type { TeamProgress } from '../game/types'

interface ChartsProps {
  charts: ChartState
  label: LabelState
  team: TeamProgress
  onAdvance: () => void
  onBack: () => void
  onLabel: () => void
}

const day = (week: number) => `WEEK ${String(week).padStart(2, '0')}`
const count = (value: number) => value.toLocaleString('en-US')
const singleFor = (id: string, fallback: string) => trackFor(id)?.title ?? fallback

export function Charts({ charts, label, team, onAdvance, onBack, onLabel }: ChartsProps) {
  const chartEntries = charts.entries.slice(0, CHART_SIZE)
  const leader = chartEntries[0]
  const openCrises = label.crises.filter((crisis) => crisis.status === 'OPEN').length
  const signed = new Set(label.signed.map((entry) => entry.id))
  const totalSpins = chartEntries.reduce((sum, entry) => sum + entry.spins, 0)
  const labelsRanks = label.signed
    .map((entry) => chartEntry(charts, entry.id))
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        entry !== undefined && entry.rank <= CHART_SIZE,
    )
    .sort((a, b) => a.rank - b.rank)
  const royaltyById = new Map(
    chartRoyalties(label, charts).map((line) => [line.artistId, line]),
  )
  const weeklyRoyalty = [...royaltyById.values()].reduce((sum, line) => sum + line.amount, 0)

  return (
    <main className="team charts">
      <header className="team__topbar">
        <button className="team__brand" onClick={onBack} aria-label="Back to the show">
          <span className="team__brand-mark">CIKI</span>
          <span className="team__brand-copy">
            <b>CAN I KICK IT?</b>
            <i>THE GAME</i>
          </span>
        </button>

        <nav className="team__nav" aria-label="Charts">
          <button onClick={onBack}>THE SHOW</button>
          <button onClick={onLabel}>ULTIMATE TEAM</button>
          <button className="is-active" aria-current="page">
            THE CHARTS
          </button>
        </nav>

        <div className="team__wallet">
          <span className="team__credits">
            <i>◉</i>
            <b>{count(team.credits)}</b>
            <em>RC</em>
          </span>
          <span className="team__buzz-chip">
            <i>BR</i>
            <span>
              <b>BILLBOARD</b>
              <em>{day(charts.week)}</em>
            </span>
          </span>
        </div>
      </header>

      <div className="charts__body">
        <section className="charts__masthead">
          <div className="charts__masthead-copy">
            <p className="charts__kicker">
              <span /> CIKI RECORDS · THE WEEKLY BILLBOARD
            </p>
            <h1>
              THE <em>CIKI</em> 26
            </h1>
            <p className="charts__deck">
              {ARTISTS.length} artists, one living chart. Every release, radio spin, leak and
              scandal moves the board each week — and the cards you play in battle push your artists
              into the Top {CHART_SIZE}. Signed artists collect weekly royalties while their singles
              hold a chart seat.
            </p>
          </div>

          <div className="charts__controls">
            <span className="charts__week">{day(charts.week)} · SEASON 01</span>
            <button
              className="btn btn--primary charts__advance"
              onClick={onAdvance}
              disabled={openCrises > 0}
              title={openCrises ? 'Resolve open label crises first' : 'Simulate the next chart week'}
            >
              RUN THE WEEK <i>→</i>
            </button>
            <span className="charts__hint">
              {openCrises
                ? `RESOLVE ${openCrises} OPEN LABEL ${openCrises === 1 ? 'CRISIS' : 'CRISES'} FIRST`
                : 'SIMULATES RELEASES · RADIO · DRAMA'}
            </span>
          </div>
        </section>

        {leader && (
          <section className="charts__podium" aria-label="This week's top three">
            {chartEntries.slice(0, 3).map((entry, index) => {
              const artist = getArtist(entry.id)
              const move = movement(entry)
              return (
                <article
                  className={`charts__podium-card charts__podium-card--${index + 1}`}
                  key={entry.id}
                >
                  <span className="charts__podium-rank">{String(entry.rank).padStart(2, '0')}</span>
                  <span className="charts__podium-art">
                    <Portrait artist={artist} crop="avatar" />
                  </span>
                  <div className="charts__podium-copy">
                    <span className="charts__podium-tag">
                      {index === 0 ? 'THIS WEEK’S #1' : `#${entry.rank} · ${artist.crew}`}
                    </span>
                    <h2>{artist.name}</h2>
                    <p>“{singleFor(entry.id, entry.single)}”</p>
                    <div className="charts__podium-stats">
                      <span>
                        <b>{count(entry.spins)}</b> SPINS
                      </span>
                      <span className={`charts__move is-${move.dir}`}>{move.label}</span>
                    </div>
                  </div>
                  {signed.has(entry.id) && <span className="charts__stamp">YOUR LABEL</span>}
                </article>
              )
            })}
          </section>
        )}

        <div className="charts__layout">
          <section className="charts__paper" aria-label="The Ciki 26 chart">
            <header className="charts__paper-head">
              <div>
                <span>THE HOT 26</span>
                <h2>CIKI TOP 26</h2>
              </div>
              <div className="charts__paper-meta">
                <span>{day(charts.week)}</span>
                <span>{count(totalSpins)} TOTAL SPINS</span>
              </div>
            </header>

            <div className="charts__columns" aria-hidden="true">
              <span>#</span>
              <span>MOVE</span>
              <span>ARTIST</span>
              <span>SINGLE</span>
              <span>SPINS</span>
              <span>HEAT</span>
              <span>PEAK</span>
              <span>TAGS</span>
            </div>

            <ol className="charts__list">
              {chartEntries.map((entry) => {
                const artist = getArtist(entry.id)
                const move = movement(entry)
                const isSigned = signed.has(entry.id)
                return (
                  <li
                    className={`charts__row ${entry.rank === 1 ? 'is-one' : ''} ${
                      isSigned ? 'is-label' : ''
                    }`}
                    key={entry.id}
                  >
                    <span className="charts__rank">{String(entry.rank).padStart(2, '0')}</span>
                    <span className={`charts__move is-${move.dir}`}>{move.label}</span>
                    <span className="charts__artist">
                      <span className="charts__avatar">
                        <Portrait artist={artist} crop="avatar" />
                      </span>
                      <span className="charts__artist-copy">
                        <b>{artist.name}</b>
                        <i>
                          {artist.crew} · {artist.genre}
                        </i>
                      </span>
                    </span>
                    <span className="charts__single">“{singleFor(entry.id, entry.single)}”</span>
                    <span className="charts__spins">
                      <b>{count(entry.spins)}</b>
                      <i>SPINS</i>
                    </span>
                    <span className="charts__heat">
                      <span className="charts__heat-track" aria-hidden="true">
                        <i style={{ width: `${Math.round(entry.popularity)}%` }} />
                      </span>
                      <em>{Math.round(entry.popularity)}</em>
                    </span>
                    <span className="charts__peak">
                      <b>{entry.peak}</b>
                      <i>PEAK</i>
                    </span>
                    <span className="charts__tags">
                      {isSigned && <b>YOUR LABEL</b>}
                      {entry.impact > 0 && <b className="is-impact">SET +{entry.impact}</b>}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>

          <aside className="charts__aside">
            <section className="charts__panel">
              <header>
                <span>CHART NOTES</span>
                <b>{day(charts.week)}</b>
              </header>
              <ul className="charts__news">
                {charts.news.slice(0, 9).map((item) => (
                  <li key={item.id} className={`is-${item.tone}`}>
                    <span className="charts__news-dot" aria-hidden="true" />
                    <p>{item.text}</p>
                    <i>{getArtist(item.artistId).name.split(' ')[0]}</i>
                  </li>
                ))}
              </ul>
            </section>

            <section className="charts__panel charts__panel--roster">
              <header>
                <span>YOUR LABEL ON THE BOARD</span>
                <button className="link-btn" onClick={onLabel}>
                  OPEN OFFICE →
                </button>
              </header>
              {label.signed.length ? (
                labelsRanks.length ? (
                  <>
                    <ul className="charts__roster">
                      {labelsRanks.map((entry) => {
                        const artist = getArtist(entry.id)
                        return (
                          <li key={entry.id}>
                            <b>#{entry.rank}</b>
                            <span>
                              <i>{artist.name}</i>
                              <em>“{singleFor(entry.id, entry.single)}”</em>
                            </span>
                            <span className="charts__roster-money">
                              <small>{count(entry.spins)} SPINS</small>
                              <b>+{count(royaltyById.get(entry.id)?.amount ?? 0)} RC</b>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="charts__royalty-total">
                      <span>WEEKLY CHART ROYALTIES</span>
                      <b>
                        {count(weeklyRoyalty)} <em>RC</em>
                      </b>
                    </div>
                  </>
                ) : (
                  <p className="charts__empty">
                    Your roster is signed but outside the Top 26. Releases and battle plays can push
                    them onto the board.
                  </p>
                )
              ) : (
                <p className="charts__empty">
                  No artists signed. Open the Label Office, sign a roster and put your own names on
                  this chart.
                </p>
              )}
            </section>

            <section className="charts__stats">
              <div>
                <span>#1 THIS WEEK</span>
                <b>{leader ? getArtist(leader.id).name : '—'}</b>
              </div>
              <div>
                <span>WEEKS LIVE</span>
                <b>{charts.week}</b>
              </div>
              <div>
                <span>YOUR ROSTER</span>
                <b>
                  {label.signed.length}/{6}
                </b>
              </div>
            </section>
          </aside>
        </div>

        <footer className="charts__foot">
          <span>
            THE CIKI 26 · WEEKLY CHART · ALL {ARTISTS.length} ARTISTS ELIGIBLE · TOP {CHART_SIZE}
          </span>
          <button className="link-btn" onClick={onBack}>
            BACK TO THE SHOW
          </button>
        </footer>
      </div>
    </main>
  )
}
