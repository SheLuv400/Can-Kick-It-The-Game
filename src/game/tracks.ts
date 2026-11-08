/**
 * Artist recordings, presented as in-game catalogue entries. A record only
 * grows a play control when it has an embeddable source; the player crops the
 * source chrome so the release reads as an in-game single.
 */
export interface Track {
  title: string
  mood: string
  embedUrl?: string
}

export const TRACKS: Record<string, Track> = {
  'macko-deville': {
    title: 'Heavy Talk, Heavy Walk',
    mood: 'HIP-HOP · BOOM BAP · HARDCORE',
    embedUrl: 'https://suno.com/embed/0ec42fe8-b6ff-4848-a747-43ac2622709e',
  },
  'taj-omen': {
    title: 'Silk and Stacks',
    mood: 'EAST COAST HIP-HOP · RAP-SOUL · MELODIC',
    embedUrl: 'https://suno.com/embed/614cfd85-7629-48a5-ae86-10f5550a237f',
  },
  'amara-afterglow': {
    title: 'My Own Glow',
    mood: 'HIP-HOP · SOUL · ALT R&B',
    embedUrl: 'https://suno.com/embed/e4a7b998-1aeb-4b37-ad49-f7a2e9d108c6',
  },
  'ziggy-stereo': {
    title: 'Move in Stereo',
    mood: 'DANCE-POP · FUNK-POP · UK GARAGE',
    embedUrl: 'https://suno.com/embed/06d80556-e659-4c7a-b90c-90cb455c359b',
  },
}

export function trackFor(id: string): Track | undefined {
  return TRACKS[id]
}
