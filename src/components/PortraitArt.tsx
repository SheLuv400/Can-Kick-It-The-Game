import { useId } from 'react'
import type { Artist } from '../game/types'

/**
 * A proprietary portrait system: every artist is rendered as a duotone editorial
 * silhouette, layered with a genre motif, rim lights, jewellery, and a live crowd.
 *
 * Pure and deterministic: the same artist always draws the same portrait, which
 * is what lets `scripts/bake-portraits.mjs` freeze the set into `src/assets/cards`.
 */
export function PortraitArt({ artist, crop = 'card' }: { artist: Artist; crop?: 'card' | 'avatar' }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const p = artist.palette
  const figId = `fig-${raw}`
  const rimId = `rim-${raw}`
  const haloId = `halo-${raw}`
  const hairId = `hair-${raw}`
  const crowdId = `crowd-${raw}`
  const dotsId = `dots-${raw}`
  const gridId = `grid-${raw}`
  const waveId = `wave-${raw}`
  const chromeId = `chrome-${raw}`
  const id = (name: string) => `${name}-${raw}`

  const figureFill = `url(#${figId})`
  const dark = '#08070b'
  const darker = '#040406'

  const accessory = artist.art.accessory
  const pose = artist.art.pose

  return (
    <svg
      className="portrait"
      viewBox="0 0 300 390"
      preserveAspectRatio={crop === 'avatar' ? 'xMidYMid slice' : 'xMidYMax slice'}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={figId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.deep} />
          <stop offset="0.55" stopColor={dark} />
          <stop offset="1" stopColor={darker} />
        </linearGradient>
        <linearGradient id={rimId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.accent} stopOpacity="0.95" />
          <stop offset="0.5" stopColor={p.base} stopOpacity="0.3" />
          <stop offset="1" stopColor={p.accent} stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={p.accent} stopOpacity="0.55" />
          <stop offset="0.55" stopColor={p.base} stopOpacity="0.18" />
          <stop offset="1" stopColor={p.base} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={hairId} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#111016" />
          <stop offset="1" stopColor="#030305" />
        </linearGradient>
        <radialGradient id={crowdId} cx="50%" cy="20%" r="80%">
          <stop offset="0" stopColor={p.deep} stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.9" />
        </radialGradient>

        {artist.art.pattern === 'halftone' && (
          <pattern id={dotsId} width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill={p.accent} fillOpacity="0.55" />
            <circle cx="6.5" cy="6.5" r="1.1" fill={p.base} fillOpacity="0.5" />
          </pattern>
        )}
        {artist.art.pattern === 'grid' && (
          <pattern id={gridId} width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M 26 0 L 0 0 0 26" fill="none" stroke={p.accent} strokeOpacity="0.4" strokeWidth="0.8" />
          </pattern>
        )}
        {artist.art.pattern === 'waves' && (
          <pattern id={waveId} width="60" height="22" patternUnits="userSpaceOnUse">
            <path
              d="M0 16 Q 15 4 30 16 T 60 16"
              fill="none"
              stroke={p.accent}
              strokeOpacity="0.42"
              strokeWidth="1.3"
            />
          </pattern>
        )}
        {artist.art.pattern === 'chrome' && (
          <pattern id={chromeId} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="24" height="24" fill={p.deep} fillOpacity="0.4" />
            <rect width="12" height="24" fill={p.accent} fillOpacity="0.16" />
            <rect x="16" width="2" height="24" fill="#ffffff" fillOpacity="0.18" />
          </pattern>
        )}
      </defs>

      {/* motif */}
      <g className="portrait__motif" aria-hidden="true">
        {(artist.art.pattern === 'halftone' ||
          artist.art.pattern === 'grid' ||
          artist.art.pattern === 'waves' ||
          artist.art.pattern === 'chrome') && (
          <rect
            width="300"
            height="390"
            fill={`url(#${id(
              artist.art.pattern === 'halftone'
                ? dotsId
                : artist.art.pattern === 'grid'
                  ? gridId
                  : artist.art.pattern === 'waves'
                    ? waveId
                    : chromeId,
            )})`}
            opacity="0.55"
          />
        )}
        {artist.art.pattern === 'halo' && (
          <g>
            <circle cx="150" cy="150" r="128" fill={`url(#${haloId})`} />
            <ellipse cx="150" cy="140" rx="108" ry="108" fill="none" stroke={p.accent} strokeOpacity="0.2" />
            <ellipse cx="150" cy="140" rx="84" ry="84" fill="none" stroke={p.accent} strokeOpacity="0.14" />
          </g>
        )}
        <circle cx="150" cy="176" r="118" fill={`url(#${haloId})`} opacity="0.65" />
      </g>

      {/* halo accessory */}
      {accessory === 'halo' && (
        <g className="portrait__halo">
          <ellipse cx="150" cy="96" rx="70" ry="20" fill="none" stroke={p.accent} strokeWidth="5" opacity="0.95" />
          <ellipse cx="150" cy="96" rx="82" ry="27" fill="none" stroke={p.accent} strokeWidth="1.4" opacity="0.5" />
          <ellipse cx="150" cy="96" rx="58" ry="14" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.35" />
        </g>
      )}

      {pose === 2 ? (
        <g className="portrait__figure">
          <path
            d="M40 390 C52 314 94 276 152 272 C210 278 250 316 258 390 Z"
            fill={figureFill}
            stroke={`url(#${rimId})`}
            strokeWidth="1.5"
            strokeOpacity="0.7"
          />
          <path
            d="M126 120 C150 108 181 117 194 141 C207 165 203 196 187 212 L182 229 L168 226 C162 238 151 245 139 241 C127 237 121 226 122 216 C112 208 106 196 107 184 C102 177 104 168 113 165 C117 138 121 126 126 120 Z"
            fill={figureFill}
            stroke={`url(#${rimId})`}
            strokeWidth="1.6"
            strokeOpacity="0.85"
          />
          <path
            d="M186 118 C205 122 215 142 213 162 C222 182 219 202 208 213 C213 188 208 168 197 152 C190 140 187 130 186 118 Z"
            fill={`url(#${hairId})`}
          />
          <path
            d="M148 152 C157 146 174 146 182 154"
            fill="none"
            stroke={p.accent}
            strokeOpacity="0.55"
            strokeWidth="2.4"
          />
          <path d="M188 166 L198 172" stroke={p.accent} strokeOpacity="0.4" strokeWidth="2" />
          <path d="M186 207 C179 210 171 212 164 210" stroke={p.accent} strokeOpacity="0.35" strokeWidth="2" fill="none" />
          <path
            d="M48 390 C60 330 88 300 130 286"
            fill="none"
            stroke={`url(#${rimId})`}
            strokeOpacity="0.55"
            strokeWidth="2.4"
          />
          {/* shoulder jewellery */}
          <path d="M128 286 Q 158 312 196 292" fill="none" stroke={p.accent} strokeOpacity="0.5" strokeWidth="2" />
        </g>
      ) : (
        <g className="portrait__figure">
          <path
            d="M42 390 C50 312 94 270 150 266 C206 270 250 312 258 390 Z"
            fill={figureFill}
            stroke={`url(#${rimId})`}
            strokeWidth="1.4"
            strokeOpacity="0.55"
          />
          {/* left arm */}
          {pose === 0 && (
            <path
              d="M84 296 C70 322 66 354 76 380"
              fill="none"
              stroke={figureFill}
              strokeWidth="34"
              strokeLinecap="round"
            />
          )}
          {pose === 1 && (
            <g>
              <path
                d="M86 304 C106 274 196 274 214 306"
                fill="none"
                stroke={figureFill}
                strokeWidth="30"
                strokeLinecap="round"
              />
              <path
                d="M86 336 C120 304 182 302 214 332"
                fill="none"
                stroke={figureFill}
                strokeWidth="29"
                strokeLinecap="round"
              />
              <path
                d="M90 302 C112 280 190 280 211 305"
                fill="none"
                stroke={p.accent}
                strokeOpacity="0.24"
                strokeWidth="2"
              />
              <path d="M92 334 C124 308 180 305 209 330" fill="none" stroke={p.accent} strokeOpacity="0.18" strokeWidth="2" />
            </g>
          )}
          {pose === 3 && (
            <path
              d="M96 302 C74 264 74 224 82 190"
              fill="none"
              stroke={figureFill}
              strokeWidth="31"
              strokeLinecap="round"
            />
          )}

          {/* neck */}
          <path d="M130 214 L170 214 L172 258 C160 268 140 268 128 258 Z" fill={figureFill} />
          <path d="M130 224 C138 236 162 236 170 224" fill="none" stroke={p.accent} strokeOpacity="0.22" strokeWidth="2" />

          {/* head */}
          <ellipse cx="150" cy="166" rx="51" ry="59" fill={figureFill} />
          <circle cx="99" cy="176" r="11" fill={figureFill} />
          <circle cx="201" cy="176" r="11" fill={figureFill} />
          <path
            d="M196 126 C211 146 212 176 198 200 C206 176 202 150 188 132 Z"
            fill={p.accent}
            opacity="0.2"
          />
          <path
            d="M108 128 C101 148 100 172 108 192"
            fill="none"
            stroke={p.accent}
            strokeOpacity="0.32"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* facial planes */}
          <path d="M150 160 L142 184 L151 188" fill="none" stroke={p.accent} strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" />
          <path d="M138 200 Q150 206 162 200" fill="none" stroke={p.accent} strokeOpacity="0.3" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M116 190 Q126 198 136 194" fill={p.accent} opacity="0.1" />

          {renderHair(artist.art.hair, `url(#${hairId})`, p.accent)}
          {accessory === 'shades' && (
            <g className="portrait__shades">
              <rect x="112" y="158" width="35" height="21" rx="9" fill="#050508" stroke={p.accent} strokeOpacity="0.65" strokeWidth="1.6" />
              <rect x="153" y="158" width="35" height="21" rx="9" fill="#050508" stroke={p.accent} strokeOpacity="0.65" strokeWidth="1.6" />
              <path d="M147 166 Q150 163 153 166" fill="none" stroke={p.accent} strokeOpacity="0.7" strokeWidth="2" />
              <path d="M112 164 L102 168" stroke={p.accent} strokeOpacity="0.5" strokeWidth="2" />
              <path d="M188 164 L198 168" stroke={p.accent} strokeOpacity="0.5" strokeWidth="2" />
              <path d="M118 164 L135 170" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" />
            </g>
          )}

          {accessory === 'phones' && (
            <g className="portrait__phones">
              <path d="M100 164 C100 100 200 100 200 164" fill="none" stroke="#0a0910" strokeWidth="13" />
              <path d="M100 164 C100 100 200 100 200 164" fill="none" stroke={p.accent} strokeOpacity="0.55" strokeWidth="2" />
              <rect x="87" y="150" width="25" height="54" rx="12" fill="#0a0910" stroke={p.accent} strokeOpacity="0.55" strokeWidth="1.5" />
              <rect x="188" y="150" width="25" height="54" rx="12" fill="#0a0910" stroke={p.accent} strokeOpacity="0.55" strokeWidth="1.5" />
              <rect x="94" y="162" width="4" height="20" rx="2" fill={p.accent} opacity="0.5" />
            </g>
          )}

          {accessory === 'chain' && (
            <g className="portrait__chain">
              <path d="M118 250 Q150 288 182 250" fill="none" stroke={p.accent} strokeWidth="3.2" strokeOpacity="0.85" />
              <path d="M126 262 Q150 282 174 262" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.35" />
              <path d="M150 280 L161 294 L150 310 L139 294 Z" fill={p.base} stroke={p.accent} strokeWidth="1.5" />
              <path d="M150 286 L155 294 L150 302 L145 294 Z" fill="#ffffff" opacity="0.4" />
            </g>
          )}

          {accessory === 'mic' && pose === 0 && (
            <g className="portrait__mic">
              <path
                d="M196 306 C224 282 232 246 216 216"
                fill="none"
                stroke={figureFill}
                strokeWidth="29"
                strokeLinecap="round"
              />
              <path
                d="M198 300 C222 278 228 246 215 220"
                fill="none"
                stroke={p.accent}
                strokeOpacity="0.28"
                strokeWidth="2.5"
              />
              <ellipse cx="213" cy="207" rx="15" ry="13" fill="#0b0a10" transform="rotate(-28 213 207)" stroke={p.accent} strokeOpacity="0.5" />
              <ellipse cx="225" cy="172" rx="12" ry="21" fill="#121018" transform="rotate(-28 225 172)" stroke={p.accent} strokeOpacity="0.7" strokeWidth="1.6" />
              <path d="M216 156 L234 166" stroke={p.accent} strokeOpacity="0.4" strokeWidth="1.5" />
            </g>
          )}

          {pose === 3 && (
            <g className="portrait__hand">
              <ellipse cx="80" cy="180" rx="15" ry="17" fill={figureFill} />
              <path d="M80 164 L82 138" stroke={figureFill} strokeWidth="9" strokeLinecap="round" />
              <path d="M78 172 C70 166 66 160 66 152" fill="none" stroke={figureFill} strokeWidth="7" strokeLinecap="round" />
              <path d="M82 138 L82 128" stroke={p.accent} strokeOpacity="0.35" strokeWidth="2" />
            </g>
          )}
        </g>
      )}

      {/* live crowd at the lip of the stage */}
      <g className="portrait__crowd">
        <rect y="352" width="300" height="38" fill={`url(#${crowdId})`} />
        {Array.from({ length: 16 }).map((_, i) => {
          const x = 6 + i * 19 + (i % 3) * 3
          const y = 364 + (i % 4) * 3
          const r = 5 + (i % 3) * 2
          return (
            <g key={i} transform={`translate(${x} ${y})`} fill="#030305" opacity={0.82}>
              <circle cy={`-${r + 1}`} r={r} />
              <path d={`M-${r + 5} 36 C-${r + 4} ${-4} ${r + 4} ${-4} ${r + 5} 36 Z`} />
              {i % 5 === 0 && (
                <path d={`M0 -${r + 2} L0 -${r + 18}`} stroke="#030305" strokeWidth="3" strokeLinecap="round" />
              )}
            </g>
          )
        })}
        {Array.from({ length: 10 }).map((_, i) => (
          <circle
            key={`light-${i}`}
            cx={20 + ((i * 67) % 270)}
            cy={330 + ((i * 13) % 34)}
            r={i % 3 === 0 ? 1.8 : 1.1}
            fill={p.accent}
            opacity="0.7"
          />
        ))}
        <path d="M0 388 H300" stroke={p.accent} strokeOpacity="0.32" strokeWidth="1.4" />
      </g>
    </svg>
  )
}

function renderHair(hair: number, fill: string, accent: string) {
  if (hair === 0) {
    return (
      <g className="portrait__hair">
        <path
          d="M98 170 C82 154 82 116 104 98 C114 74 146 66 168 76 C196 60 226 84 222 112 C242 134 230 164 212 174 C216 190 196 196 187 181 C176 200 142 200 132 183 C118 198 100 190 104 176 C98 176 95 173 98 170 Z"
          fill={fill}
          stroke={accent}
          strokeOpacity="0.2"
          strokeWidth="1.4"
        />
        <g fill={fill}>
          <circle cx="98" cy="116" r="18" />
          <circle cx="118" cy="94" r="20" />
          <circle cx="150" cy="84" r="22" />
          <circle cx="182" cy="90" r="21" />
          <circle cx="206" cy="112" r="18" />
          <circle cx="92" cy="144" r="16" />
          <circle cx="210" cy="146" r="15" />
        </g>
        <path d="M112 192 C124 204 176 204 188 192" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="2" />
      </g>
    )
  }
  if (hair === 1) {
    return (
      <g className="portrait__hair">
        <path
          d="M102 172 C94 122 120 96 152 96 C188 96 208 122 200 172 C192 150 174 140 152 140 C128 140 112 152 102 172 Z"
          fill={fill}
          stroke={accent}
          strokeOpacity="0.22"
          strokeWidth="1.4"
        />
        <g stroke={accent} strokeOpacity="0.48" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M120 158 C134 128 162 112 190 120" />
          <path d="M128 168 C146 140 170 126 198 136" />
          <path d="M138 176 C156 152 176 142 196 152" />
          <path d="M150 182 C162 164 176 158 190 164" />
        </g>
        <path d="M104 162 C120 146 178 143 198 160" fill="none" stroke={accent} strokeOpacity="0.6" strokeWidth="4" />
      </g>
    )
  }
  if (hair === 2) {
    return (
      <g className="portrait__hair">
        <path
          d="M96 192 C84 160 88 112 118 98 C144 82 186 88 204 116 C222 142 216 188 200 208 L194 174 C186 148 160 134 136 142 C116 148 106 170 108 200 Z"
          fill={fill}
          stroke={accent}
          strokeOpacity="0.24"
          strokeWidth="1.5"
        />
        <path d="M112 130 C136 106 176 104 200 128" fill="none" stroke={accent} strokeOpacity="0.3" strokeWidth="2" />
        <path d="M117 118 C142 132 172 130 192 116" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="2" />
        <path d="M112 204 C110 216 114 224 122 226" fill="none" stroke={fill} strokeWidth="14" strokeLinecap="round" />
        <path d="M190 206 C192 218 188 226 180 228" fill="none" stroke={fill} strokeWidth="13" strokeLinecap="round" />
      </g>
    )
  }
  return (
    <g className="portrait__hair">
      <path
        d="M104 156 C102 120 122 100 150 100 C180 100 200 120 198 154 C184 134 166 126 150 126 C132 126 116 138 104 156 Z"
        fill={fill}
        stroke={accent}
        strokeOpacity="0.2"
        strokeWidth="1.4"
      />
      <path d="M196 124 C206 132 212 142 210 152 C216 158 216 168 208 170" fill="none" stroke={fill} strokeWidth="10" strokeLinecap="round" />
      <path d="M112 132 C128 118 148 112 164 116" fill="none" stroke={accent} strokeOpacity="0.34" strokeWidth="2" />
    </g>
  )
}
