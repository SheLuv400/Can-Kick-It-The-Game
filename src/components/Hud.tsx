import type { Artist } from '../game/types'
import { AdvisorVinyls } from './AdvisorVinyls'
import { Portrait } from './Portrait'

interface AdvisorHud {
  charges: number
  max: number
  onAsk: () => void
  disabled: boolean
}

interface HudSide {
  name: string
  crowd: number
  maxCrowd: number
  hype: number
  maxHype?: number
  attacksLeft?: number
  shield: number
  counters: number
  encoreCharges: number
  avatar?: Artist
  advisor?: AdvisorHud
}

interface HitEvent {
  side: 'player' | 'rival'
  value: number
  nonce: number
}

interface HudStripProps {
  player: HudSide
  rival: HudSide
  round: number
  era: 1 | 2 | 3
  lastHit?: HitEvent | null
  difficulty?: string
  showLevels?: boolean
}

const ICON = {
  bolt: 'M13.2 2 4 13.6h5.7L9.2 22l9.4-12h-5.9z',
  shield: 'M12 2 4.5 5v6.1c0 4.8 3.1 8.1 7.5 10.9 4.4-2.8 7.5-6.1 7.5-10.9V5z',
  star: 'm12 2.4 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.1 1.2-6.5L2.5 9.3l6.6-.9z',
  clap: 'M4.4 9.3h4.2L7.3 5.7h3.1l2.3 5.2h3.6V7l3.3 5-3.3 5v-4.2h-4.7l-1.6 4.2H6.9l1.9-4.7H4.4z',
  crowd: 'M4 20v-5.2c0-2.1 1.5-3.6 3.4-3.6s3.4 1.5 3.4 3.6V20H4Zm9.2 0v-7.4c0-2.3 1.6-4 3.6-4s3.6 1.7 3.6 4V20h-7.2ZM7.4 9.6a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Zm9.2 1.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  shieldTick: 'M12 2 4.5 5v6.1c0 4.8 3.1 8.1 7.5 10.9 4.4-2.8 7.5-6.1 7.5-10.9V5z',
}

export function Icon({ name, className = '' }: { name: keyof typeof ICON; className?: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICON[name]} fill="currentColor" />
    </svg>
  )
}

function CrowdMeter({
  data,
  side,
  hit,
  showLevels,
}: {
  data: HudSide
  side: 'player' | 'rival'
  hit?: HitEvent | null
  showLevels: boolean
}) {
  const pct = Math.max(0, Math.min(100, (data.crowd / data.maxCrowd) * 100))
  const low = pct <= 30
  return (
    <div className={`crowd crowd--${side} ${low ? 'is-low' : ''}`}>
      <div className="crowd__top">
        <span className="crowd__side">
          {data.avatar && (
            <span className="crowd__avatar" aria-hidden="true">
              <Portrait artist={data.avatar} crop="avatar" />
            </span>
          )}
          <span>{side === 'player' ? 'YOUR CROWD' : 'THEIR CROWD'}</span>
        </span>
        <span className="crowd__name">{data.name}</span>
        <span className="crowd__value">
          {data.crowd}
          <i>/{data.maxCrowd}</i>
        </span>
      </div>
      <div className="meter">
        <div className="meter__track">
          <div className="meter__fill" style={{ width: `${pct}%` }}>
            <span className="meter__shine" />
          </div>
          <div className="meter__ticks" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
          <span className="meter__shine-line" />
        </div>
        {hit && (
          <span key={hit.nonce} className="meter__hit">
            −{hit.value}
          </span>
        )}
      </div>
      <div className="crowd__hype">
        <span className="hype-chip">
          <Icon name="bolt" className="icon--bolt" />
          <span>HYPE</span>
          <b>{String(data.hype).padStart(2, '0')}</b>
          <i>/{data.maxHype ?? 24}</i>
        </span>
        <span className="hype__ticks" aria-hidden="true">
          {Array.from({ length: data.maxHype ?? 24 }).map((_, i) => (
            <span key={i} className={i < data.hype ? 'is-on' : ''} />
          ))}
        </span>
        {typeof data.attacksLeft === 'number' && (
          <span className="hype-chip hype-chip--attacks" title="Attacks left this turn">
            <span>ATTACKS</span>
            <b>{data.attacksLeft}</b>
          </span>
        )}
        {showLevels && <span className={`crowd__level ${low ? 'is-low' : ''}`}>{low ? 'CROWD LEAVING' : 'IN THE PALM'}</span>}
      </div>
      <div className="crowd__tokens">
        <span className="token" title="Clapback counters left">
          <Icon name="clap" />
          <b>{data.counters}</b>
          <span>CLAPBACK</span>
        </span>
        <span className="token" title="Encore charges">
          <Icon name="star" />
          <b>{data.encoreCharges}</b>
          <span>ENCORE</span>
        </span>
        {data.shield > 0 && (
          <span className="token token--shield" title="Shield absorbs incoming crowd damage">
            <Icon name="shield" />
            <b>{data.shield}</b>
            <span>SHIELD</span>
          </span>
        )}
      </div>
      {data.advisor && (
        <div className={`advisor-hud ${data.advisor.charges <= 0 ? 'is-off' : ''}`}>
          <button
            className="advisor-hud__ask"
            onClick={data.advisor.onAsk}
            disabled={data.advisor.disabled || data.advisor.charges <= 0}
            title={
              data.advisor.charges <= 0
                ? 'DJ Kickit is off the clock — 0/2'
                : data.advisor.disabled
                  ? 'Wait for your turn to ask for advice'
                  : 'Ask DJ Kickit for one local read'
            }
          >
            <AdvisorVinyls charges={data.advisor.charges} max={data.advisor.max} />
            <span>ASK DJ KICKIT</span>
            <b>{data.advisor.charges}/{data.advisor.max}</b>
          </button>
          {data.advisor.charges <= 0 && (
            <span className="advisor-hud__off">DJ KICKIT IS OFF THE CLOCK — 0/2</span>
          )}
        </div>
      )}
    </div>
  )
}

export function HudStrip({ player, rival, round, era, lastHit, difficulty, showLevels = true }: HudStripProps) {
  return (
    <div className="hud">
      <CrowdMeter
        data={player}
        side="player"
        hit={lastHit && lastHit.side === 'player' ? lastHit : null}
        showLevels={showLevels}
      />
      <div className="hud__core">
        <span className="hud__live">
          <i /> LIVE
        </span>
        <div className="hud__round">
          <span>ROUND</span>
          <b>{String(round).padStart(2, '0')}</b>
          <i>/12</i>
        </div>
        <div className="hud__era">
          <span>ERA {['I', 'II', 'III'][era - 1]}</span>
          <b>{era === 1 ? 'OPENING ACT' : era === 2 ? 'MAIN STAGE' : 'HEADLINE'}</b>
          <span className="era-pips" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <i key={n} className={n <= era ? 'is-on' : ''} />
            ))}
          </span>
        </div>
        <span className="hud__venue">{difficulty ?? 'THE MIDNIGHT GARDEN'}</span>
      </div>
      <CrowdMeter
        data={rival}
        side="rival"
        hit={lastHit && lastHit.side === 'rival' ? lastHit : null}
        showLevels={showLevels}
      />
    </div>
  )
}
