import { useId } from 'react'
import type { ArtistAppearance, Genre } from '../game/types'
import { careerOptionLabel } from '../game/career-data'
import {
  GENRE_LOOK,
  SHOE_STYLES,
  bottomColor,
  buildFace,
  buildSkin,
  colorOf,
  headPath,
  mix,
  topColor,
  type FaceSpec,
  type SkinPalette,
} from './careerPortraitModel'

interface CareerPortraitProps {
  appearance: ArtistAppearance
  genre?: Genre
  className?: string
  encore?: boolean
  mode?: 'bust' | 'full'
}

interface Look {
  s: FaceSpec
  skin: SkinPalette
  female: boolean
  hair: string
  hairBase: string
  hairLight: string
  hairDeep: string
  uid: string
  earX: number
  lobeY: number
  headClip: string
  beard: string
}

function Eye({ x, s, skin, female, uid }: { x: number; s: FaceSpec; skin: SkinPalette; female: boolean; uid: string }) {
  const y = s.eyeY
  const w = s.eyeW
  const h = s.eyeH
  const dir = x < 150 ? -1 : 1
  const almond = `M${x - w} ${y}C${x - w * 0.55} ${y - h * 1.2} ${x + w * 0.5} ${y - h * 1.15} ${x + w} ${y}C${x + w * 0.5} ${y + h * 0.95} ${x - w * 0.55} ${y + h} ${x - w} ${y}Z`
  return (
    <g>
      <ellipse cx={x} cy={y + h * 0.5} rx={w * 1.1} ry={h * 1.05} fill={skin.shade} opacity="0.2" />
      <path d={almond} fill="#ded1c2" />
      <path d={almond} fill="#b8a48e" opacity="0.24" />
      <path d={`M${x - w * 0.92} ${y - h * 0.1}C${x - w * 0.5} ${y - h * 0.95} ${x + w * 0.4} ${y - h * 0.9} ${x + w * 0.92} ${y - h * 0.15}L${x + w * 0.7} ${y + h * 0.5}C${x + w * 0.2} ${y + h * 0.2} ${x - w * 0.4} ${y + h * 0.2} ${x - w * 0.8} ${y + h * 0.55}Z`} fill="#1f120c" opacity="0.2" />
      <circle cx={x + 0.6} cy={y + 0.4} r={h * 0.84} fill={`url(#${uid}-iris)`} />
      <circle cx={x + 0.6} cy={y + 0.4} r={h * 0.84} fill="none" stroke="#160a06" strokeWidth="1.4" opacity="0.9" />
      <circle cx={x + 0.6} cy={y + 0.4} r={h * 0.33} fill="#080404" />
      <circle cx={x + 2.2} cy={y - 2.1} r="1.2" fill="#fff" opacity="0.9" />
      <circle cx={x - 2} cy={y + 2} r="0.65" fill="#fff" opacity="0.42" />
      <path d={`M${x - dir * w} ${y + 0.5}q${dir * 3} 1 ${dir * 2} 3.5`} stroke="#8a5a52" strokeWidth="1.1" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d={`M${x - w} ${y}C${x - w * 0.55} ${y - h * 1.28} ${x + w * 0.5} ${y - h * 1.22} ${x + w} ${y}`} stroke="#160b07" strokeWidth={female ? 3 : 2.3} fill="none" strokeLinecap="round" />
      {female && [0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${x + dir * (w * 0.86 + i * 1.1)} ${y - h * (0.28 + i * 0.15)}L${x + dir * (w + 3.2 + i * 1.5)} ${y - h * (0.78 + i * 0.2)}`}
          stroke="#1a0e09"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      ))}
      <path d={`M${x - w * 0.8} ${y + h * 0.6}C${x - w * 0.2} ${y + h * 1.2} ${x + w * 0.3} ${y + h * 1.1} ${x + w * 0.75} ${y + h * 0.5}`} stroke={skin.lighter} strokeWidth="1.1" fill="none" opacity="0.5" />
      <path d={`M${x - w * 0.9} ${y - h * 1.45}C${x - w * 0.2} ${y - h * 1.8} ${x + w * 0.6} ${y - h * 1.7} ${x + w * 0.95} ${y - h * 1.35}`} stroke={skin.shade} strokeWidth="2" fill="none" opacity="0.38" />
      <ellipse cx={x} cy={y + h * 1.65} rx={w * 1.05} ry={h * 0.42} fill={skin.shade} opacity="0.2" />
      <path d={`M${x - w * 0.7} ${y + h * 1.15}q${w * 0.7} ${h * 0.35} ${w * 1.4} 0`} stroke={skin.light} strokeWidth="0.9" fill="none" opacity="0.25" />
    </g>
  )
}

function Brow({ x, s, color }: { x: number; s: FaceSpec; color: string }) {
  const dir = x < 150 ? -1 : 1
  const y = s.eyeY - 18
  const inner = x - dir * s.eyeW * 1.05
  const outer = x + dir * s.eyeW * 1.3
  const peak = x + dir * s.eyeW * 0.05
  return (
    <g>
      <path d={`M${inner} ${y + 2}Q${peak} ${y - s.browArch} ${outer} ${y + 4}`} stroke={color} strokeWidth={s.browThick} fill="none" strokeLinecap="round" opacity="0.5" />
      {[0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.92].map((t, i) => {
        const bx = inner + (outer - inner) * t
        const by = y + 2 - Math.sin(t * Math.PI) * s.browArch
        const off = ((i % 3) - 1) * 1.2
        return <path key={i} d={`M${bx} ${by + 2 + off}Q${bx + (outer - inner) * 0.03} ${by - 1} ${bx + dir * 3.5} ${by - 2.5 + off}`} stroke={color} strokeWidth="1.1" fill="none" opacity="0.55" strokeLinecap="round" />
      })}
    </g>
  )
}

function Nose({ s, skin, uid }: { s: FaceSpec; skin: SkinPalette; uid: string }) {
  const c = 150
  const top = s.eyeY + 4
  const tip = top + s.noseLen
  const w = s.noseW
  return (
    <g>
      <path d={`M${c - 4} ${top}C${c - 7} ${top + 12} ${c - 6} ${tip - 8} ${c - 5} ${tip - 2}`} stroke={skin.shade} strokeWidth="6" fill="none" opacity="0.3" filter={`url(#${uid}-blur)`} />
      <path d={`M${c - 4} ${top + 2}C${c - 11} ${top + 16} ${c - 12} ${tip - 6} ${c - 7} ${tip - 1}L${c - 1} ${tip + 1}C${c + 4} ${tip - 2} ${c + 5} ${top + 18} ${c + 2} ${top + 4}Z`} fill={skin.light} opacity="0.24" filter={`url(#${uid}-blur)`} />
      <path d={`M${c - 3} ${top + 4}C${c - 8} ${top + 18} ${c - 9} ${tip - 8} ${c - 5} ${tip - 2}`} stroke={skin.shade} strokeWidth="3.2" fill="none" opacity="0.3" filter={`url(#${uid}-blur)`} />
      <path d={`M${c + 3} ${top}C${c + 5} ${top + 12} ${c + 4} ${tip - 8} ${c + 3} ${tip - 3}`} stroke={skin.lighter} strokeWidth="2.2" fill="none" opacity="0.5" />
      <ellipse cx={c} cy={tip} rx={w * 0.7} ry="4" fill={skin.light} opacity="0.6" />
      <path d={`M${c - w * 0.95} ${tip - 1}C${c - w * 0.6} ${tip - 7} ${c - w * 0.2} ${tip - 6} ${c} ${tip - 4}C${c + w * 0.2} ${tip - 6} ${c + w * 0.6} ${tip - 7} ${c + w * 0.95} ${tip - 1}`} stroke={skin.shade} strokeWidth="2" fill="none" opacity="0.42" />
      <ellipse cx={c - w * 0.62} cy={tip + 2.5} rx="4" ry="2.9" fill={skin.shade} opacity="0.5" />
      <ellipse cx={c + w * 0.62} cy={tip + 2.5} rx="4" ry="2.9" fill={skin.shade} opacity="0.5" />
      <ellipse cx={c - w * 0.6} cy={tip + 3} rx="1.9" ry="1.2" fill={skin.deep} opacity="0.8" />
      <ellipse cx={c + w * 0.6} cy={tip + 3} rx="1.9" ry="1.2" fill={skin.deep} opacity="0.8" />
      <ellipse cx={c} cy={tip + 7} rx={w * 0.5} ry="3" fill={skin.shade} opacity="0.26" filter={`url(#${uid}-blur)`} />
    </g>
  )
}

function Mouth({ s, skin, uid }: { s: FaceSpec; skin: SkinPalette; uid: string }) {
  const c = 150
  const y = s.mouthY
  const w = s.lipW / 2
  const h = s.lipFull
  return (
    <g>
      <path d={`M${c - w * 0.35} ${y - 12}L${c - w * 0.3} ${y - 4}M${c + w * 0.35} ${y - 12}L${c + w * 0.3} ${y - 4}`} stroke={skin.shade} strokeWidth="1.6" opacity="0.32" />
      <path d={`M${c - w} ${y}C${c - w * 0.72} ${y - 6} ${c - w * 0.3} ${y - 6} ${c - w * 0.1} ${y - 2.5}C${c - w * 0.03} ${y - 0.8} ${c + w * 0.03} ${y - 0.8} ${c + w * 0.1} ${y - 2.5}C${c + w * 0.3} ${y - 6} ${c + w * 0.72} ${y - 6} ${c + w} ${y}C${c + w * 0.5} ${y + 3.4} ${c - w * 0.5} ${y + 3.4} ${c - w} ${y}Z`} fill={skin.lipDark} />
      <path d={`M${c - w * 0.92} ${y + 1}C${c - w * 0.55} ${y + h} ${c + w * 0.55} ${y + h} ${c + w * 0.92} ${y + 1}C${c + w * 0.5} ${y + 4} ${c - w * 0.5} ${y + 4} ${c - w * 0.92} ${y + 1}Z`} fill={skin.lip} />
      <path d={`M${c - w * 0.78} ${y + 2.4}C${c - w * 0.4} ${y + h * 0.9} ${c + w * 0.4} ${y + h * 0.9} ${c + w * 0.78} ${y + 2.4}`} fill={skin.lipLight} opacity="0.32" />
      <path d={`M${c - w * 0.6} ${y + 1.4}C${c - w * 0.2} ${y + 2.2} ${c + w * 0.2} ${y + 2.2} ${c + w * 0.6} ${y + 1.4}`} stroke="#2a0a0e" strokeWidth="1" fill="none" opacity="0.55" />
      <ellipse cx={c} cy={y + h * 0.55} rx={w * 0.42} ry={h * 0.16} fill="#fff" opacity="0.28" filter={`url(#${uid}-blur)`} />
      <ellipse cx={c} cy={y + h + 7} rx={w * 0.75} ry="4" fill={skin.shade} opacity="0.22" filter={`url(#${uid}-blur)`} />
      <path d={`M${c - w} ${y}L${c - w * 0.8} ${y + 1.5}M${c + w} ${y}L${c + w * 0.8} ${y + 1.5}`} stroke={skin.deep} strokeWidth="1.1" opacity="0.5" />
    </g>
  )
}

function Braid({ x, y1, y2, width, sway, look }: { x: number; y1: number; y2: number; width: number; sway: number; look: Look }) {
  const cx = x + sway
  const cy = (y1 + y2) / 2
  const end = x + sway * 0.4
  const d = `M${x} ${y1}Q${cx} ${cy} ${end} ${y2}`
  const points = Array.from({ length: 8 }, (_, i) => {
    const t = (i + 1) / 9
    const m = 1 - t
    return { x: m * m * x + 2 * m * t * cx + t * t * end, y: m * m * y1 + 2 * m * t * cy + t * t * y2 }
  })
  return (
    <g>
      <path d={d} stroke={look.hairDeep} strokeWidth={width + 2.5} fill="none" strokeLinecap="round" />
      <path d={d} stroke={look.hairBase} strokeWidth={width} fill="none" strokeLinecap="round" />
      <path d={d} stroke={look.hairLight} strokeWidth="1.2" fill="none" opacity="0.3" />
      {points.map((p, i) => (
        <path key={i} d={`M${p.x - width * 0.45} ${p.y}Q${p.x} ${p.y + 2.5} ${p.x + width * 0.45} ${p.y}`} stroke={i % 2 ? look.hairLight : look.hairDeep} strokeWidth="1.5" fill="none" opacity="0.55" />
      ))}
    </g>
  )
}

function HairBack({ look }: { look: Look }) {
  const { s, uid, hair } = look
  const c = 150
  const w = s.width
  const top = s.topY
  const fill = `url(#${uid}-hair)`
  if (hair === 'male-04') {
    return <g>{[94, 112, 188, 206].map((x, i) => <Braid key={x} x={x} y1={top + 24 + i * 3} y2={352 + (i % 2) * 16} width={10} sway={i < 2 ? -8 : 8} look={look} />)}</g>
  }
  if (hair === 'female-02') {
    const left = `M${c - 24} ${top + 2}C${c - 64} ${top + 12} ${c - 76} ${top + 80} ${c - 72} ${s.cheekY + 70}C${c - 70} 320 ${c - 84} 360 ${c - 92} 386C${c - 68} 378 ${c - 52} 352 ${c - 48} 318C${c - 44} 270 ${c - 54} 220 ${c - 46} 180C${c - 40} 146 ${c - 28} 124 ${c - 12} 110Z`
    const strand = (i: number) => `M${c - 58 - i * 8} ${top + 70 + i * 40}Q${c - 42 - i * 6} ${top + 150 + i * 40} ${c - 54 - i * 4} ${s.cheekY + 130 + i * 30}`
    return (
      <g fill={fill}>
        <path d={left} />
        <g transform="translate(300 0) scale(-1 1)"><path d={left} /></g>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <path d={strand(i)} stroke={i === 1 ? look.hairDeep : look.hairLight} strokeWidth={i === 1 ? 3.5 : 2.4} fill="none" opacity={i === 1 ? 0.3 : 0.24} />
            <g transform="translate(300 0) scale(-1 1)"><path d={strand(i)} stroke={i === 1 ? look.hairDeep : look.hairLight} strokeWidth={i === 1 ? 3.5 : 2.4} fill="none" opacity={i === 1 ? 0.3 : 0.24} /></g>
          </g>
        ))}
      </g>
    )
  }
  if (hair === 'female-05') {
    const left = `M${c - 26} ${top + 4}C${c - 56} ${top + 14} ${c - 70} ${top + 50} ${c - 68} ${top + 100}C${c - 66} ${top + 150} ${c - 76} ${s.faceLen - 6} ${c - 66} ${s.faceLen + 14}C${c - 50} ${s.faceLen + 20} ${c - 38} ${s.faceLen + 6} ${c - 42} ${s.faceLen - 10}C${c - 50} ${top + 150} ${c - 44} ${top + 100} ${c - 40} ${top + 74}Z`
    return <g fill={fill}><path d={left} /><g transform="translate(300 0) scale(-1 1)"><path d={left} /></g></g>
  }
  if (hair === 'female-06') {
    return <g>{[86, 104, 122, 178, 196, 214].map((x, i) => <Braid key={x} x={x} y1={top + 26} y2={358 + (i % 3) * 10} width={9} sway={i < 3 ? -10 : 10} look={look} />)}</g>
  }
  if (hair === 'male-03' || hair === 'female-04') {
    const rx = hair === 'female-04' ? w + 30 : w + 24
    return <ellipse cx={c} cy={top + 24} rx={rx} ry={hair === 'female-04' ? 76 : 70} fill={fill} />
  }
  return null
}

function HairFront({ look }: { look: Look }) {
  const { s, uid, hair } = look
  const c = 150
  const w = s.width
  const top = s.topY
  const line = top + 30
  const fill = `url(#${uid}-hair)`
  const cap = `M${c - w - 3} ${line + 20}C${c - w - 6} ${top + 12} ${c - w * 0.6} ${top - 14} ${c} ${top - 16}C${c + w * 0.6} ${top - 14} ${c + w + 6} ${top + 12} ${c + w + 3} ${line + 20}C${c + w * 0.72} ${line + 6} ${c + w * 0.34} ${line - 2} ${c} ${line + 2}C${c - w * 0.34} ${line - 2} ${c - w * 0.72} ${line + 6} ${c - w - 3} ${line + 20}Z`
  const curls = (count: number, rx: number, yBase: number, size: number) =>
    Array.from({ length: count }, (_, i) => {
      const t = i / Math.max(1, count - 1)
      const x = c - rx + t * rx * 2
      const y = yBase + Math.sin(t * Math.PI) * 8 + (i % 2) * 4
      return <circle key={i} cx={x} cy={y} r={size + (i % 3)} fill={fill} stroke={look.hairDeep} strokeOpacity="0.35" />
    })
  switch (hair) {
    case 'male-01':
      return (
        <g>
          <path d={cap} fill={fill} />
          <path d={`M${c - w - 2} ${line + 18}C${c - w * 0.9} ${top + 30} ${c - w * 0.3} ${top - 2} ${c} ${top - 4}C${c + w * 0.3} ${top - 2} ${c + w * 0.9} ${top + 30} ${c + w + 2} ${line + 18}`} fill={look.hairDeep} opacity="0.4" />
          {Array.from({ length: 26 }, (_, i) => {
            const t = i / 25
            const x = c - w * 0.9 + t * w * 1.8
            const yy = top + 8 + Math.sin(t * Math.PI) * -4 + (i % 5) * 6
            const len = 5 + (i % 4) * 2
            return <path key={i} d={`M${x} ${yy}q${i % 2 ? 4 : -4} ${len * 0.5} ${i % 2 ? 1 : -1} ${len}`} stroke={i % 3 === 0 ? look.hairLight : look.hairDeep} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity={i % 3 === 0 ? 0.4 : 0.66} />
          })}
          <path d={`M${c - w * 0.72} ${line + 8}Q${c} ${line - 10} ${c + w * 0.72} ${line + 8}`} stroke={look.hairDeep} strokeWidth="3" fill="none" opacity="0.55" />
          <path d={`M${c - w * 0.55} ${line - 4}Q${c} ${top + 4} ${c + w * 0.55} ${line - 4}`} stroke={look.hairLight} strokeWidth="1.4" fill="none" opacity="0.28" />
          {Array.from({ length: 13 }, (_, i) => {
            const x = c - w * 0.92 + (i / 12) * w * 1.84
            return <circle key={`fade-${i}`} cx={x} cy={line + 10 + (i % 3) * 3} r={1.6 + (i % 2)} fill={i % 4 === 0 ? look.hairLight : look.hairDeep} opacity="0.5" />
          })}
        </g>
      )
    case 'male-02':
      return <g><path d={cap} fill={look.hairDeep} /><path d={cap} fill={fill} opacity="0.45" />{Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${c - w * 0.8 + i * w * 0.12} ${line - 2 - (i % 3) * 5}l2 -3`} stroke={look.hairLight} strokeWidth="1.2" opacity="0.4" />)}</g>
    case 'male-03':
    case 'female-04':
      return <g><path d={`M${c - w - 5} ${line + 26}C${c - w - 6} ${line - 4} ${c - w * 0.5} ${top - 4} ${c} ${top - 6}C${c + w * 0.5} ${top - 4} ${c + w + 6} ${line - 4} ${c + w + 5} ${line + 26}C${c + w * 0.7} ${line + 8} ${c + w * 0.3} ${line + 2} ${c} ${line + 4}C${c - w * 0.3} ${line + 2} ${c - w * 0.7} ${line + 8} ${c - w - 5} ${line + 26}Z`} fill={fill} />{curls(hair === 'female-04' ? 10 : 8, w + 4, top + 2, 7)}</g>
    case 'male-04':
      return <g><path d={cap} fill={fill} /><path d={`M${c - w * 0.75} ${line - 4}Q${c - w * 0.4} ${top - 8} ${c} ${top - 12}M${c - w * 0.3} ${line - 6}Q${c} ${top - 6} ${c + w * 0.35} ${top - 10}M${c + w * 0.1} ${line - 4}Q${c + w * 0.45} ${top - 6} ${c + w * 0.8} ${top - 10}`} stroke={look.hairLight} strokeWidth="2" fill="none" opacity="0.4" /></g>
    case 'male-05':
      return (
        <g>
          <path d={cap} fill={fill} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const x = c - w * 0.8 + i * w * 0.23
            const h = 22 + (i % 3) * 9
            return <path key={i} d={`M${x - 7} ${line - 6}L${x + (i % 2 ? 5 : -4)} ${top - 12 - h}L${x + 8} ${line - 10}Z`} fill={fill} stroke={look.hairDeep} strokeWidth="1" />
          })}
        </g>
      )
    case 'male-06':
      return <g><path d={cap} fill={look.hairDeep} />{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${c - w * 0.75 + i * w * 0.37} ${line + 4}Q${c - w * 0.4 + i * w * 0.2} ${top + 2} ${c - w * 0.6 + i * w * 0.3} ${top - 12}`} stroke={i % 2 ? look.hairBase : look.hairLight} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9" />)}</g>
    case 'female-01':
      return (
        <g>
          <path d={cap} fill={fill} />
          <path d={`M${c - 1} ${top - 12}Q${c + 10} ${line} ${c + w * 0.3} ${line + 8}`} stroke={look.hairDeep} strokeWidth="1.5" fill="none" opacity="0.5" />
          <ellipse cx={c} cy={top - 24} rx="29" ry="24" fill={fill} stroke={look.hairDeep} strokeWidth="2" />
          <path d={`M${c - 18} ${top - 30}Q${c} ${top - 44} ${c + 18} ${top - 30}Q${c + 2} ${top - 20} ${c - 18} ${top - 30}Z`} fill="none" stroke={look.hairLight} strokeWidth="2" opacity="0.4" />
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M${c - w + 4 + i * 5} ${line + 2}q3 5 1 9`} stroke={look.hairDeep} strokeWidth="1.2" fill="none" opacity="0.6" />)}
        </g>
      )
    case 'female-02':
      return (
        <g>
          <path d={cap} fill={fill} />
          <path d={`M${c + 2} ${top - 12}C${c - 24} ${top - 2} ${c - 34} ${line + 8} ${c - 26} ${line + 30}C${c - 14} ${line + 12} ${c + 2} ${line - 2} ${c + 24} ${line - 4}C${c + 42} ${line - 8} ${c + 54} ${line + 6} ${c + 58} ${line + 22}C${c + 52} ${top - 2} ${c + 28} ${top - 16} ${c + 2} ${top - 12}Z`} fill={fill} />
          <path d={`M${c - 44} ${top + 6}C${c - 62} ${top + 50} ${c - 60} ${top + 100} ${c - 66} ${top + 140}`} stroke={look.hairLight} strokeWidth="2.5" fill="none" opacity="0.35" />
          <g transform="translate(300 0) scale(-1 1)"><path d={`M${c - 44} ${top + 6}C${c - 62} ${top + 50} ${c - 60} ${top + 100} ${c - 66} ${top + 140}`} stroke={look.hairLight} strokeWidth="2.5" fill="none" opacity="0.35" /></g>
        </g>
      )
    case 'female-03':
      return (
        <g>
          <path d={cap} fill={fill} />
          <path d={`M${c - w - 2} ${line + 8}Q${c} ${line - 14} ${c + w + 2} ${line + 8}`} stroke={look.hairBase} strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d={`M${c - w - 2} ${line + 8}Q${c} ${line - 14} ${c + w + 2} ${line + 8}`} stroke={look.hairDeep} strokeWidth="13" fill="none" strokeDasharray="3 6" opacity="0.6" />
          <ellipse cx={c} cy={top - 22} rx="26" ry="21" fill={fill} stroke={look.hairDeep} strokeWidth="2" />
        </g>
      )
    case 'female-05':
      return (
        <g>
          <path d={cap} fill={fill} />
          <path d={`M${c - 2} ${top - 12}Q${c + 14} ${line - 4} ${c + w * 0.55} ${line + 18}`} stroke={look.hairDeep} strokeWidth="1.5" fill="none" opacity="0.55" />
          <path d={`M${c - w - 2} ${line}Q${c - w + 2} ${top + 20} ${c - w * 0.3} ${top - 8}`} stroke={look.hairLight} strokeWidth="2" fill="none" opacity="0.3" />
          <path d={`M${c - w - 4} ${line + 8}C${c - w - 10} ${top + 100} ${c - w - 6} ${s.faceLen - 20} ${c - w + 2} ${s.faceLen + 6}`} stroke={fill} strokeWidth="12" fill="none" strokeLinecap="round" />
          <g transform="translate(300 0) scale(-1 1)"><path d={`M${c - w - 4} ${line + 8}C${c - w - 10} ${top + 100} ${c - w - 6} ${s.faceLen - 20} ${c - w + 2} ${s.faceLen + 6}`} stroke={fill} strokeWidth="12" fill="none" strokeLinecap="round" /></g>
        </g>
      )
    case 'female-06':
      return (
        <g>
          <path d={cap} fill={fill} />
          <path d={`M${c} ${top - 14}L${c} ${line + 2}`} stroke={look.hairDeep} strokeWidth="1.5" opacity="0.6" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${c - w * 0.8 + i * 7} ${line + 2}q2 4 0 7`} stroke={look.hairDeep} strokeWidth="1" fill="none" opacity="0.5" />)}
        </g>
      )
    default:
      return <path d={cap} fill={fill} />
  }
}

function Hat({ look, hat, accent }: { look: Look; hat: string; accent: string }) {
  const { s } = look
  const c = 150
  const w = s.width
  const top = s.topY
  const line = top + 30
  if (hat === 'fitted-cap') {
    return (
      <g>
        <path d={`M${c - w - 5} ${line + 14}C${c - w - 8} ${top + 4} ${c - w * 0.5} ${top - 24} ${c} ${top - 28}C${c + w * 0.5} ${top - 24} ${c + w + 8} ${top + 4} ${c + w + 5} ${line + 14}Z`} fill="#17161a" stroke="#08070a" strokeWidth="2" />
        <path d={`M${c - w - 5} ${line + 8}Q${c} ${line - 6} ${c + w + 5} ${line + 8}L${c + w + 4} ${line + 16}Q${c} ${line + 2} ${c - w - 4} ${line + 16}Z`} fill="#0c0b0e" />
        <path d={`M${c - w - 8} ${line + 12}Q${c} ${line + 2} ${c + w + 8} ${line + 12}C${c + w + 18} ${line + 20} ${c + w + 8} ${line + 30} ${c + w * 0.4} ${line + 28}C${c} ${line + 34} ${c - w * 0.4} ${line + 28} ${c - w - 8} ${line + 26}C${c - w - 16} ${line + 20} ${c - w - 14} ${line + 16} ${c - w - 8} ${line + 12}Z`} fill="#0d0c0f" />
        <circle cx={c} cy={top - 28} r="3.5" fill="#2a292e" />
        <path d={`M${c - 9} ${line - 14}l2 -7 5 4 4 -7 4 7 5 -4 2 7Z`} fill={accent} opacity="0.95" />
        <path d={`M${c - 9} ${line - 14}l1 3h16l1-3`} fill="none" stroke={accent} strokeWidth="1.2" />
        <path d={`M${c - w * 0.5} ${top - 18}Q${c} ${top - 26} ${c + w * 0.5} ${top - 18}`} stroke="#34323a" strokeWidth="1.5" fill="none" />
      </g>
    )
  }
  if (hat === 'beanie') {
    return (
      <g>
        <path d={`M${c - w - 4} ${line + 12}C${c - w - 8} ${top + 2} ${c - w * 0.5} ${top - 34} ${c} ${top - 38}C${c + w * 0.5} ${top - 34} ${c + w + 8} ${top + 2} ${c + w + 4} ${line + 12}Z`} fill="#1b1a1f" stroke="#0a090c" strokeWidth="2" />
        <path d={`M${c - w - 4} ${line - 2}Q${c} ${line - 14} ${c + w + 4} ${line - 2}L${c + w + 3} ${line + 14}Q${c} ${line + 2} ${c - w - 3} ${line + 14}Z`} fill="#26242b" />
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${c - w - 2 + i * (w * 2 + 4) / 8} ${line - 8}l2 18`} stroke="#0e0d11" strokeWidth="1.4" opacity="0.7" />)}
        <path d={`M${c - w * 0.6} ${top - 28}Q${c} ${top - 38} ${c + w * 0.6} ${top - 28}`} stroke="#3a3841" strokeWidth="2" fill="none" opacity="0.6" />
      </g>
    )
  }
  if (hat === 'visor') {
    return (
      <g>
        <path d={`M${c - w - 2} ${line + 12}Q${c - w} ${top + 4} ${c - w * 0.4} ${top - 2}Q${c} ${top - 6} ${c + w * 0.4} ${top - 2}Q${c + w} ${top + 4} ${c + w + 2} ${line + 12}Q${c} ${line + 2} ${c - w - 2} ${line + 12}Z`} fill="#e9e6dc" stroke="#b9b4a7" strokeWidth="1.4" />
        <path d={`M${c - w - 6} ${line + 8}Q${c} ${line - 2} ${c + w + 6} ${line + 8}C${c + w + 18} ${line + 16} ${c + w + 6} ${line + 26} ${c + w * 0.35} ${line + 24}C${c} ${line + 30} ${c - w * 0.35} ${line + 24} ${c - w - 6} ${line + 22}C${c - w - 16} ${line + 16} ${c - w - 14} ${line + 12} ${c - w - 6} ${line + 8}Z`} fill="#dedacf" stroke="#b9b4a7" strokeWidth="1.2" />
        <path d={`M${c - 6} ${line + 3}l3 6 6-2 3 5 4-6 4 4v-8l-6-3-5 2-4-4Z`} fill="#c9c4b8" opacity="0.8" />
      </g>
    )
  }
  if (hat === 'bucket') {
    return (
      <g>
        <path d={`M${c - w - 4} ${line + 6}C${c - w - 8} ${top + 2} ${c - w * 0.5} ${top - 26} ${c} ${top - 30}C${c + w * 0.5} ${top - 26} ${c + w + 8} ${top + 2} ${c + w + 4} ${line + 6}Z`} fill="#17161a" />
        <path d={`M${c - w - 12} ${line + 2}Q${c} ${line - 12} ${c + w + 12} ${line + 2}L${c + w + 8} ${line + 20}Q${c} ${line + 8} ${c - w - 8} ${line + 20}Z`} fill="#232227" stroke="#08070a" strokeWidth="1.2" />
        <path d={`M${c - w - 10} ${line + 6}Q${c} ${line - 4} ${c + w + 10} ${line + 6}`} stroke="#3a383f" strokeWidth="2.5" fill="none" />
        <path d={`M${c - w + 2} ${line + 16}Q${c} ${line + 10} ${c + w - 2} ${line + 16}`} stroke="#3d3b42" strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
      </g>
    )
  }
  if (hat === 'headband') {
    return (
      <g>
        <path d={`M${c - w - 2} ${line + 4}Q${c} ${line - 10} ${c + w + 2} ${line + 4}L${c + w + 1} ${line + 16}Q${c} ${line + 2} ${c - w - 1} ${line + 16}Z`} fill="#e9e5da" stroke="#b8b3a7" strokeWidth="1.2" />
        <path d={`M${c - 6} ${line - 1}l3 5 5-2 3 5 4-5 4 3-1-6-5-3-4 2-3-4Z`} fill={accent} opacity="0.9" />
      </g>
    )
  }
  if (hat === 'bandana') {
    return (
      <g>
        <path d={`M${c - w - 2} ${line + 16}C${c - w} ${top + 6} ${c - w * 0.4} ${top - 16} ${c} ${top - 18}C${c + w * 0.4} ${top - 16} ${c + w} ${top + 6} ${c + w + 2} ${line + 16}C${c + w * 0.6} ${line + 2} ${c} ${line} ${c - w * 0.6} ${line + 4}Z`} fill="#19181d" />
        <path d={`M${c - w + 4} ${top + 6}Q${c} ${top - 8} ${c + w - 4} ${top + 6}`} stroke="#d7d2c8" strokeWidth="1.2" fill="none" strokeDasharray="2 4" opacity="0.7" />
        <path d={`M${c + w - 2} ${line + 4}L${c + w + 22} ${line + 24}L${c + w + 14} ${line + 32}L${c + w - 6} ${line + 14}Z`} fill="#19181d" />
        <path d={`M${c + w + 1} ${line + 8}L${c + w + 18} ${line + 26}`} stroke="#d7d2c8" strokeWidth="1.2" strokeDasharray="2 3" />
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={c - w * 0.5 + i * w * 0.25} cy={top + 2 + (i % 2) * 9} r="1.6" fill="#ded9cf" opacity="0.5" />)}
      </g>
    )
  }
  return null
}

function Glasses({ look, glasses }: { look: Look; glasses: string }) {
  const { s } = look
  const c = 150
  const y = s.eyeY
  const dx = s.eyeDX
  const w = s.eyeW + 3
  const metal = '#dcc9a2'
  if (glasses === 'rectangle') {
    return <g fill="none" stroke={metal} strokeWidth="2.4"><rect x={c - dx - w} y={y - 10} width={w * 2} height="19" rx="2" /><rect x={c + dx - w} y={y - 10} width={w * 2} height="19" rx="2" /><path d={`M${c - dx + w} ${y - 2}L${c + dx - w} ${y - 2}M${c - dx - w} ${y - 4}L${c - dx - w - 8} ${y - 8}M${c + dx + w} ${y - 4}L${c + dx + w + 8} ${y - 8}`} /></g>
  }
  if (glasses === 'round') {
    return <g fill="none" stroke={metal} strokeWidth="2.4"><circle cx={c - dx} cy={y} r={w} /><circle cx={c + dx} cy={y} r={w} /><path d={`M${c - dx + w} ${y}L${c + dx - w} ${y}M${c - dx - w} ${y - 2}L${c - dx - w - 8} ${y - 6}M${c + dx + w} ${y - 2}L${c + dx + w + 8} ${y - 6}`} /></g>
  }
  if (glasses === 'shades') {
    return (
      <g>
        <rect x={c - dx - w - 1} y={y - 11} width={w * 2 + 2} height="22" rx="4" fill="#0d0e12" stroke="#d1ad62" strokeWidth="1.6" />
        <rect x={c + dx - w - 1} y={y - 11} width={w * 2 + 2} height="22" rx="4" fill="#0d0e12" stroke="#d1ad62" strokeWidth="1.6" />
        <path d={`M${c - dx + w + 1} ${y - 2}L${c + dx - w - 1} ${y - 2}`} stroke="#d1ad62" strokeWidth="2" />
        <path d={`M${c - dx - w} ${y - 8}L${c - dx - w * 0.2} ${y - 9}M${c + dx - w} ${y - 8}L${c + dx - w * 0.2} ${y - 9}`} stroke="#f4f8ff" strokeWidth="1.4" opacity="0.4" />
        <path d={`M${c - dx - w - 2} ${y - 4}L${c - dx - w - 10} ${y - 8}M${c + dx + w + 2} ${y - 4}L${c + dx + w + 10} ${y - 8}`} stroke="#d1ad62" strokeWidth="1.6" />
      </g>
    )
  }
  if (glasses === 'chrome') {
    return (
      <g>
        <path d={`M${c - dx - w - 4} ${y - 12}L${c + dx + w + 4} ${y - 12}L${c + dx + w - 2} ${y + 11}Q${c} ${y + 20} ${c - dx - w + 2} ${y + 11}Z`} fill="#c9dadd" fillOpacity="0.72" stroke="#eef7f4" strokeWidth="2" />
        <path d={`M${c - dx - w} ${y - 5}L${c + dx + w} ${y - 5}`} stroke="#f6fcfa" strokeWidth="1.6" opacity="0.8" />
        <path d={`M${c - dx - w - 2} ${y - 6}L${c - dx - w - 10} ${y - 10}M${c + dx + w + 2} ${y - 6}L${c + dx + w + 10} ${y - 10}`} stroke="#dfe9e6" strokeWidth="2" />
      </g>
    )
  }
  return null
}

function Jewelry({ look, jewelry }: { look: Look; jewelry: string }) {
  const { uid } = look
  const c = 150
  const gold = `url(#${uid}-gold)`
  const silver = `url(#${uid}-silver)`
  const left = c - look.earX
  const right = c + look.earX
  const lobe = look.lobeY
  const chain = `M${c - 27} 312Q${c} 352 ${c + 27} 312`
  return (
    <g>
      {(jewelry === 'hoops' || jewelry === 'diamond-hoops') && (
        <g fill="none" stroke={jewelry === 'hoops' ? gold : silver} strokeWidth="2.6">
          <circle cx={left} cy={lobe + 10} r="13" /><circle cx={right} cy={lobe + 10} r="13" />
          <circle cx={left} cy={lobe + 10} r="10" strokeWidth="0.8" opacity="0.5" /><circle cx={right} cy={lobe + 10} r="10" strokeWidth="0.8" opacity="0.5" />
        </g>
      )}
      {jewelry === 'studs' && (
        <g fill={silver}>
          <rect x={left - 4} y={lobe - 3} width="8" height="8" rx="1" transform={`rotate(45 ${left} ${lobe + 1})`} />
          <rect x={right - 4} y={lobe - 3} width="8" height="8" rx="1" transform={`rotate(45 ${right} ${lobe + 1})`} />
        </g>
      )}
      {jewelry === 'cuban-chain' && (
        <g fill="none">
          <path d={chain} stroke={gold} strokeWidth="9" strokeLinecap="round" />
          <path d={chain} stroke="#5b3c0b" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.65" />
          <path d={chain} stroke="#fff0b8" strokeWidth="1.8" opacity="0.45" transform="translate(-1 -2)" />
        </g>
      )}
      {jewelry === 'pendant-chain' && (
        <g>
          <path d={`M${c - 24} 310Q${c} 346 ${c + 24} 310`} fill="none" stroke={silver} strokeWidth="1.8" />
          <rect x={c - 8} y={344} width="16" height="21" rx="1.5" fill="#dce5e7" stroke="#737b7d" strokeWidth="1.2" />
          <path d={`M${c - 4} 350l4 5 4-5M${c - 4} 356l4 5 4-5`} stroke="#f6fbfa" strokeWidth="1" fill="none" />
        </g>
      )}
      {jewelry === 'medallion' && (
        <g>
          <path d={chain} fill="none" stroke={gold} strokeWidth="2.4" />
          <circle cx={c} cy="354" r="13" fill={gold} stroke="#6e4c0e" strokeWidth="1.5" />
          <circle cx={c} cy="354" r="9" fill="none" stroke="#fff0b8" strokeWidth="1" opacity="0.6" />
          <path d={`M${c} 346l2.5 5.5 6 .6-4.5 4 1.3 5.9-5.3-3-5.3 3 1.3-5.9-4.5-4 6-.6Z`} fill="#f7df96" />
        </g>
      )}
    </g>
  )
}

function Top({ appearance, look, topGrad, accent, uid }: { appearance: ArtistAppearance; look: Look; topGrad: string; accent: string; uid: string }) {
  const { skin } = look
  const c = 150
  const body = 'M-8 330C40 306 100 300 150 300C200 300 260 306 308 330L252 424L48 424Z'
  const neckSkin = `M${c - 24} 300C${c - 12} 308 ${c + 12} 308 ${c + 24} 300L${c + 28} 322C${c + 10} 330 ${c - 10} 330 ${c - 28} 322Z`
  const fill = `url(#${topGrad})`
  const gold = `url(#${uid}-gold)`
  switch (appearance.top) {
    case 'male-01':
      return (
        <g>
          <path d={body} fill="#17161b" />
          <path d={`M${c} 316L${c - 24} 334L${c} 424L${c + 26} 334Z`} fill="#0b0b0d" />
          <path d={`M${c - 68} 330L${c} 350L${c - 12} 424L${c - 78} 392Z`} fill="#1d1c21" />
          <path d={`M${c + 68} 330L${c} 350L${c + 12} 424L${c + 78} 392Z`} fill="#151418" />
          <path d={`M${c - 52} 328L${c} 352L${c - 26} 424`} fill="none" stroke="#2d2c33" strokeWidth="3" />
          <path d={`M${c + 52} 328L${c} 352L${c + 26} 424`} fill="none" stroke="#2d2c33" strokeWidth="3" />
          <path d={`M${c} 354L${c} 424`} stroke="#b9b7bc" strokeWidth="2" opacity="0.6" />
          <path d={`M${c + 58} 334C${c + 78} 360 ${c + 90} 392 ${c + 94} 424`} stroke="#b3342b" strokeWidth="13" fill="none" />
          <path d={`M${c - 42} 322Q${c} 342 ${c + 42} 322`} stroke="#2a2930" strokeWidth="9" fill="none" />
        </g>
      )
    case 'female-01':
      return (
        <g>
          <path d={body} fill="#121114" />
          <path d={`M${c} 318L${c - 21} 338L${c} 424L${c + 21} 338Z`} fill="#070709" />
          <path d={`M${c - 70} 334L${c} 352L${c - 10} 424L${c - 80} 398Z`} fill="#1c1b20" />
          <path d={`M${c + 70} 334L${c} 352L${c + 10} 424L${c + 80} 398Z`} fill="#141317" />
          <path d={`M${c - 54} 332L${c} 354L${c - 24} 424`} fill="none" stroke="#34323a" strokeWidth="3" />
          <path d={`M${c + 54} 332L${c} 354L${c + 24} 424`} fill="none" stroke="#34323a" strokeWidth="3" />
          <path d={`M${c - 70} 336L${c} 354M${c + 70} 336L${c} 354`} stroke="#b3342b" strokeWidth="2.4" opacity="0.8" />
          <path d={`M${c} 356L${c} 424`} stroke="#c3c1c6" strokeWidth="2" opacity="0.65" />
          <path d={`M${c} 360L${c} 420`} stroke="#5f5e65" strokeWidth="1" strokeDasharray="2 3" />
          <circle cx={c} cy="380" r="3.2" fill="#d8d6da" stroke="#5f5e65" strokeWidth="0.8" />
          <path d={`M${c - 44} 324Q${c} 344 ${c + 44} 324`} stroke="#29282f" strokeWidth="9" fill="none" />
        </g>
      )
    case 'male-02':
    case 'female-02':
      if (appearance.top === 'female-02') {
        return (
          <g>
            <path d={body} fill={skin.base} />
            <path d={`M${c - 38} 342C${c - 30} 330 ${c - 14} 326 ${c} 326C${c + 14} 326 ${c + 30} 330 ${c + 38} 342L${c + 44} 424L${c - 44} 424Z`} fill={fill} />
            <path d={`M${c - 28} 328C${c - 12} 342 ${c + 12} 342 ${c + 28} 328C${c + 12} 318 ${c - 12} 318 ${c - 28} 328Z`} fill={skin.base} />
            <path d={`M${c - 30} 320L${c - 22} 340M${c + 30} 320L${c + 22} 340`} stroke="#f0ebdf" strokeWidth="6" strokeLinecap="round" />
            <path d={`M${c - 28} 360Q${c - 10} 354 ${c - 2} 366M${c + 8} 380Q${c + 24} 372 ${c + 32} 384`} stroke="#c9beac" strokeWidth="2" fill="none" opacity="0.5" />
          </g>
        )
      }
      return (
        <g>
          <path d={body} fill={fill} />
          <path d={neckSkin} fill={skin.base} />
          <path d={`M${c - 22} 308C${c - 10} 316 ${c + 10} 316 ${c + 22} 308`} stroke="#ded5c6" strokeWidth="4" fill="none" />
          <path d={`M${c - 18} 312q${18} 8 ${36} 0`} stroke={skin.shade} strokeWidth="1.5" fill="none" opacity="0.25" />
          <path d={`M${c - 58} 352Q${c - 40} 348 ${c - 26} 360M${c + 24} 380Q${c + 44} 372 ${c + 60} 386`} stroke="#b9ae9c" strokeWidth="2" fill="none" opacity="0.4" />
        </g>
      )
    case 'male-03':
    case 'female-05':
      return (
        <g>
          <path d={body} fill="#101012" />
          <path d={`M${c} 314L${c - 26} 334L${c} 364L${c + 26} 334Z`} fill={skin.base} />
          <path d={`M${c - 26} 334L${c} 364L${c + 26} 334`} stroke={gold} strokeWidth="4" fill="none" />
          <path d={`M${c - 60} 330L${c - 44} 424M${c + 60} 330L${c + 44} 424`} stroke={gold} strokeWidth="3" opacity="0.8" />
          <text x={c} y="414" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="52" fill="#f4e7c2" stroke="#b58b35" strokeWidth="1">26</text>
        </g>
      )
    case 'male-04':
    case 'female-03':
      return (
        <g>
          <path d={body} fill={fill} />
          <path d={`M${c - 52} 326C${c - 48} 300 ${c - 22} 294 ${c} 306C${c + 22} 294 ${c + 48} 300 ${c + 52} 326C${c + 34} 344 ${c - 34} 344 ${c - 52} 326Z`} fill={appearance.top === 'male-04' ? '#4f525a' : '#a84067'} stroke="#1a181c" strokeWidth="2" />
          <path d={`M${c - 38} 322C${c - 20} 338 ${c + 20} 338 ${c + 38} 322`} fill="none" stroke="#1a181c" strokeWidth="3" opacity="0.5" />
          <path d={`M${c - 12} 328L${c - 18} 382M${c + 12} 328L${c + 18} 382`} stroke="#d9d5cc" strokeWidth="3" strokeLinecap="round" />
          <circle cx={c - 18} cy={382} r="2.6" fill="#b9b4aa" /><circle cx={c + 18} cy={382} r="2.6" fill="#b9b4aa" />
          <path d={`M${c - 40} 390Q${c} 402 ${c + 40} 390`} stroke="#1a181c" strokeWidth="2" fill="none" opacity="0.45" />
        </g>
      )
    case 'male-05':
      return (
        <g>
          <path d={body} fill="#111013" />
          <path d={`M${c - 66} 330C${c - 58} 324 ${c - 44} 322 ${c - 34} 330L${c - 40} 424L${c - 78} 424L${c - 84} 380Z`} fill="#b3342b" />
          <path d={`M${c + 66} 330C${c + 58} 324 ${c + 44} 322 ${c + 34} 330L${c + 40} 424L${c + 78} 424L${c + 84} 380Z`} fill="#a52d24" />
          {[356, 376, 396].map((y) => <path key={y} d={`M${c - 80} ${y}Q${c} ${y + 8} ${c + 80} ${y}`} stroke="#7d1d19" strokeWidth="2" fill="none" opacity="0.7" />)}
          <path d={`M${c} 334L${c} 424`} stroke={gold} strokeWidth="4" />
          <path d={`M${c - 34} 324Q${c} 342 ${c + 34} 324`} stroke="#7d1d19" strokeWidth="8" fill="none" />
        </g>
      )
    case 'male-06':
    case 'female-06':
      return (
        <g>
          <path d={body} fill={appearance.top === 'female-06' ? '#f1ece1' : '#eee9df'} />
          <path d={`M${c - 64} 330C${c - 54} 322 ${c - 40} 322 ${c - 30} 330L${c - 36} 424L${c - 78} 424L${c - 82} 382Z`} fill="#35618c" />
          <path d={`M${c + 64} 330C${c + 54} 322 ${c + 40} 322 ${c + 30} 330L${c + 36} 424L${c + 78} 424L${c + 82} 382Z`} fill="#2d547b" />
          <path d={`M${c - 40} 326L${c - 30} 338L${c - 20} 330M${c + 40} 326L${c + 30} 338L${c + 20} 330`} stroke="#c9a96e" strokeWidth="1.6" fill="none" strokeDasharray="3 3" />
          <circle cx={c + 20} cy="360" r="2.4" fill="#d7c08e" />
          <circle cx={c - 20} cy="392" r="2.4" fill="#d7c08e" />
          <path d={`M${c - 58} 350L${c - 46} 424M${c - 52} 370L${c - 42} 424`} stroke="#d9b26a" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.8" />
          <path d={`M${c + 58} 350L${c + 46} 424M${c + 52} 370L${c + 42} 424`} stroke="#d9b26a" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.8" />
          {appearance.top === 'female-06' && <path d={`M${c} 334L${c} 424`} stroke="#d9d2c4" strokeWidth="10" opacity="0.7" />}
        </g>
      )
    case 'female-04':
      return (
        <g>
          <path d={body} fill={skin.base} />
          <path d={`M${c - 38} 350C${c - 24} 338 ${c + 24} 338 ${c + 38} 350L${c + 44} 424L${c - 44} 424Z`} fill={gold} />
          <path d={`M${c - 14} 332L${c} 364L${c + 14} 332`} stroke={gold} strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d={`M${c - 34} 356Q${c} 366 ${c + 34} 356M${c - 36} 374Q${c} 386 ${c + 36} 374M${c - 30} 392Q${c} 404 ${c + 30} 392`} stroke="#8a6416" strokeWidth="1.6" fill="none" opacity="0.65" />
          <path d={`M${c - 20} 352Q${c - 8} 380 ${c - 14} 424M${c + 20} 352Q${c + 8} 380 ${c + 14} 424`} stroke="#f5dc8f" strokeWidth="2" fill="none" opacity="0.5" />
        </g>
      )
    default:
      return <path d={body} fill={fill} stroke={accent} strokeWidth="1" />
  }
}

function Shoe({ x, y, style }: { x: number; y: number; style: { upper: string; sole: string; accent: string } }) {
  return (
    <g>
      <path d={`M${x} ${y + 12}C${x + 1} ${y + 3} ${x + 8} ${y - 2} ${x + 17} ${y - 1}L${x + 28} ${y + 4}L${x + 39} ${y + 8}C${x + 44} ${y + 9} ${x + 45} ${y + 13} ${x + 43} ${y + 17}L${x + 3} ${y + 17}C${x + 1} ${y + 17} ${x} ${y + 15} ${x} ${y + 12}Z`} fill={style.upper} stroke="#0a0a0b" strokeWidth="1.4" />
      <path d={`M${x + 2} ${y + 14}L${x + 44} ${y + 14}`} stroke={style.sole} strokeWidth="4" />
      <path d={`M${x + 5} ${y + 5}L${x + 20} ${y + 6}`} stroke="#fff" strokeWidth="1.2" opacity="0.22" />
      <path d={`M${x + 12} ${y - 1}L${x + 22} ${y - 13}L${x + 29} ${y - 13}L${x + 24} ${y + 3}`} fill={style.upper} stroke="#0a0a0b" strokeWidth="1.2" />
      <path d={`M${x + 14} ${y + 3}L${x + 34} ${y + 6}`} stroke={style.accent} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </g>
  )
}

function LowerBody({ appearance }: { appearance: ArtistAppearance }) {
  const pants = bottomColor(appearance.bottoms)
  const shoe = SHOE_STYLES[appearance.shoes] ?? { upper: '#ecece8', sole: '#d7d7d2', accent: '#b9b9b3' }
  return (
    <g>
      <path d="M86 226L214 226L206 306L194 386L162 386L154 306L146 306L138 386L106 386L94 306Z" fill={pants} stroke="#0a090b" strokeWidth="2" />
      <path d="M88 232L212 232" stroke="#0a090b" strokeWidth="3" opacity="0.45" />
      <path d="M150 306L150 384" stroke="#0a090b" strokeWidth="2" opacity="0.35" />
      <path d="M108 386L138 386L136 394L106 394Z" fill={shoe.upper} />
      <path d="M162 386L192 386L194 394L164 394Z" fill={shoe.upper} />
      <Shoe x={92} y={376} style={shoe} />
      <Shoe x={156} y={376} style={shoe} />
    </g>
  )
}

export function CareerPortrait({ appearance, genre = 'HIP-HOP', className = '', encore = false, mode = 'bust' }: CareerPortraitProps) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const uid = `cp${raw}`
  const look = GENRE_LOOK[genre] ?? GENRE_LOOK['HIP-HOP']
  const s = buildFace(appearance)
  const skin = buildSkin(colorOf(appearance, 'skin', '#b87345'))
  const hairBase = colorOf(appearance, 'hairColor', '#171313')
  const hairLight = mix(hairBase, '#e6c79f', 0.45)
  const hairDeep = mix(hairBase, '#000000', 0.55)
  const beard = colorOf(appearance, 'facialHairColor', hairBase)
  const [topA, topB] = topColor(appearance.top)
  const head = headPath(s)
  const headClip = `${uid}-head`
  const faceLabel = careerOptionLabel('face', appearance.face)
  const hairLabel = careerOptionLabel('hair', appearance.hair)
  const hatLabel = careerOptionLabel('hat', appearance.hat)
  const female = appearance.presentation === 'female'
  const lookData: Look = {
    s,
    skin,
    female,
    hair: appearance.hair,
    hairBase,
    hairLight,
    hairDeep,
    uid,
    earX: s.width - 1,
    lobeY: s.eyeY + s.earH * 0.64,
    headClip,
    beard,
  }
  const hairCovered = ['fitted-cap', 'beanie', 'bucket', 'bandana'].includes(appearance.hat)
  const full = mode === 'full'
  const art = (
    <g>
      <path d={`M${150 - s.neckW * 0.92} ${s.jawY - 8}C${150 - s.neckW} ${s.jawY + 26} ${150 - s.neckW * 1.05} ${s.jawY + 54} ${150 - s.neckW * 1.08} 318L${150 + s.neckW * 1.08} 318C${150 + s.neckW * 1.05} ${s.jawY + 54} ${150 + s.neckW} ${s.jawY + 26} ${150 + s.neckW * 0.92} ${s.jawY - 8}Z`} fill={skin.mid} />
      <ellipse cx="150" cy={s.jawY + 2} rx={s.jaw * 1.02} ry="22" fill={skin.deep} opacity="0.55" filter={`url(#${uid}-blur2)`} />
      <path d={head} fill={skin.base} opacity="0" />
      <Top appearance={appearance} look={lookData} topGrad={`${uid}-top`} accent={look.glow} uid={uid} />
      <HairBack look={lookData} />
      <ellipse cx={150 - s.width + 2} cy={s.eyeY + 2} rx="9" ry={s.earH / 2} fill={skin.mid} />
      <ellipse cx={150 + s.width - 2} cy={s.eyeY + 2} rx="9" ry={s.earH / 2} fill={skin.mid} />
      <path d={`M${150 - s.width + 4} ${s.eyeY - 4}q-6 8 0 18`} stroke={skin.shade} strokeWidth="2" fill="none" opacity="0.5" />
      <path d={`M${150 + s.width - 4} ${s.eyeY - 4}q6 8 0 18`} stroke={skin.shade} strokeWidth="2" fill="none" opacity="0.5" />
      <g clipPath={`url(#${headClip})`}>
        <path d={head} fill={`url(#${uid}-skin)`} />
        <ellipse cx={150 + s.width * 0.72} cy={s.cheekY + 4} rx={s.width * 0.62} ry={s.faceLen - s.topY} fill={skin.shade} opacity="0.3" filter={`url(#${uid}-blur2)`} />
        <ellipse cx={150 - s.width * 0.62} cy={s.topY + 48} rx="28" ry="16" fill={skin.lighter} opacity="0.24" filter={`url(#${uid}-blur)`} />
        <ellipse cx={150 - s.width * 0.52} cy={s.cheekY + 8} rx="15" ry="10" fill={skin.lighter} opacity="0.22" filter={`url(#${uid}-blur)`} />
        <ellipse cx={150 + s.width * 0.5} cy={s.cheekY + 10} rx="14" ry="9" fill={skin.lighter} opacity="0.18" filter={`url(#${uid}-blur)`} />
        <ellipse cx={150 - s.width * 0.6} cy={s.cheekY + 34} rx="9" ry="16" fill={skin.shade} opacity="0.26" filter={`url(#${uid}-blur)`} />
        <ellipse cx={150 + s.width * 0.6} cy={s.cheekY + 34} rx="9" ry="16" fill={skin.shade} opacity="0.26" filter={`url(#${uid}-blur)`} />
        <ellipse cx={150} cy={s.faceLen - 18} rx="16" ry="8" fill={skin.lighter} opacity="0.2" filter={`url(#${uid}-blur)`} />
        <path d={`M${150 - s.width * 0.84} ${s.topY + 34}Q150 ${s.topY + 20} ${150 + s.width * 0.84} ${s.topY + 34}`} stroke={skin.shade} strokeWidth="14" fill="none" opacity="0.12" filter={`url(#${uid}-blur)`} />
        <path d={`M${150 - s.width * 0.95} ${s.topY + 62}Q${150 - s.width * 1.03} ${s.cheekY + 8} ${150 - s.width * 0.74} ${s.jawY}`} stroke={skin.shade} strokeWidth="10" fill="none" opacity="0.12" filter={`url(#${uid}-blur)`} />
        <path d={`M${150 - s.jaw * 0.9} ${s.jawY}Q150 ${s.jawY + 26} ${150 + s.jaw * 0.9} ${s.jawY}`} stroke={skin.shade} strokeWidth="12" fill="none" opacity="0.1" filter={`url(#${uid}-blur)`} />
        <path d={`M${150 - s.noseW * 0.8} ${s.eyeY + s.noseLen + 4}q${s.noseW * 0.8} 16 ${s.lipW * 0.55} 30`} stroke={skin.shade} strokeWidth="2.6" fill="none" opacity="0.28" filter={`url(#${uid}-blur)`} />
        <path d={`M${150 + s.noseW * 0.8} ${s.eyeY + s.noseLen + 4}q-${s.noseW * 0.8} 16 -${s.lipW * 0.55} 30`} stroke={skin.shade} strokeWidth="2.6" fill="none" opacity="0.28" filter={`url(#${uid}-blur)`} />
        <rect x={150 - s.width} y={s.topY} width={s.width * 2} height={s.faceLen - s.topY} filter={`url(#${uid}-grain)`} opacity="0.2" style={{ mixBlendMode: 'soft-light' }} />
      </g>
      <path d={head} fill="none" stroke={skin.deep} strokeWidth="1" opacity="0.28" />
      <path d={`M${150 + s.width - 3} ${s.topY + 24}C${150 + s.width + 1} ${s.cheekY} ${150 + s.jaw * 0.85} ${s.jawY} 150 ${s.faceLen - 2}`} stroke={look.rim} strokeWidth="3" fill="none" opacity="0.32" filter={`url(#${uid}-blur)`} />
      <Brow x={150 - s.eyeDX} s={s} color={hairDeep} />
      <Brow x={150 + s.eyeDX} s={s} color={hairDeep} />
      <Eye x={150 - s.eyeDX} s={s} skin={skin} female={female} uid={uid} />
      <Eye x={150 + s.eyeDX} s={s} skin={skin} female={female} uid={uid} />
      <Nose s={s} skin={skin} uid={uid} />
      <Mouth s={s} skin={skin} uid={uid} />
      {appearance.facialHair === 'shadow' && (
        <g clipPath={`url(#${headClip})`}>
          <path d={`M${150 - s.width + 2} ${s.cheekY}C${150 - s.width} ${s.jawY} ${150 - s.jaw} ${s.jawY + 18} 150 ${s.faceLen}C${150 + s.jaw} ${s.jawY + 18} ${150 + s.width} ${s.jawY} ${150 + s.width - 2} ${s.cheekY}C${150 + s.width - 16} ${s.cheekY + 28} ${150 + s.jaw * 0.7} ${s.jawY + 2} 150 ${s.mouthY + 16}C${150 - s.jaw * 0.7} ${s.jawY + 2} ${150 - s.width + 16} ${s.cheekY + 28} ${150 - s.width + 2} ${s.cheekY}Z`} fill={beard} opacity="0.22" />
        </g>
      )}
      {appearance.facialHair === 'goatee' && (
        <g fill={beard}>
          <ellipse cx="150" cy={s.faceLen - 17} rx="17" ry="21" opacity="0.92" />
          <path d={`M${150 - s.lipW * 0.5} ${s.mouthY - 4}Q150 ${s.mouthY - 12} ${150 + s.lipW * 0.5} ${s.mouthY - 4}Q150 ${s.mouthY - 1} ${150 - s.lipW * 0.5} ${s.mouthY - 4}Z`} />
        </g>
      )}
      {appearance.facialHair === 'beard' && (
        <g clipPath={`url(#${headClip})`} fill={beard}>
          <path d={`M${150 - s.width + 2} ${s.cheekY - 2}C${150 - s.width} ${s.jawY} ${150 - s.jaw} ${s.jawY + 18} 150 ${s.faceLen + 1}C${150 + s.jaw} ${s.jawY + 18} ${150 + s.width} ${s.jawY} ${150 + s.width - 2} ${s.cheekY - 2}C${150 + s.width - 14} ${s.cheekY + 26} ${150 + s.jaw * 0.7} ${s.jawY + 4} 150 ${s.mouthY + 16}C${150 - s.jaw * 0.7} ${s.jawY + 4} ${150 - s.width + 14} ${s.cheekY + 26} ${150 - s.width + 2} ${s.cheekY - 2}Z`} opacity="0.94" />
          <path d={`M${150 - s.lipW * 0.52} ${s.mouthY - 4}Q150 ${s.mouthY - 13} ${150 + s.lipW * 0.52} ${s.mouthY - 4}Q150 ${s.mouthY - 1} ${150 - s.lipW * 0.52} ${s.mouthY - 4}Z`} />
        </g>
      )}
      {appearance.facialHair === 'mustache' && (
        <path d={`M${150 - s.lipW * 0.55} ${s.mouthY - 4}Q${150 - s.lipW * 0.2} ${s.mouthY - 12} 150 ${s.mouthY - 6}Q${150 + s.lipW * 0.2} ${s.mouthY - 12} ${150 + s.lipW * 0.55} ${s.mouthY - 4}Q${150 + s.lipW * 0.15} ${s.mouthY - 1} 150 ${s.mouthY - 3}Q${150 - s.lipW * 0.15} ${s.mouthY - 1} ${150 - s.lipW * 0.55} ${s.mouthY - 4}Z`} fill={beard} />
      )}
      {!hairCovered && <HairFront look={lookData} />}
      <Hat look={lookData} hat={appearance.hat} accent={look.glow} />
      <Glasses look={lookData} glasses={appearance.glasses} />
      <Jewelry look={lookData} jewelry={appearance.jewelry} />
    </g>
  )
  return (
    <div className={`career-portrait ${className} ${encore ? 'is-encore' : ''}`}>
      <svg viewBox={full ? '0 0 300 400' : '30 30 240 390'} preserveAspectRatio="xMidYMin slice" role="img" aria-label={`${faceLabel} face, ${hairLabel} hair, ${hatLabel}`}>
        <defs>
          <radialGradient id={`${uid}-bg`} cx="50%" cy="28%" r="78%">
            <stop offset="0" stopColor={mix(look.deep, '#ffffff', 0.16)} />
            <stop offset="0.55" stopColor={look.deep} />
            <stop offset="1" stopColor="#050305" />
          </radialGradient>
          <radialGradient id={`${uid}-skin`} cx="36%" cy="22%" r="82%">
            <stop offset="0" stopColor={skin.light} />
            <stop offset="0.45" stopColor={skin.base} />
            <stop offset="0.8" stopColor={skin.mid} />
            <stop offset="1" stopColor={skin.shade} />
          </radialGradient>
          <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor={hairLight} />
            <stop offset="0.35" stopColor={hairBase} />
            <stop offset="1" stopColor={hairDeep} />
          </linearGradient>
          <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor={topA} />
            <stop offset="1" stopColor={topB} />
          </linearGradient>
          <radialGradient id={`${uid}-iris`} cx="40%" cy="36%" r="64%">
            <stop offset="0" stopColor="#8a5a35" />
            <stop offset="0.5" stopColor="#48220f" />
            <stop offset="1" stopColor="#140904" />
          </radialGradient>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff0b8" /><stop offset="0.3" stopColor="#e8b64a" /><stop offset="0.5" stopColor="#a8731d" /><stop offset="0.72" stopColor="#f4d27a" /><stop offset="1" stopColor="#8a5a12" />
          </linearGradient>
          <linearGradient id={`${uid}-silver`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset="0.4" stopColor="#cfd8da" /><stop offset="0.7" stopColor="#8f9a9c" /><stop offset="1" stopColor="#eef5f5" />
          </linearGradient>
          <radialGradient id={`${uid}-vig`} cx="50%" cy="44%" r="72%">
            <stop offset="0.45" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.72" />
          </radialGradient>
          <filter id={`${uid}-blur`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id={`${uid}-blur2`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
          <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
          </filter>
          <clipPath id={headClip}><path d={head} /></clipPath>
        </defs>
        <rect width="300" height="400" fill={`url(#${uid}-bg)`} />
        <ellipse cx="150" cy="180" rx="132" ry="142" fill={look.glow} opacity={encore ? 0.18 : 0.1} filter={`url(#${uid}-blur2)`} />
        {[38, 66, 92, 214, 244, 266].map((x, i) => <circle key={i} cx={x} cy={70 + (i % 3) * 62} r={7 + (i % 4) * 3} fill={look.glow} opacity="0.16" filter={`url(#${uid}-blur2)`} />)}
        <path d="M30 400L30 352C92 326 208 326 270 352L270 400Z" fill="#000" opacity="0.2" />
        <rect width="300" height="400" fill={`url(#${uid}-vig)`} />
        {full ? <><LowerBody appearance={appearance} /><g transform="translate(67.5 0) scale(0.55)">{art}</g></> : art}
        <rect width="300" height="400" filter={`url(#${uid}-grain)`} opacity="0.1" style={{ mixBlendMode: 'overlay' }} />
      </svg>
      <span className="career-portrait__tag">{encore ? 'ENCORE FORM' : 'LOCAL ARTIST'}</span>
    </div>
  )
}
