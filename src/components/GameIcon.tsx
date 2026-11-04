import type { SVGProps } from 'react'

export type GameIconName =
  | 'play'
  | 'team'
  | 'mixtape'
  | 'collection'
  | 'circuit'
  | 'charts'
  | 'tutorial'
  | 'settings'
  | 'home'
  | 'design'
  | 'rules'
  | 'crate'
  | 'backstage'
  | 'bolt'
  | 'shield'
  | 'crowd'
  | 'spark'
  | 'star'
  | 'chevron'
  | 'close'

const PATHS: Record<GameIconName, React.ReactNode> = {
  play: (
    <>
      <path d="M8 5.5 18.5 12 8 18.5z" />
      <path d="M4 8v8M2.5 10v4" />
    </>
  ),
  team: (
    <>
      <path d="m4 8 4 3 4-6 4 6 4-3-1.8 9H5.8z" />
      <path d="M7 20h10" />
    </>
  ),
  mixtape: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="1.5" />
      <circle cx="8" cy="12" r="2.2" />
      <circle cx="16" cy="12" r="2.2" />
      <path d="M10.2 12h3.6M4.5 6.5 6 4h12l1.5 2.5" />
    </>
  ),
  collection: (
    <>
      <rect x="3.5" y="5" width="11" height="15" rx="1" />
      <path d="M7 3.5h12.5V18M7 9h4M7 13h4" />
    </>
  ),
  circuit: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="9" cy="18" r="2" />
      <path d="M8 6.5c4 0 3 7 8 7M7 8c0 4 2 8 2 8M16 10c-2 3-4 4-6 6" />
    </>
  ),
  charts: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M7 16v-4M11 16V8M15 16v-6M19 16V6" />
    </>
  ),
  tutorial: (
    <>
      <path d="M3 6.5 12 3l9 3.5-9 3.7z" />
      <path d="M6 9v5c0 1.8 2.7 3.4 6 3.4s6-1.6 6-3.4V9M21 7v5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h6M14 6h6M4 12h11M19 12h1M4 18h3M11 18h9" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="17" cy="12" r="2" />
      <circle cx="9" cy="18" r="2" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 11 8.5-7 8.5 7" />
      <path d="M5.5 9.5V20h13V9.5M10 20v-5h4v5" />
    </>
  ),
  design: (
    <>
      <path d="m12 2 1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" />
    </>
  ),
  rules: (
    <>
      <path d="M4 5.5c3-1 5.5-.7 8 1v13c-2.5-1.7-5-2-8-1z" />
      <path d="M20 5.5c-3-1-5.5-.7-8 1v13c2.5-1.7 5-2 8-1z" />
      <path d="M7 9h2M7 12h2M15 9h2M15 12h2" />
    </>
  ),
  crate: (
    <>
      <path d="M4 7h16v13H4zM4 7l2-4h12l2 4M4 11h16M12 7v13" />
      <circle cx="12" cy="15" r="2.5" />
    </>
  ),
  backstage: (
    <>
      <path d="M3 4h18M4 4v16M20 4v16" />
      <path d="M7 4c0 5-2 8-2 13M17 4c0 5 2 8 2 13M8 20h8" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  bolt: <path d="M13.5 2.5 5 13h5.5L10 21.5 19 10h-5.5z" />,
  shield: (
    <>
      <path d="M12 2.5 4.5 5.5v6c0 4.8 3.1 8.1 7.5 10.5 4.4-2.4 7.5-5.7 7.5-10.5v-6z" />
      <path d="m8.5 11.5 2.3 2.3 4.7-4.8" />
    </>
  ),
  crowd: (
    <>
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="7" r="2.2" />
      <path d="M3.5 20v-5c0-2.4 1.5-4 3.5-4s3.5 1.6 3.5 4v5M13.5 20v-5c0-2.4 1.5-4 3.5-4s3.5 1.6 3.5 4v5M12 20v-2" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 17v4M17 19h4" />
    </>
  ),
  star: (
    <>
      <path d="m12 2.7 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3.1-5.8 3.1 1.1-6.4L2.6 9.5l6.5-.9z" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  close: <path d="M5 5l14 14M19 5 5 19" />,
}

export function GameIcon({
  name,
  className = '',
  ...props
}: { name: GameIconName; className?: string } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      className={`game-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
