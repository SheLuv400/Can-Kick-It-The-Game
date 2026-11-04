import { brandLogoUrl } from '../game/brand'

const FONT = 'Anton, Impact, "Arial Black", sans-serif'
const INK = '#14100e'
const CREAM = '#f3e9d2'
const GOLD = '#ffc300'
const ORANGE = '#ff5a1f'
const SHADOW = '#9c7a2a'

/**
 * The wordmark: cream slab letters, gold crown, vinyl record, EQ bars and the
 * "THE GAME" plate. Supplied artwork in `src/assets/brand/logo.*` takes over
 * automatically; this vector build is the fallback so the menu always has a logo.
 */
export function BrandLogo() {
  const supplied = brandLogoUrl()
  if (supplied) {
    return <img className="menu-logo" src={supplied} alt="Can I Kick It? The Game" draggable={false} />
  }

  return (
    <svg
      className="menu-logo"
      viewBox="0 0 660 400"
      role="img"
      aria-label="Can I Kick It? The Game"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* vinyl record */}
      <g>
        <circle cx="424" cy="176" r="152" fill="none" stroke={GOLD} strokeOpacity="0.18" strokeWidth="3" />
        <circle cx="424" cy="176" r="146" fill="#2b211a" stroke="#0c0907" strokeWidth="10" />
        <circle cx="424" cy="176" r="118" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.6" />
        <circle cx="424" cy="176" r="96" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.6" />
        <circle cx="424" cy="176" r="74" fill="none" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="1.6" />
        <circle cx="424" cy="176" r="50" fill={ORANGE} stroke={INK} strokeWidth="7" />
        <circle cx="424" cy="176" r="10" fill="#0b0806" />
      </g>

      {/* equalizer */}
      <g fill={ORANGE} stroke={INK} strokeWidth="7" strokeLinejoin="round">
        <rect x="520" y="92" width="26" height="124" rx="4" />
        <rect x="554" y="62" width="26" height="154" rx="4" />
        <rect x="588" y="32" width="26" height="184" rx="4" />
      </g>

      {/* crown */}
      <g transform="translate(38 2) rotate(-6 60 40)">
        <path
          d="M2 66 L11 16 L36 44 L58 8 L82 44 L107 16 L116 66 Z"
          fill={GOLD}
          stroke={INK}
          strokeWidth="9"
          strokeLinejoin="round"
        />
        <path d="M14 66 H104" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      </g>
      <g stroke={GOLD} strokeWidth="12" strokeLinecap="round">
        <path d="M158 30 L182 44" />
        <path d="M170 12 L190 22" />
      </g>

      {/* wordmark, with an offset shadow underneath */}
      <g transform="translate(32 0) skewX(-7)">
        <g
          transform="translate(11 13)"
          fill={SHADOW}
          stroke={INK}
          strokeWidth="13"
          strokeLinejoin="round"
          paintOrder="stroke"
          fontFamily={FONT}
        >
          <text x="46" y="166" fontSize="122" letterSpacing="-2">
            CAN I
          </text>
          <text x="22" y="310" fontSize="136" letterSpacing="-2">
            KICK IT
          </text>
        </g>
        <g
          fill={CREAM}
          stroke={INK}
          strokeWidth="13"
          strokeLinejoin="round"
          paintOrder="stroke"
          fontFamily={FONT}
        >
          <text x="46" y="166" fontSize="122" letterSpacing="-2">
            CAN I
          </text>
          <text x="22" y="310" fontSize="136" letterSpacing="-2">
            KICK <tspan fill={GOLD}>IT</tspan>
          </text>
        </g>
      </g>

      {/* question mark */}
      <text
        x="474"
        y="366"
        fill={ORANGE}
        stroke={INK}
        strokeWidth="15"
        strokeLinejoin="round"
        paintOrder="stroke"
        fontFamily={FONT}
        fontSize="248"
      >
        ?
      </text>

      {/* orange slab under the left edge */}
      <rect x="14" y="318" width="196" height="17" transform="skewX(-7)" fill={ORANGE} stroke={INK} strokeWidth="7" />

      {/* THE GAME plate */}
      <g transform="translate(178 330) skewX(-10)">
        <rect width="326" height="56" fill={GOLD} stroke={INK} strokeWidth="8" />
        <text
          x="163"
          y="39"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="30"
          letterSpacing="7"
          fill={INK}
        >
          THE GAME
        </text>
      </g>
    </svg>
  )
}
