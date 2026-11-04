import { useState } from 'react'
import type { Artist } from '../game/types'
import {
  battleStatsFor,
  defaultLoadout,
  ELEMENT_META,
  isMoveUnlocked,
  moveTypeLabel,
  movesForArtist,
  MAX_EQUIPPED_MOVES,
  sanitizeLoadout,
  XP_PER_LEVEL,
} from '../game/moves'
import { GameIcon } from './GameIcon'
import { Portrait } from './Portrait'

interface MoveLoadoutProps {
  artist: Artist
  level: number
  xp: number
  loadout: string[]
  onChange: (loadout: string[]) => void
  onClose: () => void
}

export function MoveLoadout({ artist, level, xp, loadout, onChange, onClose }: MoveLoadoutProps) {
  const moves = movesForArtist(artist.id)
  const [draft, setDraft] = useState(() => sanitizeLoadout(artist.id, loadout, level))
  const [notice, setNotice] = useState<string | null>(null)
  const stats = battleStatsFor(artist, level)
  const element = ELEMENT_META[artist.battle.element]
  const xpInLevel = xp % XP_PER_LEVEL
  const progressPct = level >= 5 ? 100 : Math.min(100, (xpInLevel / XP_PER_LEVEL) * 100)

  const equip = (moveId: string) => {
    const move = moves.find((entry) => entry.id === moveId)
    if (!move || !isMoveUnlocked(move, level)) return
    if (draft.includes(moveId)) {
      setDraft(draft.filter((id) => id !== moveId))
      setNotice('Unequipped. That move slot is now open.')
      return
    }
    if (draft.length >= MAX_EQUIPPED_MOVES) {
      const next = [...draft.slice(0, MAX_EQUIPPED_MOVES - 1), moveId]
      setDraft(next)
      setNotice('Replaced the third equipped move. Save to lock it in.')
      return
    }
    setDraft([...draft, moveId])
    setNotice(null)
  }

  const save = () => {
    if (draft.length !== MAX_EQUIPPED_MOVES) {
      setNotice('EQUIP EXACTLY 3 MOVES BEFORE SAVING.')
      return
    }
    onChange(draft)
    onClose()
  }

  return (
    <div className="modal loadout-modal" role="dialog" aria-modal="true" aria-label={`${artist.name} loadout`}>
      <button className="modal__scrim" onClick={onClose} aria-label="Close" />
      <div className="modal__panel loadout-panel loadout-panel--wide">
        <header className="modal__head">
          <div>
            <span className="kicker">MIXTAPE STUDIO · ARTIST LOADOUT · LEVEL {level}</span>
            <h2>EQUIP THREE MOVES</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <GameIcon name="close" />
          </button>
        </header>

        <div className="loadout-grid">
          <aside className="loadout-artist">
            <div className="loadout-portrait">
              <Portrait artist={artist} />
              <span className="loadout-portrait__slot">{artist.slot}</span>
            </div>
            <div className="loadout-artist__meta">
              <span>{artist.genre} · {artist.eraLabel}</span>
              <b>LEVEL {level}</b>
            </div>
            <h3>{artist.name}</h3>
            <span className="loadout-artist__genre">{artist.crew} · {artist.city}</span>

            <div className="loadout-stat-grid">
              <div className="loadout-stat">
                <span>MAX HP</span>
                <b>{stats.hp}</b>
              </div>
              <div className="loadout-stat">
                <span>ATTACK</span>
                <b>{stats.attack}</b>
              </div>
              <div className="loadout-stat">
                <span>DEFENSE</span>
                <b>{stats.defense}</b>
              </div>
              <div className="loadout-stat" style={{ borderColor: element.color }}>
                <span>ELEMENT</span>
                <b style={{ color: element.color }}>{element.icon} {element.label}</b>
              </div>
            </div>

            <div className="loadout-passive">
              <span>SIGNATURE PASSIVE</span>
              <b>{artist.battle.passive.name}</b>
              <i>{artist.battle.passive.description}</i>
            </div>

            <div className="loadout-xp">
              <span>MASTERY</span>
              <div><i style={{ width: `${progressPct}%` }} /></div>
              <b>{level >= 5 ? 'MAX' : `${xpInLevel}/${XP_PER_LEVEL} XP`}</b>
            </div>
          </aside>

          <section className="loadout-equipped">
            <div className="loadout-section-head">
              <span>EQUIPPED MOVES</span>
              <b>{draft.length}/3</b>
            </div>
            <div className="loadout-equipped__slots">
              {[0, 1, 2].map((index) => {
                const move = draft[index] ? moves.find((entry) => entry.id === draft[index]) : null
                return (
                  <button
                    className={`loadout-slot ${move ? 'is-filled' : ''}`}
                    key={index}
                    onClick={() => move && equip(move.id)}
                    title={move ? 'Remove this move' : 'Empty move slot'}
                  >
                    <span>
                      SLOT {index + 1}
                      {move && <em className="loadout-slot__remove">CLICK TO UNEQUIP</em>}
                    </span>
                    <b>{move?.name ?? 'OPEN SLOT'}</b>
                    <i>{move ? `${move.cost} HYPE · ${moveTypeLabel(move.type)}` : 'SELECT A MOVE FROM THE POOL'}</i>
                    {move && <em>{move.description}</em>}
                  </button>
                )
              })}
            </div>
            <p className="loadout-passive">
              Every artist brings exactly three moves into a battle. Click an equipped move to remove it, then choose a replacement from the unlocked pool.
            </p>
          </section>

          <section className="loadout-pool">
            <div className="loadout-section-head">
              <span>AVAILABLE MOVES</span>
              <b>{moves.filter((move) => isMoveUnlocked(move, level)).length} UNLOCKED</b>
            </div>
            <div className="loadout-pool__list">
              {moves.map((move) => {
                const unlocked = isMoveUnlocked(move, level)
                const equipped = draft.includes(move.id)
                const moveElement = move.element ? ELEMENT_META[move.element] : null
                return (
                  <button
                    className={`loadout-move ${equipped ? 'is-on' : ''} ${!unlocked ? 'is-locked' : ''}`}
                    key={move.id}
                    onClick={() => equip(move.id)}
                    disabled={!unlocked}
                  >
                    <span className="loadout-move__type" style={moveElement ? { color: moveElement.color } : undefined}>
                      {moveElement ? `${moveElement.icon} ` : ''}
                      {moveTypeLabel(move.type)}
                    </span>
                    <b>{move.name}</b>
                    <p>{move.description}</p>
                    <span className="loadout-move__cost">{move.cost} HYPE</span>
                    <em>
                      {equipped
                        ? 'EQUIPPED'
                        : !unlocked
                          ? move.id.endsWith('-move-1')
                            ? 'UNLOCKS LVL 2'
                            : 'UNLOCKS LVL 3'
                          : 'EQUIP'}
                    </em>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {notice && <p className="loadout-notice">{notice}</p>}

        <footer className="loadout-foot">
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setDraft(defaultLoadout(artist.id))}
          >
            RESET DEFAULT
          </button>
          <span>Only 3 moves may be equipped. Level this artist in battle to unlock the heavy and utility moves.</span>
          <button className="btn btn--primary btn--sm" onClick={save} disabled={draft.length !== 3}>
            SAVE LOADOUT
          </button>
        </footer>
      </div>
    </div>
  )
}
