/**
 * Personal Artist Cards live in a reserved local ID namespace. They are never
 * part of the collectible roster and must be rejected by every online path.
 */
export const PERSONAL_ARTIST_PREFIX = 'my-artist-'

export function isPersonalArtistId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PERSONAL_ARTIST_PREFIX)
}
