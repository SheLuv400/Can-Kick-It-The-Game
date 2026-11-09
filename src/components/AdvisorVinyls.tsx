import { ADVISOR_MAX_CHARGES } from '../game/battle'

interface AdvisorVinylsProps {
  charges: number
  max?: number
  className?: string
}

/** The two gold records are the physical promise of the two advice spins. */
export function AdvisorVinyls({
  charges,
  max = ADVISOR_MAX_CHARGES,
  className = '',
}: AdvisorVinylsProps) {
  return (
    <span
      className={`dj-vinyls ${className}`.trim()}
      aria-label={`${charges} of ${max} DJ Kickit advice spins left`}
    >
      {Array.from({ length: max }).map((_, index) => (
        <span
          key={index}
          className={`dj-vinyl ${index < charges ? 'is-live' : 'is-spent'}`}
          aria-hidden="true"
        >
          <i />
          <b />
        </span>
      ))}
    </span>
  )
}
