import { useEffect } from 'react'
import { Icon } from './Hud'

export function RulesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="How to play">
      <button className="modal__scrim" onClick={onClose} aria-label="Close" />
      <div className="modal__panel rules">
        <header className="modal__head">
          <div>
            <span className="kicker">THE SETLIST MANUAL</span>
            <h2>HOW THE SHOW RUNS</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close rules">
            ✕
          </button>
        </header>

        <div className="rules__grid">
          <section className="rules__item">
            <span className="rules__num">01</span>
            <div>
              <h3>THE 26 SLOTS</h3>
              <p>
                Your mixtape holds exactly <b>26 artists</b> — one for every slot. Up to two copies of any
                artist. Choose in the Deck Builder and make the crew chemistry work.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">02</span>
            <div>
              <h3>HYPE</h3>
              <p>
                You start with <b>4 Hype</b> and gain <b>+2</b> each turn, up to 12. Every card costs Hype.
                Some artists hand it back. Hype is the tempo of the whole show.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">03</span>
            <div>
              <h3>CROWD METER</h3>
              <p>
                Both camps start sold out at <b>72</b>. Performances damage the opposing artist and put
                pressure on their crowd. Empty their room to win. If their stage is empty, hits land
                directly on the Crowd Meter.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">04</span>
            <div>
              <h3>ERA EVOLUTIONS</h3>
              <p>
                Round 3 evolves the show into <b>ERA II — MAIN STAGE</b> (+1 Bars). Round 6 becomes{' '}
                <b>ERA III — HEADLINE</b> (+2 Bars). Every card on the table evolves with the era.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">05</span>
            <div>
              <h3>ENCORE TRANSFORMATIONS</h3>
              <p>
                Start with one Encore charge and earn another every third card you play. Transform an artist
                on stage into their Encore form for a huge immediate performance. Two charges max.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">06</span>
            <div>
              <h3>FEATURE VERSES</h3>
              <p>
                Two artists from the same crew on stage unlock a Feature Verse — once per round, a combined
                hit for the whole crew plus <b>+1 Hype</b>. Stack the crew and cash it in.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">07</span>
            <div>
              <h3>COUNTERS</h3>
              <p>
                You carry two <b>Clapbacks</b>. When the Headliner drops 5+ damage, a counter window opens:
                halve the hit and gain +1 Hype. The Headliner can also interrupt your 8+ hits.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">08</span>
            <div>
              <h3>CURFEW</h3>
              <p>
                The venue closes after round 12. If both crowds survive, the bigger room takes the night.
                There is no overtime — only encores.
              </p>
            </div>
            <Icon name="star" className="rules__star" />
          </section>
          <section className="rules__item">
            <span className="rules__num">09</span>
            <div>
              <h3>HP &amp; TARGETS</h3>
              <p>
                Every artist has HP, Attack, Defense, Shield HP and a signature passive. Pick an enemy
                card to lock the target before performing. Defeated artists go to <b>Backstage</b>; the
                collectible card and its permanent progress are safe.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">10</span>
            <div>
              <h3>THE CRATE</h3>
              <p>
                Draw one weighted special card from <b>The Crate</b> instead of performing, then end your
                turn. Special cards stay in a six-card hand and can be used starting next turn. The Crate
                holds Spotlights, shields, elements, Skip the Set, Rewind and a one-per-match Call Back.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">11</span>
            <div>
              <h3>THREE MOVES</h3>
              <p>
                Each artist equips exactly <b>three</b> moves from their unlocked pool. Click an artist on
                stage to open their moves, Hype costs and target buttons. Leveling an artist in battle
                unlocks heavy and utility moves that can replace any equipped slot.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">12</span>
            <div>
              <h3>ELEMENTS &amp; BACKSTAGE</h3>
              <p>
                Fire burns, Poison ticks, Ice chills, Electricity drains Hype, Wind hits twice, Earth
                shields, Water heals and Light protects. Call Back on Stage can return one defeated artist
                at full HP to an empty slot, but it cannot attack immediately.
              </p>
            </div>
          </section>
        </div>

        <footer className="rules__foot">
          <span>
            <b>26</b> slots · <b>5</b> stage positions · <b>3</b> moves · <b>6</b> special slots · <b>1</b> room
          </span>
          <button className="btn btn--primary btn--sm" onClick={onClose}>
            GOT IT — RUN IT BACK
          </button>
        </footer>
      </div>
    </div>
  )
}
