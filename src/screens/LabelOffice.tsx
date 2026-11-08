import { useEffect, useRef, useState } from 'react'
import { Portrait } from '../components/Portrait'
import { TrackPlayer } from '../components/TrackPlayer'
import { CHART_SIZE, chartEntry, pickTitle, type ChartState } from '../game/charts'
import {
  MAX_BUDGET,
  MAX_ROSTER,
  albumProjection,
  albumsFor,
  chartRoyalties,
  marketHeat,
  roleInfo,
  signingBoard,
  signingFee,
  type LabelState,
} from '../game/label'
import { getArtist } from '../game/roster'
import { trackFor } from '../game/tracks'
import type { TeamProgress } from '../game/types'

interface LabelOfficeProps {
  team: TeamProgress
  label: LabelState
  avatarArtistId: string | null
  charts: ChartState
  onBack: () => void
  onTeam: () => void
  onCharts: () => void
  onAdvance: () => void
  onSign: (artistId: string) => void
  onDropArtist: (artistId: string) => void
  onStartAlbum: (input: {
    artistId: string
    title: string
    production: number
    marketing: number
    releaseWeek: number
  }) => void
  onReviewExpense: (expenseId: string, approve: boolean) => void
  onResolveCrisis: (crisisId: string, optionId: string) => void
}

type Tab = 'office' | 'scout' | 'studio' | 'ledger' | 'crisis'

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: 'office', label: 'OFFICE', glyph: '♛' },
  { id: 'scout', label: 'SCOUTING', glyph: '◎' },
  { id: 'studio', label: 'STUDIO', glyph: '▤' },
  { id: 'ledger', label: 'LEDGER', glyph: '◉' },
  { id: 'crisis', label: 'CRISIS', glyph: '⚠' },
]

const count = (value: number) => value.toLocaleString('en-US')

export function LabelOffice({
  team,
  label,
  avatarArtistId,
  charts,
  onBack,
  onTeam,
  onCharts,
  onAdvance,
  onSign,
  onDropArtist,
  onStartAlbum,
  onReviewExpense,
  onResolveCrisis,
}: LabelOfficeProps) {
  const [tab, setTab] = useState<Tab>('office')
  const labelArtist = avatarArtistId ? getArtist(avatarArtistId) : null
  const [selected, setSelected] = useState(label.signed[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [production, setProduction] = useState(350)
  const [marketing, setMarketing] = useState(250)
  const [offset, setOffset] = useState(2)
  const [flash, setFlash] = useState('')
  const [trackOpen, setTrackOpen] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)

  const role = roleInfo(label)
  const openCrises = label.crises.filter((crisis) => crisis.status === 'OPEN')
  const pending = label.expenses.filter((expense) => expense.status === 'PENDING')
  const released = label.albums.filter((album) => album.status === 'RELEASED')
  const signedIds = label.signed.map((entry) => entry.id)
  const activeId = signedIds.includes(selected) ? selected : (signedIds[0] ?? '')
  const activeArtist = activeId ? getArtist(activeId) : null
  const activeAlbum = label.albums.find(
    (album) => album.artistId === activeId && album.status === 'IN PRODUCTION',
  )
  const activeTrack = activeArtist ? trackFor(activeArtist.id) : undefined
  const activeEntry = activeId ? chartEntry(charts, activeId) : undefined
  const royaltyLines = chartRoyalties(label, charts)
  const royaltyById = new Map(royaltyLines.map((line) => [line.artistId, line]))
  const weeklyRoyalty = royaltyLines.reduce((sum, line) => sum + line.amount, 0)
  const cost = Math.round(production + marketing)
  const projected = albumProjection({
    popularity: activeEntry?.popularity ?? 50,
    production,
    marketing,
    reputation: label.reputation,
    releaseWeek: label.week + offset,
    seed: `${activeId}-${production}-${marketing}`,
  })
  const flashNotice = (text: string) => {
    setFlash(text)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(''), 3600)
  }

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    },
    [],
  )

  useEffect(() => {
    setTitle('')
    setTrackOpen(false)
  }, [activeId])

  const greenlight = () => {
    if (!activeId || activeAlbum || cost > team.credits) return
    onStartAlbum({
      artistId: activeId,
      title: title || pickTitle(`${activeId}-${label.week}`),
      production,
      marketing,
      releaseWeek: label.week + offset,
    })
    setTitle('')
    flashNotice(`STUDIO BOOKED · ${activeArtist?.name ?? 'ARTIST'}`)
  }

  return (
    <main className="team label">
      <header className="team__topbar">
        <button className="team__brand" onClick={onBack} aria-label="Back to the show">
          <span className="team__brand-mark">CIKI</span>
          <span className="team__brand-copy">
            <b>CAN I KICK IT?</b>
            <i>THE GAME</i>
          </span>
        </button>

        <nav className="team__nav" aria-label="Label Office">
          <button onClick={onBack}>THE SHOW</button>
          <button onClick={onTeam}>ULTIMATE TEAM</button>
          <button onClick={onCharts}>THE CHARTS</button>
          <button className="is-active" aria-current="page">
            LABEL OFFICE
          </button>
        </nav>

        <div className="team__wallet">
          <span className="team__credits">
            <i>◉</i>
            <b>{count(team.credits)}</b>
            <em>RC</em>
          </span>
          <span className="team__buzz-chip">
            <i>WK</i>
            <span>
              <b>{role.name}</b>
              <em>WEEK {String(label.week).padStart(2, '0')}</em>
            </span>
          </span>
        </div>
      </header>

      <div className="label__body">
        <section className="label__masthead">
          <div className="label__masthead-copy">
            {labelArtist && (
              <span
                className="label__masthead-avatar"
                title={`Label profile artist — ${labelArtist.name}`}
              >
                <Portrait artist={labelArtist} crop="avatar" />
              </span>
            )}
            <div>
              <p className="label__kicker">
                <span /> {team.labelName} · SEASON 01
              </p>
              <h1>
                LABEL <em>OFFICE</em>
              </h1>
              <p className="label__deck">
                Sign the roster, budget the albums, pick the release week, approve the invoices and put
                out the fires. Every decision moves the chart — and charting artists pay weekly
                royalties back into the label.
              </p>
            </div>
          </div>

          <div className="label__controls">
            <span className="label__role-chip">{role.name}</span>
            <button
              className="btn btn--primary label__advance"
              onClick={onAdvance}
              disabled={openCrises.length > 0}
              title={openCrises.length ? 'Resolve open crises first' : 'Advance the label one week'}
            >
              ADVANCE WEEK <i>→</i>
            </button>
            <span className="label__hint">
              {openCrises.length
                ? `RESOLVE ${openCrises.length} OPEN ${openCrises.length === 1 ? 'CRISIS' : 'CRISES'} TO ADVANCE`
                : 'CHART ROYALTIES · NEW INVOICES · CHART WEEK'}
            </span>
          </div>
        </section>

        {flash && <p className="label__flash">{flash}</p>}

        <nav className="label__tabs" aria-label="Label office sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
            >
              <i aria-hidden="true">{item.glyph}</i>
              {item.label}
              {item.id === 'ledger' && pending.length > 0 && <b>{pending.length}</b>}
              {item.id === 'crisis' && openCrises.length > 0 && <b>{openCrises.length}</b>}
            </button>
          ))}
        </nav>

        {tab === 'office' && (
          <div className="label__grid">
            <section className="label__panel label__role">
              <span className="label__eyebrow">YOUR TITLE · TIER {role.index + 1} OF 3</span>
              <h2>{role.name}</h2>
              <p>{role.blurb}</p>
              {role.next ? (
                <div className="label__next">
                  <span>NEXT PROMOTION · {role.next.name}</span>
                  {role.next.requirements.map((requirement) => (
                    <div className="label__req" key={requirement.label}>
                      <div>
                        <b>{requirement.label}</b>
                        <em>
                          {requirement.have} / {requirement.need}
                        </em>
                      </div>
                      <div className="label__req-track" aria-hidden="true">
                        <i
                          style={{
                            width: `${Math.min(100, (requirement.have / requirement.need) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="label__next is-max">
                  <span>TOP OF THE BUILDING</span>
                  <b>MENTOR STATUS UNLOCKED</b>
                  <p>The roster comes to you first. The board answers when you call.</p>
                </div>
              )}
            </section>

            <section className="label__panel label__pulse">
              <header className="label__panel-head">
                <span>LABEL PULSE</span>
                <em>WEEK {String(label.week).padStart(2, '0')}</em>
              </header>
              <div className="label__pulse-grid">
                <div>
                  <span>REPUTATION</span>
                  <b>{Math.round(label.reputation)}</b>
                  <div className="label__meter" aria-hidden="true">
                    <i style={{ width: `${label.reputation}%` }} />
                  </div>
                </div>
                <div>
                  <span>ROSTER</span>
                  <b>
                    {label.signed.length}
                    <em>/{MAX_ROSTER}</em>
                  </b>
                </div>
                <div>
                  <span>CATALOG REVENUE</span>
                  <b>{count(label.revenue)}</b>
                  <em>RC</em>
                </div>
                <div>
                  <span>ALBUM SPEND</span>
                  <b>{count(label.spending)}</b>
                  <em>RC</em>
                </div>
              </div>
              <div className="label__royalty">
                <div>
                  <span>CHART ROYALTIES</span>
                  <em>EST. FROM CURRENT TOP 26</em>
                </div>
                <b>
                  {count(weeklyRoyalty)} <em>RC / WK</em>
                </b>
                <p>
                  Only signed artists on the chart collect. Higher rank, spins, upward movement and
                  released catalog lift each weekly payout.
                </p>
              </div>
              <div className="label__net">
                <span>NET</span>
                <b className={label.revenue - label.spending >= 0 ? 'is-up' : 'is-down'}>
                  {label.revenue - label.spending >= 0 ? '+' : ''}
                  {count(label.revenue - label.spending)} RC
                </b>
              </div>
              <button className="link-btn" onClick={() => setTab('scout')}>
                SCOUT THE ROSTER →
              </button>
            </section>

            <section className="label__panel label__roster-panel is-wide">
              <header className="label__panel-head">
                <span>YOUR ROSTER</span>
                <em>
                  {label.signed.length}/{MAX_ROSTER} SIGNED
                </em>
              </header>
              {label.signed.length ? (
                <div className="label__roster">
                  {label.signed.map((entry) => {
                    const artist = getArtist(entry.id)
                    const position = chartEntry(charts, entry.id)
                    const catalog = albumsFor(label, entry.id)
                    const royalty = royaltyById.get(entry.id)
                    const track = trackFor(entry.id)
                    const inStudio = label.albums.some(
                      (album) => album.artistId === entry.id && album.status === 'IN PRODUCTION',
                    )
                    return (
                      <button
                        className="label__artist"
                        key={entry.id}
                        onClick={() => {
                          setSelected(entry.id)
                          setTab('studio')
                        }}
                      >
                        <span className="label__artist-art">
                          <Portrait artist={artist} crop="avatar" />
                        </span>
                        <span className="label__artist-copy">
                          <b>{artist.name}</b>
                          <i>
                            {artist.crew} · {artist.genre}
                          </i>
                          <span className="label__artist-meta">
                            <em>
                              {position && position.rank <= CHART_SIZE
                                ? `CHART #${position.rank}`
                                : 'OFF CHART'}
                            </em>
                            <em>{catalog.length} REL.</em>
                            {royalty && royalty.amount > 0 && (
                              <em
                                className="is-earning"
                                title={`${royalty.tier} · ${count(royalty.spins)} weekly spins`}
                              >
                                +{count(royalty.amount)} RC/WK
                              </em>
                            )}
                            {inStudio && <em className="is-studio">IN STUDIO</em>}
                          </span>
                          {track && (
                            <span className="label__artist-single">
                              <em>PUSHING</em>
                              <b>“{track.title}”</b>
                            </span>
                          )}
                          <span className="label__morale">
                            <i style={{ width: `${entry.morale}%` }} />
                            <em>MORALE {entry.morale}</em>
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="label__empty">
                  <b>NO ARTISTS SIGNED.</b>
                  <p>
                    You are the Vice President of an empty label. Scout the roster, pick your first
                    artist and put the office to work.
                  </p>
                  <button className="btn btn--primary" onClick={() => setTab('scout')}>
                    OPEN SCOUTING <i>→</i>
                  </button>
                </div>
              )}
            </section>

            <section className="label__panel label__log is-wide">
              <header className="label__panel-head">
                <span>WEEKLY LEDGER</span>
                <em>LAST 8 MOVES</em>
              </header>
              {label.ledger.length ? (
                <ul>
                  {label.ledger.slice(0, 8).map((entry) => (
                    <li key={entry.id}>
                      <span>W{String(entry.week).padStart(2, '0')}</span>
                      <b>{entry.text}</b>
                      <em className={entry.amount >= 0 ? 'is-up' : ''}>
                        {entry.amount > 0 ? '+' : ''}
                        {entry.amount ? count(entry.amount) : '—'}
                      </em>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="label__empty-copy">No money has moved yet. Sign an artist or run a week.</p>
              )}
            </section>
          </div>
        )}

        {tab === 'scout' && (
          <section className="label__panel">
            <header className="label__panel-head">
              <span>SCOUTING BOARD · {signingBoard(label, charts).length} UNSIGNED</span>
              <em>
                {label.signed.length}/{MAX_ROSTER} ROSTER · {count(team.credits)} RC AVAILABLE
              </em>
            </header>
            <p className="label__section-note">
              Signing fees follow chart heat. A top-10 artist costs more, sells more and draws more
              attention. The roster cap is {MAX_ROSTER}.
            </p>
            <div className="label__scout">
              {signingBoard(label, charts).map((id) => {
                const artist = getArtist(id)
                const position = chartEntry(charts, id)
                const fee = signingFee(id, charts)
                const rosterFull = label.signed.length >= MAX_ROSTER
                const affordable = team.credits >= fee && !rosterFull
                return (
                  <article className={`label__scout-card ${affordable ? '' : 'is-locked'}`} key={id}>
                    <span className="label__scout-art">
                      <Portrait artist={artist} crop="avatar" />
                    </span>
                    <div className="label__scout-copy">
                      <span className="label__scout-tag">
                        {position && position.rank <= CHART_SIZE
                          ? `CHART #${position.rank} · ${count(position.spins)} SPINS`
                          : position
                            ? `OFF CHART · ${count(position.spins)} SPINS`
                            : 'UNRANKED'}
                      </span>
                      <h3>{artist.name}</h3>
                      <p>
                        {artist.crew} · {artist.genre} · {artist.city}
                      </p>
                      <div className="label__scout-heat">
                        <div aria-hidden="true">
                          <i style={{ width: `${position?.popularity ?? 0}%` }} />
                        </div>
                        <span>POP {Math.round(position?.popularity ?? 0)}</span>
                      </div>
                    </div>
                    <div className="label__scout-action">
                      <span className="label__fee">
                        <b>{count(fee)}</b>
                        <em>RC · SIGNING</em>
                      </span>
                      <button
                        className="btn btn--primary btn--sm"
                        disabled={!affordable}
                        onClick={() => {
                          onSign(id)
                          flashNotice(`SIGNED · ${artist.name}`)
                        }}
                        title={
                          rosterFull
                            ? 'Roster is full'
                            : affordable
                              ? `Sign ${artist.name}`
                              : 'Not enough record credits'
                        }
                      >
                        SIGN
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'studio' && (
          <div className="label__studio">
            <section className="label__panel label__projects">
              <header className="label__panel-head">
                <span>RELEASE SCHEDULE</span>
                <em>
                  {label.albums.filter((album) => album.status === 'IN PRODUCTION').length} IN
                  PRODUCTION
                </em>
              </header>
              {label.albums.filter((album) => album.status === 'IN PRODUCTION').length ? (
                <ul className="label__album-list">
                  {label.albums
                    .filter((album) => album.status === 'IN PRODUCTION')
                    .map((album) => {
                      const artist = getArtist(album.artistId)
                      const weeks = Math.max(0, album.releaseWeek - label.week)
                      return (
                        <li className="label__album" key={album.id}>
                          <span className="label__album-art">
                            <Portrait artist={artist} crop="avatar" />
                          </span>
                          <div>
                            <b>{album.title}</b>
                            <span>{artist.name}</span>
                            <em>
                              BUDGET {count(album.production + album.marketing)} RC · RELEASE WEEK{' '}
                              {album.releaseWeek}
                            </em>
                          </div>
                          <span className="label__countdown">
                            {weeks === 0 ? 'DUE NOW' : `${weeks} WK`}
                          </span>
                        </li>
                      )
                    })}
                </ul>
              ) : (
                <p className="label__empty-copy">
                  Nothing in the pipeline. Budget an album on the right and pick a release week.
                </p>
              )}

              <header className="label__panel-head label__panel-head--sub">
                <span>CATALOG</span>
                <em>{released.length} RELEASED</em>
              </header>
              {released.length ? (
                <ul className="label__album-list">
                  {released.map((album) => {
                    const artist = getArtist(album.artistId)
                    return (
                      <li className="label__album is-released" key={album.id}>
                        <span className="label__album-art">
                          <Portrait artist={artist} crop="avatar" />
                        </span>
                        <div>
                          <b>{album.title}</b>
                          <span>{artist.name}</span>
                          <em>
                            {count(album.sales ?? 0)} UNITS · +{count(album.revenue ?? 0)} RC
                          </em>
                        </div>
                        <span className="label__debut">#{album.debut ?? '—'}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="label__empty-copy">No released catalog yet.</p>
              )}
            </section>

            <section className="label__panel label__form">
              <header className="label__panel-head">
                <span>ALBUM PRODUCTION</span>
                <em>{activeAlbum ? 'ONE PROJECT PER ARTIST' : 'GREENLIGHT A PROJECT'}</em>
              </header>

              {!activeArtist ? (
                <div className="label__empty">
                  <b>SIGN AN ARTIST FIRST.</b>
                  <p>You cannot budget a record for a roster that does not exist yet.</p>
                  <button className="btn btn--primary" onClick={() => setTab('scout')}>
                    OPEN SCOUTING <i>→</i>
                  </button>
                </div>
              ) : (
                <>
                  <div className="label__field">
                    <span>ARTIST</span>
                    <div className="label__artist-pills">
                      {label.signed.map((entry) => (
                        <button
                          key={entry.id}
                          className={entry.id === activeId ? 'is-active' : ''}
                          onClick={() => setSelected(entry.id)}
                          aria-pressed={entry.id === activeId}
                        >
                          {getArtist(entry.id).name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="label__drop-artist">
                    <div>
                      <span>ROSTER MOVE</span>
                      <b>DROP {activeArtist.name}</b>
                      <em>Frees one slot. Every remaining benefit is lost. No refund.</em>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => setDropTarget(activeId)}>
                      DROP ARTIST
                    </button>
                  </div>
                  {dropTarget === activeId && (
                    <div className="label__drop-confirm" role="alertdialog" aria-label="Confirm artist drop">
                      <span>DROP {activeArtist.name} FROM THE LABEL?</span>
                      <p>
                        The slot opens immediately. Unreleased plans, morale, chart benefits and all
                        remaining artist perks are lost. Record credits are not refunded.
                      </p>
                      <div>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setDropTarget(null)}
                        >
                          KEEP ARTIST
                        </button>
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => {
                            onDropArtist(activeId)
                            setDropTarget(null)
                            flashNotice(`DROPPED · ${activeArtist.name}`)
                            setTab('scout')
                          }}
                        >
                          CONFIRM DROP
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTrack && (
                    <div className="label__current-single">
                      <div>
                        <span>CURRENT SINGLE · {activeArtist?.name ?? 'YOUR ROSTER'}</span>
                        <b>“{activeTrack.title}”</b>
                        <em>{activeTrack.mood}</em>
                      </div>
                      {activeTrack.embedUrl && (
                        <button className="btn btn--primary btn--sm" onClick={() => setTrackOpen(true)}>
                          ▶ PLAY
                        </button>
                      )}
                    </div>
                  )}

                  <label className="label__field">
                    <span>ALBUM TITLE</span>
                    <input
                      value={title}
                      maxLength={28}
                      placeholder={pickTitle(`${activeId}-${label.week}`)}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>

                  <div className="label__field">
                    <div className="label__field-head">
                      <span>PRODUCTION BUDGET</span>
                      <b>{count(production)} RC</b>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={MAX_BUDGET}
                      step={50}
                      value={production}
                      onChange={(event) => setProduction(Number(event.target.value))}
                    />
                    <div className="label__slider-legend">
                      <span>DEMO TAPE</span>
                      <span>STUDIO ALBUM</span>
                    </div>
                  </div>

                  <div className="label__field">
                    <div className="label__field-head">
                      <span>MARKETING BUDGET</span>
                      <b>{count(marketing)} RC</b>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={MAX_BUDGET}
                      step={50}
                      value={marketing}
                      onChange={(event) => setMarketing(Number(event.target.value))}
                    />
                    <div className="label__slider-legend">
                      <span>WORD OF MOUTH</span>
                      <span>GLOBAL PUSH</span>
                    </div>
                  </div>

                  <div className="label__field">
                    <span>RELEASE WEEK · MARKET COMPETITION</span>
                    <div className="label__weeks">
                      {Array.from({ length: 6 }, (_, index) => {
                        const week = label.week + index + 1
                        const heat = Math.round(marketHeat(week) * 100)
                        return (
                          <button
                            key={week}
                            className={offset === index + 1 ? 'is-active' : ''}
                            onClick={() => setOffset(index + 1)}
                            aria-pressed={offset === index + 1}
                          >
                            <b>W{String(week).padStart(2, '0')}</b>
                            <em>{heat}% HEAT</em>
                          </button>
                        )
                      })}
                    </div>
                    <p className="label__field-note">
                      Crowded weeks bury a release. The lowest heat in the window is the cleanest
                      lane to the top 10.
                    </p>
                  </div>

                  <div className="label__projection">
                    <div>
                      <span>PROJECTED SALES</span>
                      <b>{count(projected.sales)}</b>
                    </div>
                    <div>
                      <span>PROJECTED RETURN</span>
                      <b>{count(projected.revenue)} RC</b>
                    </div>
                    <div>
                      <span>PROJECTED DEBUT</span>
                      <b>#{projected.debut}</b>
                    </div>
                    <div>
                      <span>CHART BOOST</span>
                      <b>+{Math.round(projected.boost)} POP</b>
                    </div>
                  </div>

                  <div className="label__cost-row">
                    <span>
                      TOTAL INVESTMENT <b>{count(cost)} RC</b>
                    </span>
                    <span>
                      PROJECTED NET{' '}
                      <b className={projected.revenue - cost >= 0 ? 'is-up' : 'is-down'}>
                        {projected.revenue - cost >= 0 ? '+' : ''}
                        {count(projected.revenue - cost)} RC
                      </b>
                    </span>
                  </div>

                  <button
                    className="btn btn--primary label__greenlight"
                    disabled={Boolean(activeAlbum) || cost > team.credits}
                    onClick={greenlight}
                  >
                    GREENLIGHT · {count(cost)} RC <i>→</i>
                  </button>
                  {activeAlbum && (
                    <p className="label__field-note is-warn">
                      {activeArtist.name} already has “{activeAlbum.title}” in production.
                    </p>
                  )}
                  {cost > team.credits && !activeAlbum && (
                    <p className="label__field-note is-warn">
                      Not enough credits. Win shows or wait for catalog royalties.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {tab === 'ledger' && (
          <section className="label__panel">
            <header className="label__panel-head">
              <span>EXPENSE REPORTS · {pending.length} PENDING</span>
              <em>{count(team.credits)} RC AVAILABLE</em>
            </header>
            <p className="label__section-note">
              Approving an invoice keeps the roster loyal and the reputation clean. Denying one saves
              cash but the artist remembers it.
            </p>
            {pending.length ? (
              <ul className="label__expenses">
                {pending.map((expense) => (
                  <li key={expense.id}>
                    <span className="label__expense-week">W{String(expense.week).padStart(2, '0')}</span>
                    <div className="label__expense-copy">
                      <b>{expense.title}</b>
                      <span>{expense.detail}</span>
                    </div>
                    <span className="label__expense-amount">{count(expense.amount)} RC</span>
                    <div className="label__expense-actions">
                      <button
                        className="btn btn--primary btn--sm"
                        disabled={team.credits < expense.amount}
                        onClick={() => {
                          onReviewExpense(expense.id, true)
                          flashNotice(`INVOICE APPROVED · ${count(expense.amount)} RC`)
                        }}
                      >
                        APPROVE
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          onReviewExpense(expense.id, false)
                          flashNotice(`INVOICE DENIED · ${expense.title}`)
                        }}
                      >
                        DENY
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="label__empty-copy">No pending invoices. The books are clean.</p>
            )}

            <header className="label__panel-head label__panel-head--sub">
              <span>LEDGER HISTORY</span>
              <em>{label.ledger.length} ENTRIES</em>
            </header>
            {label.ledger.length ? (
              <ul className="label__ledger">
                {label.ledger.map((entry) => (
                  <li key={entry.id}>
                    <span>W{String(entry.week).padStart(2, '0')}</span>
                    <b>{entry.text}</b>
                    <em className={entry.amount >= 0 ? 'is-up' : ''}>
                      {entry.amount > 0 ? '+' : ''}
                      {entry.amount ? count(entry.amount) : '—'}
                    </em>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="label__empty-copy">No ledger entries yet.</p>
            )}
          </section>
        )}

        {tab === 'crisis' && (
          <section className="label__panel">
            <header className="label__panel-head">
              <span>CRISIS ROOM · {openCrises.length} OPEN</span>
              <em>ALL DECISIONS ARE FINAL</em>
            </header>
            <p className="label__section-note">
              Scandals, leaks, beef and shakedowns land on the Vice President’s desk. Resolve every
              open crisis before advancing the week.
            </p>
            {openCrises.length ? (
              <div className="label__crises">
                {openCrises.map((crisis) => {
                  const artist = getArtist(crisis.artistId)
                  return (
                    <article className="label__crisis" key={crisis.id}>
                      <span className="label__crisis-kind">{crisis.kind}</span>
                      <h3>{crisis.title}</h3>
                      <p>{crisis.detail}</p>
                      <div className="label__options">
                        {crisis.options.map((option) => (
                          <button
                            key={option.id}
                            disabled={team.credits < option.cost}
                            onClick={() => {
                              onResolveCrisis(crisis.id, option.id)
                              flashNotice(`${crisis.kind} HANDLED · ${option.label}`)
                            }}
                            title={option.outcome}
                          >
                            <b>{option.label}</b>
                            <span>
                              {option.cost > 0 ? `${count(option.cost)} RC` : 'NO COST'}
                              <em className={option.rep >= 0 ? 'is-up' : 'is-down'}>
                                {option.rep >= 0 ? '+' : ''}
                                {option.rep} REP
                              </em>
                            </span>
                          </button>
                        ))}
                      </div>
                      <span className="label__crisis-artist">
                        ON THE DESK FOR {artist.name}
                      </span>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="label__empty">
                <b>NO FIRES THIS WEEK.</b>
                <p>
                  The roster is quiet, the phones are calm and the label is one clean week away from
                  something going wrong.
                </p>
              </div>
            )}

            {label.crises.some((crisis) => crisis.status === 'RESOLVED') && (
              <>
                <header className="label__panel-head label__panel-head--sub">
                  <span>RESOLVED</span>
                  <em>THE PAPER TRAIL</em>
                </header>
                <ul className="label__resolved">
                  {label.crises
                    .filter((crisis) => crisis.status === 'RESOLVED')
                    .slice(0, 6)
                    .map((crisis) => (
                      <li key={crisis.id}>
                        <b>
                          {crisis.kind} · {getArtist(crisis.artistId).name}
                        </b>
                        <span>{crisis.resolution}</span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>
        )}

        <footer className="label__foot">
          <span>
            {team.labelName} · {role.name} · WEEK {String(label.week).padStart(2, '0')} · SEASON 01
          </span>
          <button className="link-btn" onClick={onBack}>
            BACK TO THE SHOW
          </button>
        </footer>
      </div>

      {trackOpen && activeTrack && activeTrack.embedUrl && activeArtist && (
        <TrackPlayer
          title={activeTrack.title}
          artist={activeArtist.name}
          mood={activeTrack.mood}
          embedUrl={activeTrack.embedUrl}
          onClose={() => setTrackOpen(false)}
        />
      )}

    </main>
  )
}

