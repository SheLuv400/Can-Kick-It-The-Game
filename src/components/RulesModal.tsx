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
                artist. Star your <b>starting five</b> in the Deck Builder: those five are guaranteed in your
                opening hand.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">02</span>
            <div>
              <h3>HYPE</h3>
              <p>
                You open with <b>8 Hype</b>, gain <b>+3</b> each turn, and can bank up to <b>24</b>.
                Summoning, Crate draws and Backstage recalls spend it. Attacks are free. Cutting an
                artist returns <b>1 Hype</b> at cost 1–3, <b>2</b> at 5, and more as the card gets stronger;
                knockouts and big signings also feed the meter.
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
                directly on the Crowd Meter. If both rooms are level when round 12 closes, the show is
                declared a <b>draw</b> — the crowd gets the points, neither player takes the win.
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
                hit for the whole crew plus <b>+1 Hype</b>. It uses your entire attack allowance for the
                round: no other attack can follow it. Stack the crew and cash it in.
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
                The venue closes after round 12. The bigger surviving room takes the night. If both
                crowds are exactly level, the match is a <b>draw</b>. There is no overtime — only encores.
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
                Pay <b>2 Hype</b> to draw one weighted special card from <b>The Crate</b>. Drawing no
                longer ends your turn. Special cards stay in a six-card hand and can be used in the same
                round once drawn. Expansion 01 adds attacks, heals, debuffs and utility. Duplicates stack
                up to ×3; unique cards like Rewind and Call Back never stack.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">11</span>
            <div>
              <h3>MOVE LOADOUTS</h3>
              <p>
                Each artist has <b>15 normal moves</b> — ten unlock through levels 2–10 — and equips exactly
                <b> three</b>. Click an artist on stage to open their equipped moves. Each artist can move
                once per turn, and each player gets <b>3 attacks per turn</b>. Attacks cost <b>0 Hype</b>.
                Any attack that lands <b>7+ power</b> or deals <b>8+ damage</b> ends the turn. A signature
                special unlocks at level 5, is never equipped, and fires once after building 3 Spotlight.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">12</span>
            <div>
              <h3>ELEMENTS &amp; BACKSTAGE</h3>
              <p>
                Fire burns, Poison ticks, Ice chills, Electricity drains Hype, Wind hits twice, Earth
                shields, Water heals and Light protects. Call Back on Stage costs <b>10–15 Hype</b> based on
                the artist's strength and level, needs an open stage slot, and cannot attack immediately.
                You may call multiple artists back if you can pay.
              </p>
            </div>
          </section>
          <section className="rules__item">
            <span className="rules__num">13</span>
            <div>
              <h3>ONLINE · CASUAL &amp; RANKED</h3>
              <p>
                Sign in with a saved CIKI username and password. Add friends by six-character code,
                see who is <b>online</b>, <b>playing</b> or <b>offline</b>, and send match invites from
                the friend list. <b>Casual</b> strips custom levels and loadouts to level 1 defaults;
                <b>Ranked</b> uses your full collection and records the result on the leaderboard.
              </p>
            </div>
          </section>
        </div>

        <footer className="rules__foot">
          <span>
            <b>26</b> slots · <b>5</b> stage positions · <b>3</b> attacks / turn · <b>3</b> equipped · <b>24</b> Hype cap · <b>2</b> online modes
          </span>
          <button className="btn btn--primary btn--sm" onClick={onClose}>
            GOT IT — RUN IT BACK
          </button>
        </footer>
      </div>
    </div>
  )
}
