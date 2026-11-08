import { useState, type CSSProperties } from 'react'
import type { Artist } from '../game/types'
import {
  battleStatsFor,
  defaultLoadout,
  ELEMENT_META,
  isMoveUnlocked,
  moveTypeLabel,
  movesForArtist,
  MAX_CARD_LEVEL,
  MAX_EQUIPPED_MOVES,
  moveUnlockLevel,
  sanitizeLoadout,
  SPECIAL_CHARGE_MAX,
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
  const normalMoves = moves.filter((move) => !move.special)
  const special = moves.find((move) => move.special)
  const [draft, setDraft] = useState(() => sanitizeLoadout(artist.id, loadout, level))
  const [notice, setNotice] = useState<string | null>(null)
  const stats = battleStatsFor(artist, level)
  const element = ELEMENT_META[artist.battle.element]
  const xpInLevel = xp % XP_PER_LEVEL
  const progressPct = level >= MAX_CARD_LEVEL ? 100 : Math.min(100, (xpInLevel / XP_PER_LEVEL) * 100)
  const specialUnlocked = Boolean(special && level >= (special.unlockLevel ?? 5))

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
        <header className="modal__head loadout-head">
          <div className="loadout-head__title">
            <span className="kicker">MIXTAPE STUDIO · SIDE A · LEVEL {level}</span>
            <h2>THE SETLIST</h2>
            <p className="loadout-head__sub">THREE CUTS MAKE THE SET · NO SKIPS</p>
          </div>
          <div className="loadout-head__stamp" aria-hidden="true">
            <b>03</b>
            <span>CUTS<br />MAX</span>
          </div>
          <button className="icon-btn loadout-head__close" onClick={onClose} aria-label="Close">
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
              <b>LEVEL {level} / {MAX_CARD_LEVEL}</b>
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
              <div className="loadout-stat loadout-stat--element" style={{ '--element-color': element.color } as CSSProperties}>
                <span>ELEMENT</span>
                <b>{element.icon} {element.label}</b>
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
              <b>{level >= MAX_CARD_LEVEL ? 'MAX' : `${xpInLevel}/${XP_PER_LEVEL} XP`}</b>
            </div>
          </aside>

          <section className="loadout-equipped">
            <div className="loadout-section-head">
              <span>THE SETLIST</span>
              <b>{draft.length}/3 CUTS</b>
            </div>
            <div className="loadout-equipped__slots">
              {[0, 1, 2].map((index) => {
                const move = draft[index] ? moves.find((entry) => entry.id === draft[index]) : null
                const slotElement = move?.element ? ELEMENT_META[move.element] : null
                const slotStyle = slotElement
                  ? ({ '--move-color': slotElement.color } as CSSProperties)
                  : undefined
                return (
                  <button
                    className={`loadout-slot ${move ? 'is-filled' : 'is-empty'}`}
                    key={index}
                    style={slotStyle}
                    data-slot={`0${index + 1}`}
                    onClick={() => move && equip(move.id)}
                    title={move ? `Remove ${move.name}` : 'Empty move slot'}
                  >
                    <span className="loadout-slot__top">
                      <span className="loadout-slot__label">TRACK {String(index + 1).padStart(2, '0')}</span>
                      <em className={move ? 'loadout-slot__remove' : 'loadout-slot__open'}>
                        {move ? 'REMOVE' : 'OPEN'}
                      </em>
                    </span>
                    <b>{move?.name ?? 'OPEN SLOT'}</b>
                    <i className="loadout-slot__meta">
                      {move ? (
                        <>
                          <span className="loadout-slot__element">
                            {slotElement ? `${slotElement.icon} ` : ''}
                            {moveTypeLabel(move.type)}
                          </span>
                          <span className="loadout-slot__cost">{move.cost} HYPE</span>
                        </>
                      ) : (
                        <span className="loadout-slot__hint">CHOOSE A MOVE FROM THE POOL</span>
                      )}
                    </i>
                    {move && <em className="loadout-slot__desc">{move.description}</em>}
                  </button>
                )
              })}
            </div>
            <p className="loadout-passive">
              Equip exactly three moves from the artist’s full pool. Click an equipped move to remove it, then choose a replacement from the unlocked moves below.
            </p>
            {special && (
              <div className={`loadout-special ${specialUnlocked ? 'is-unlocked' : 'is-locked'}`}>
                <span>
                  ★ SIGNATURE SPECIAL · {specialUnlocked ? `BUILD ${SPECIAL_CHARGE_MAX} SPOTLIGHT IN BATTLE` : `UNLOCKS LEVEL ${special.unlockLevel ?? 5}`}
                </span>
                <b>{special.name}</b>
                <p>{special.description}</p>
                <em>{special.cost} HYPE · NOT EQUIPPED — IT BUILDS ON THE ARTIST</em>
              </div>
            )}
          </section>

          <section className="loadout-pool">
            <div className="loadout-section-head">
              <span>CRATE CUTS</span>
              <b>{normalMoves.filter((move) => isMoveUnlocked(move, level)).length} UNLOCKED</b>
            </div>
            <p className="loadout-pool__hint">TAP A CUT TO SWAP IT INTO THE SETLIST</p>
            <div className="loadout-pool__list">
              {normalMoves.map((move, index) => {
                const unlocked = isMoveUnlocked(move, level)
                const equipped = draft.includes(move.id)
                const moveElement = move.element ? ELEMENT_META[move.element] : null
                return (
                  <button
                    className={`loadout-move ${equipped ? 'is-on' : ''} ${!unlocked ? 'is-locked' : ''}`}
                    key={move.id}
                    style={moveElement ? ({ '--move-color': moveElement.color } as CSSProperties) : undefined}
                    onClick={() => equip(move.id)}
                    disabled={!unlocked}
                  >
                    <span className="loadout-move__track" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span className="loadout-move__type">
                      {moveElement && <i className="loadout-move__dot" style={{ background: moveElement.color }} aria-hidden="true" />}
                      {moveTypeLabel(move.type)}
                    </span>
                    <b>{move.name}</b>
                    <p>{move.description}</p>
                    <span className={`loadout-move__cost ${move.cost === 0 ? 'is-free' : ''}`}>{move.cost} HYPE</span>
                    <em>
                      {equipped
                        ? 'IN LOADOUT'
                        : !unlocked
                          ? `UNLOCKS LVL ${moveUnlockLevel(move)}`
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
          <span>Only 3 moves may be equipped. Reach level 10 to unlock all ten mastery moves, plus the signature special at level 5. Cards can be ground to level {MAX_CARD_LEVEL}.</span>
          <button className="btn btn--primary btn--sm" onClick={save} disabled={draft.length !== 3}>
            SAVE LOADOUT
          </button>
        </footer>
      </div>
    </div>
  )
}
