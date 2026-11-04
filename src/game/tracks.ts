/**
 * Artist recordings.
 *
 * Suno protects its audio files, so a track is played through Suno's official
 * embed rather than a downloaded file. Add an entry keyed by artist id and the
 * card's showcase grows a play control automatically.
 */
export interface Track {
  title: string
  credit: string
  year: string
  mood: string
  shareUrl: string
  embedUrl: string
}

export const TRACKS: Record<string, Track> = {
  'macko-deville': {
    title: 'Heavy Talk, Heavy Walk',
    credit: 'can i kick it',
    year: '1997',
    mood: 'HIP-HOP · BOOM BAP · HARDCORE',
    shareUrl: 'https://suno.com/s/qX5CyuGAL5HbgtZY',
    embedUrl: 'https://suno.com/embed/0ec42fe8-b6ff-4848-a747-43ac2622709e',
  },
}

export function trackFor(id: string): Track | undefined {
  return TRACKS[id]
}
