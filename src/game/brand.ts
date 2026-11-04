/**
 * Brand artwork.
 *
 * Drop the official logo in `src/assets/brand/logo.png` (svg/jpg/webp also work)
 * and every place that renders the wordmark uses it instead of the built-in
 * vector version. Nothing else needs to change.
 */
const files = import.meta.glob<string>('../assets/brand/logo.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const LOGO: string | undefined = Object.values(files)[0]

export function brandLogoUrl(): string | undefined {
  return LOGO
}
