import { useMemo, useState, type CSSProperties } from 'react'
import type { Artist, ArtistProgress, Crew, Genre, ThemeId } from '../game/types'
import { ARTISTS, CREW_META, GENRES, getArtist } from '../game/roster'
import { DEFAULT_DECK, LINEUP_SIZE } from '../game/settings'
import { buzzState } from '../game/ultimate'
import { loadoutFor, progressFor } from '../game/moves'
import { Card } from '../components/Card'
import { MoveLoadout } from '../components/MoveLoadout'

interface DeckBuilderProps {
  theme: ThemeId
  deck: string[]
  lineup: string[]
  credits: number
  buzz: number
  progress: Record<string, ArtistProgress>
  personalArtist?: Artist | null
  allowPersonal?: boolean
  onSave: (deck: string[], lineup: string[]) => void
  onLoadoutChange: (artistId: string, loadout: string[]) => void
  onPlay: (deck: string[], lineup: string[]) => void
  onBack: () => void
}

const TOTAL_SLOTS = 26

function overallOf(artist: Artist) {
  if (artist.personal) return artist.personal.ovr
  return Math.min(99, Math.round(69 + artist.bars * 2.1 + artist.cost * 1.3 + artist.encore.bars * 0.4))
}

function starterSlots(deck: string[], lineup: string[]): number[] {
  const used = new Set<number>()
  const slots: number[] = []
  for (const id of lineup) {
    const index = deck.findIndex((card, candidate) => card === id && !used.has(candidate))
    if (index === -1) continue
    used.add(index)
    slots.push(index)
    if (slots.length >= LINEUP_SIZE) break
  }
  return slots
}

function fillStarterSlots(deck: string[], current: number[]): number[] {
  const slots = current
    .filter((index, position) => index >= 0 && index < deck.length && current.indexOf(index) === position)
    .slice(0, LINEUP_SIZE)
  for (let index = 0; index < deck.length && slots.length < LINEUP_SIZE; index += 1) {
    if (!slots.includes(index)) slots.push(index)
  }
  return slots
}

export function DeckBuilder({
  deck,
  lineup,
  credits,
  buzz,
  progress,
  personalArtist = null,
  allowPersonal = false,
  onSave,
  onLoadoutChange,
  onPlay,
  onBack,
}: DeckBuilderProps) {
  const [draft, setDraft] = useState<string[]>(deck)
  const [lineupSlots, setLineupSlots] = useState<number[]>(() => starterSlots(deck, lineup))
  const [loadoutArtistId, setLoadoutArtistId] = useState<string | null>(null)
  const [genre, setGenre] = useState<Genre | 'ALL'>('ALL')
  const [crew, setCrew] = useState<Crew | 'ALL'>('ALL')
  const [era, setEra] = useState<'ALL' | '90s' | '00s'>('ALL')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'roster' | 'personal'>('roster')
  const [toast, setToast] = useState<string | null>(null)
  const rank = buzzState(buzz)
  const ready = draft.length === TOTAL_SLOTS && lineupSlots.length === LINEUP_SIZE

  const copies = useMemo(() => {
    const map = new Map<string, number>()
    draft.forEach((id) => map.set(id, (map.get(id) ?? 0) + 1))
    return map
  }, [draft])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ARTISTS.filter((artist) => {
      if (genre !== 'ALL' && artist.genre !== genre) return false
      if (crew !== 'ALL' && artist.crew !== crew) return false
      if (era !== 'ALL') {
        const year = Number(artist.eraLabel)
        if (era === '90s' && (year < 1990 || year > 1999)) return false
        if (era === '00s' && (year < 2000 || year > 2009)) return false
      }
      if (!q) return true
      return (
        artist.name.toLowerCase().includes(q) ||
        artist.crew.toLowerCase().includes(q) ||
        artist.city.toLowerCase().includes(q) ||
        artist.eraLabel.includes(q) ||
        artist.slot.toLowerCase() === q
      )
    })
  }, [genre, crew, era, query])

  const stats = useMemo(() => {
    const byGenre: Record<string, number> = { 'HIP-HOP': 0, 'R&B': 0, POP: 0 }
    const byCrew: Record<string, number> = {}
    let cost = 0
    let bars = 0
    let defensive = 0

    draft.forEach((id) => {
      const artist = getArtist(id)
      byGenre[artist.genre] = (byGenre[artist.genre] ?? 0) + 1
      byCrew[artist.crew] = (byCrew[artist.crew] ?? 0) + 1
      cost += artist.cost
      bars += artist.bars
      if (artist.effects.some((effect) => effect.kind === 'heal' || effect.kind === 'shield')) {
        defensive += 1
      }
    })

    const count = draft.length
    const avgOverall = count
      ? Math.round(draft.reduce((sum, id) => sum + overallOf(getArtist(id)), 0) / count)
      : 0
    const maxCrew = Math.max(0, ...Object.values(byCrew))
    const topCrew = Object.entries(byCrew).sort((a, b) => b[1] - a[1])[0]
    const topGenre = Object.entries(byGenre).sort((a, b) => b[1] - a[1])[0]
    const synergy = count ? Math.round(50 + (maxCrew / count) * 50) : 0
    const offense = count ? Math.min(99, Math.round((bars / count) * 19)) : 0
    const defense = count ? Math.min(99, Math.round(50 + (defensive / count) * 50)) : 0
    const gradeScore = count ? Math.round((avgOverall + synergy + offense + defense) / 4) : 0
    const grade =
      gradeScore >= 90 ? 'A+' : gradeScore >= 85 ? 'A' : gradeScore >= 78 ? 'B+' : gradeScore >= 70 ? 'B' : 'C'
    const identity =
      count && topCrew && topGenre
        ? `${topGenre[0]} · ${CREW_META[topCrew[0] as Crew]?.short ?? '—'}`
        : 'EMPTY MIXTAPE'

    return {
      byGenre,
      byCrew,
      avgCost: count ? (cost / count).toFixed(1) : '—',
      bars,
      avgOverall,
      synergy,
      offense,
      defense,
      grade,
      identity,
    }
  }, [draft])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  const toggleStarter = (index: number) => {
    if (lineupSlots.includes(index)) {
      setLineupSlots(lineupSlots.filter((slot) => slot !== index))
      return
    }
    if (lineupSlots.length >= LINEUP_SIZE) {
      notify('STARTING FIVE FULL — REMOVE A STARTER FIRST')
      return
    }
    setLineupSlots([...lineupSlots, index])
  }

  const add = (id: string) => {
    const personal = id === personalArtist?.id
    if (personal && !allowPersonal) {
      notify('MY ARTIST IS ALLOWED IN CAMPAIGN AND LOCAL CPU DECKS ONLY')
      return
    }
    if (draft.length >= TOTAL_SLOTS) {
      notify('MIXTAPE FULL — CUT A SLOT FIRST')
      return
    }
    if ((copies.get(id) ?? 0) >= (personal ? 1 : 2)) {
      notify(personal ? 'MY ARTIST OCCUPIES EXACTLY ONE SLOT' : 'TWO COPIES MAX PER ARTIST')
      return
    }
    setDraft([...draft, id])
    notify(`${getArtist(id).name} ADDED TO THE MIXTAPE`)
  }

  const removeAt = (index: number) => {
    const artist = getArtist(draft[index])
    setDraft(draft.filter((_, i) => i !== index))
    setLineupSlots(
      lineupSlots
        .filter((slot) => slot !== index)
        .map((slot) => (slot > index ? slot - 1 : slot)),
    )
    notify(`${artist.name} CUT`)
  }

  const clear = () => {
    setDraft([])
    setLineupSlots([])
    notify('MIXTAPE CLEARED — BUILD IT BACK')
  }

  const autoFill = () => {
    const next = [...draft]
    let cursor = 0
    let guard = 0
    while (next.length < TOTAL_SLOTS && guard < 200) {
      guard += 1
      const artist = ARTISTS[cursor % ARTISTS.length]
      cursor += 1
      const count = next.filter((id) => id === artist.id).length
      if (count < 2) next.push(artist.id)
    }
    setDraft(next)
    setLineupSlots((current) => fillStarterSlots(next, current))
    notify('AUTO-FILLED — TUNE IT YOUR WAY')
  }

  const signature = () => {
    const keepPersonal = personalArtist && draft.includes(personalArtist.id)
    const next = keepPersonal ? [personalArtist.id, ...DEFAULT_DECK.slice(0, TOTAL_SLOTS - 1)] : DEFAULT_DECK
    setDraft(next)
    setLineupSlots(fillStarterSlots(next, []))
    notify(keepPersonal ? 'SIGNATURE 25 + MY ARTIST LOADED' : 'SIGNATURE 26 LOADED')
  }

  const starters = () =>
    lineupSlots.map((index) => draft[index]).filter((id): id is string => Boolean(id))

  const save = () => {
    if (draft.length !== TOTAL_SLOTS) {
      notify('A MIXTAPE NEEDS EXACTLY 26 SLOTS')
      return
    }
    if (lineupSlots.length !== LINEUP_SIZE) {
      notify(`PICK ${LINEUP_SIZE} STARTERS FOR YOUR OPENING HAND`)
      return
    }
    onSave(draft, starters())
    notify('MIXTAPE & STARTING FIVE SAVED')
  }

  const play = () => {
    if (draft.length !== TOTAL_SLOTS) {
      notify('A MIXTAPE NEEDS EXACTLY 26 SLOTS')
      return
    }
    if (lineupSlots.length !== LINEUP_SIZE) {
      notify(`PICK ${LINEUP_SIZE} STARTERS FOR YOUR OPENING HAND`)
      return
    }
    onPlay(draft, starters())
  }

  return (
    <main className="subscreen builder">
      <header className="subpage__top">
        <button className="link-btn" onClick={onBack}>
          ← THE SHOW
        </button>
        <span className="subpage__crumb">MIXTAPE DECK BUILDER · 26 SLOTS</span>
        <div className="builder__wallet">
          <span>
            <i>RC</i>
            <b>{credits.toLocaleString('en-US')}</b>
          </span>
          <span>
            <i>BUZZ</i>
            <b>
              {rank.tier} {rank.rank}
            </b>
          </span>
        </div>
        <div className="subpage__actions">
          <button className="btn btn--ghost btn--sm" onClick={save} disabled={!ready}>
            SAVE
          </button>
          <button className="btn btn--primary btn--sm" onClick={play} disabled={!ready}>
            SAVE &amp; PLAY
          </button>
        </div>
      </header>

      <div className="builder__body">
        <section className="builder__deck">
          <div className="builder__deck-head">
            <div>
              <p className="kicker">THE MIXTAPE</p>
              <h1>
                MIXTAPE <em>DECK BUILDER</em>
              </h1>
            </div>
            <span className={`builder__count ${draft.length === TOTAL_SLOTS ? 'is-full' : ''}`}>
              {String(draft.length).padStart(2, '0')}
              <i>/26</i>
            </span>
          </div>

          <section className="builder__lineup" aria-label="Starting five">
            <div className="builder__lineup-head">
              <div className="builder__lineup-title">
                <span className="kicker">STARTING FIVE</span>
                <b>
                  {lineupSlots.length}/{LINEUP_SIZE}
                </b>
              </div>
              <p>Your opening hand. Star five mixtape slots to guarantee them in the first draw.</p>
              <div className="builder__lineup-actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setLineupSlots(fillStarterSlots(draft, []))}
                  disabled={draft.length === 0}
                >
                  FIRST FIVE
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setLineupSlots([])}
                  disabled={lineupSlots.length === 0}
                >
                  CLEAR
                </button>
              </div>
            </div>
            <div className="builder__lineup-slots">
              {Array.from({ length: LINEUP_SIZE }).map((_, slot) => {
                const index = lineupSlots[slot]
                const artist = index === undefined ? null : getArtist(draft[index])
                return (
                  <div className={`lineup-slot ${artist ? 'is-filled' : ''}`} key={`starter-${slot}`}>
                    <span className="lineup-slot__num">{String(slot + 1).padStart(2, '0')}</span>
                    {artist ? (
                      <>
                        <b>{artist.name}</b>
                        <i>
                          {artist.genre} · {artist.cost}H
                        </i>
                        <button
                          type="button"
                          onClick={() => index !== undefined && toggleStarter(index)}
                          aria-label={`Remove ${artist.name} from the starting five`}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span className="lineup-slot__empty">OPEN</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <div className="slots" aria-label="Mixtape slots">
            {Array.from({ length: TOTAL_SLOTS }).map((_, index) => {
              const id = draft[index]
              if (!id) {
                return (
                  <div className="slot-row slot-row--empty" key={`empty-${index}`}>
                    <span className="slot-row__num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="slot-row__letter">·</span>
                    <span className="slot-row__name">OPEN SLOT</span>
                    <span className="slot-row__cost">—</span>
                  </div>
                )
              }
              const artist = getArtist(id)
              const isStarter = lineupSlots.includes(index)
              return (
                <div className={`slot-row ${isStarter ? 'is-starter' : ''}`} key={`${id}-${index}`}>
                  <span className="slot-row__num">{String(index + 1).padStart(2, '0')}</span>
                  <span className="slot-row__letter" style={{ color: artist.palette.accent }}>
                    {artist.slot}
                  </span>
                  <span className="slot-row__name">
                    {artist.name}
                    <i>
                      {artist.genre} · ×{copies.get(id) ?? 1}
                    </i>
                  </span>
                  <span className="slot-row__cost">{artist.cost}H</span>
                  <span className="slot-row__bars">{artist.bars}B</span>
                  <button
                    type="button"
                    className={`slot-row__start ${isStarter ? 'is-on' : ''}`}
                    onClick={() => toggleStarter(index)}
                    aria-pressed={isStarter}
                    aria-label={`${isStarter ? 'Remove' : 'Add'} ${artist.name} ${isStarter ? 'from' : 'to'} the starting five`}
                    title="Starting five"
                  >
                    {isStarter ? '★' : '☆'}
                  </button>
                  <button
                    className="slot-row__cut"
                    onClick={() => removeAt(index)}
                    aria-label={`Remove ${artist.name}`}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          <div className="builder__tools">
            <button className="btn btn--ghost btn--sm" onClick={autoFill}>
              AUTO-FILL
            </button>
            <button className="btn btn--ghost btn--sm" onClick={signature}>
              SIGNATURE 26
            </button>
            <button className="btn btn--ghost btn--sm" onClick={clear}>
              CLEAR
            </button>
          </div>

          <div className="builder__stats">
            <div className="builder__analysis-head">
              <span>MIXTAPE ANALYSIS</span>
              <b>{stats.grade}</b>
            </div>
            <div className="builder__analysis-grid">
              <div>
                <span>SYNERGY</span>
                <b>{stats.synergy}%</b>
              </div>
              <div>
                <span>OFFENSE</span>
                <b>{stats.offense}</b>
              </div>
              <div>
                <span>DEFENSE</span>
                <b>{stats.defense}</b>
              </div>
            </div>
            <div className="builder__stat-row">
              <div>
                <span>AVG HYPE</span>
                <b>{stats.avgCost}</b>
              </div>
              <div>
                <span>TOTAL BARS</span>
                <b>{stats.bars}</b>
              </div>
              <div>
                <span>AVG OVR</span>
                <b>{stats.avgOverall}</b>
              </div>
            </div>
            <div className="builder__genre-bars">
              {GENRES.map((g) => (
                <div className="genre-bar" key={g} data-genre={g}>
                  <span>{g}</span>
                  <b>{stats.byGenre[g] ?? 0}</b>
                  <i style={{ width: `${((stats.byGenre[g] ?? 0) / 26) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="builder__crews">
              {Object.entries(CREW_META).map(([name, meta]) => (
                <span key={name} style={{ '--crew-tint': meta.tint } as CSSProperties}>
                  {meta.short} <b>{stats.byCrew[name] ?? 0}</b>
                </span>
              ))}
            </div>
          </div>

          <div className="builder__identity">
            <span>MIXTAPE IDENTITY</span>
            <b>{stats.identity}</b>
            <i>LOCAL READ · NOT A COMBAT RATING</i>
          </div>
        </section>

        <section className="builder__collection">
          <div className="builder__tabs">
            <button className={tab === 'roster' ? 'is-on' : ''} onClick={() => setTab('roster')}>ARTISTS · {ARTISTS.length}</button>
            {allowPersonal && personalArtist && (
              <button className={tab === 'personal' ? 'is-on' : ''} onClick={() => setTab('personal')}>MY ARTIST · LOCAL</button>
            )}
            <span>26-SLOT MIXTAPE</span>
          </div>

          <div className="builder__filters">
            <div className="filter-row">
              <span className="filter-label">GENRE</span>
              <button className={`chip ${genre === 'ALL' ? 'is-on' : ''}`} onClick={() => setGenre('ALL')}>
                ALL
              </button>
              {GENRES.map((g) => (
                <button key={g} className={`chip ${genre === g ? 'is-on' : ''}`} onClick={() => setGenre(g)}>
                  {g}
                </button>
              ))}
            </div>
            <div className="filter-row">
              <span className="filter-label">CREW</span>
              <button className={`chip ${crew === 'ALL' ? 'is-on' : ''}`} onClick={() => setCrew('ALL')}>
                ALL
              </button>
              {(Object.keys(CREW_META) as Crew[]).map((c) => (
                <button key={c} className={`chip ${crew === c ? 'is-on' : ''}`} onClick={() => setCrew(c)}>
                  {CREW_META[c].short}
                </button>
              ))}
              <input
                className="search"
                placeholder="SEARCH ARTIST / CITY / YEAR"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search artists"
              />
            </div>
            <div className="filter-row">
              <span className="filter-label">ERA</span>
              {(['ALL', '90s', '00s'] as const).map((value) => (
                <button key={value} className={`chip ${era === value ? 'is-on' : ''}`} onClick={() => setEra(value)}>
                  {value}
                </button>
              ))}
              <span className="builder__filter-count">{filtered.length} SHOWN</span>
            </div>
          </div>

          <div className="builder__roster-head">
            <span>{tab === 'personal' ? 'MY ARTIST · PERSONAL CARD' : `THE ROSTER · ${ARTISTS.length} FICTIONAL ARTISTS`}</span>
            <i>{tab === 'personal' ? 'EXACTLY ONE SLOT · LOCAL ONLY' : 'CLICK A CARD TO ADD · TWO COPIES MAX'}</i>
          </div>

          <div className="builder__grid">
            {(tab === 'personal' && personalArtist ? [personalArtist] : filtered).map((artist) => {
              const count = copies.get(artist.id) ?? 0
              const level = progressFor(progress, artist.id).level
              const personal = Boolean(artist.personal)
              return (
                <div className={`builder-card ${count > 0 ? 'is-in-deck' : ''} ${personal ? 'builder-card--personal' : ''}`} key={artist.id}>
                  <Card
                    artist={artist}
                    size="grid"
                    onClick={() => add(artist.id)}
                    disabled={count >= (personal ? 1 : 2)}
                  />
                  <span className="builder-card__ovr">
                    <i aria-hidden="true">♛</i>
                    <b>{overallOf(artist)}</b>
                  </span>
                  <span className="builder-card__copies">{count ? `×${count}` : '+'}</span>
                  {count >= (personal ? 1 : 2) && <span className="builder-card__max">{personal ? 'IN DECK' : 'MAX'}</span>}
                  {!personal && (
                    <button
                      className="builder-card__moves"
                      onClick={(event) => {
                        event.stopPropagation()
                        setLoadoutArtistId(artist.id)
                      }}
                      title="Edit three equipped battle moves"
                    >
                      MOVES · L{level}
                    </button>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && tab === 'roster' && <p className="builder__none">NO ARTISTS MATCH THAT FILTER.</p>}
          </div>

          <div className="builder__legend">
            <span>★ 5 STARTERS = OPENING HAND</span>
            <span>CLICK A CARD TO ADD</span>
            <span>×2 MAX PER ARTIST</span>
            <span>26/26 + 5 STARTERS TO PLAY</span>
          </div>
        </section>
      </div>

      {loadoutArtistId && (
        <MoveLoadout
          artist={getArtist(loadoutArtistId)}
          level={progressFor(progress, loadoutArtistId).level}
          xp={progressFor(progress, loadoutArtistId).xp}
          loadout={loadoutFor(progress, loadoutArtistId)}
          onChange={(loadout) => onLoadoutChange(loadoutArtistId, loadout)}
          onClose={() => setLoadoutArtistId(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
