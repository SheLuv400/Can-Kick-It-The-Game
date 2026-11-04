/**
 * How a portrait sits inside a card frame.
 *
 * `full` shows the entire picture, fitted, with a blurred fill behind it.
 * `fill` crops the picture to the frame instead. The preference is stored on the
 * root element so every card, avatar and showcase follows it at once.
 */
export type ArtFit = 'full' | 'fill'

const KEY = 'ciki-art-fit'

export function readArtFit(): ArtFit {
  try {
    return localStorage.getItem(KEY) === 'fill' ? 'fill' : 'full'
  } catch {
    return 'full'
  }
}

export function applyArtFit(fit: ArtFit) {
  if (typeof document !== 'undefined') document.documentElement.dataset.artFit = fit
  try {
    localStorage.setItem(KEY, fit)
  } catch {
    /* private mode: the session still honours the choice */
  }
}
