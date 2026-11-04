# Card portraits — official set

The game ships with 50 official portraits: the original 26-card set plus the
twenty-four-card City Limits / R&B / Pop expansion.

- Core set: `amara-afterglow.webp` … `ziggy-stereo.webp` — 640 × 960 WebP,
  ~165 KB each, 4.3 MB for the set.
- Expansions: 24 baked WebP files, listed below — 640 × 960 like the core set,
  converted from the uploaded PNG portraits on the same 2:3 ratio. The uploader
  still accepts PNG/JPG/WebP; any file with a matching artist id replaces the
  baked portrait on the next reload.
- `*.svg` — deterministic procedural fallbacks kept in the folder for
  regeneration. The production build imports raster art only, so a card with no
  raster file falls back to the same procedural React renderer.
- Runtime portrait overrides are disabled. In development, the Collection
  screen exposes **UPLOAD PORTRAITS**, which writes the source files here;
  production builds have no uploader and always read the baked source set.
  `src/components/Portrait.tsx` reads only from this folder.

## City Limits PNG filenames

| Artist | Upload as |
| --- | --- |
| Rico Varela | `rico-varela.png` |
| Kenji Vale | `kenji-vale.png` |
| Omar Kairo | `omar-kairo.png` |
| Sefa Kamanzi | `sefa-kamanzi.png` |
| Luka Dragan | `luka-dragan.png` |
| Thiago Flux | `thiago-flux.png` |
| Sione Tua | `sione-tua.png` |
| Arjun Slate | `arjun-slate.png` |

## R&B expansion PNG filenames

| Artist | Upload as |
| --- | --- |
| Miyah Rouge | `miyah-rouge.png` |
| Zuri Maré | `zuri-mare.png` |
| Selene Lux | `selene-lux.png` |
| Yuna Sol | `yuna-sol.png` |
| Nia Kembé | `nia-kembe.png` |
| Celine Amour | `celine-amour.png` |
| Marisol Vane | `marisol-vane.png` |
| Soraya Nazeem | `soraya-nazeem.png` |

## Pop expansion PNG filenames

| Artist | Upload as |
| --- | --- |
| Marcus Neon | `marcus-neon.png` |
| Daichi Tempo | `daichi-tempo.png` |
| Kofi Starling | `kofi-starling.png` |
| Tiago Voss | `tiago-voss.png` |
| Liora Prism | `liora-prism.png` |
| Solana Vega | `solana-vega.png` |
| Éloïse Static | `eloise-static.png` |
| Anika Voltage | `anika-voltage.png` |

Use a 3:4 portrait ratio. The card window fits the full image and fills the
sides with a blurred copy. A file with the exact name above automatically
overrides the generated SVG on the next dev reload or build.

The shipped expansion set has been baked down to 640 × 960 WebP (2.2 MB for all
24) from the full-resolution PNG sources, matching the core set, so the game
never serves the ~47 MB PNG originals. The baked files live beside the SVGs with
the same artist ids and a `.webp` extension.

## Dev portrait uploader

With the Vite dev server running, open **MY COLLECTION → UPLOAD PORTRAITS**.
Drop all remaining files at once; files named with the artist ids above are
matched automatically. Any file that does not match can be assigned with the
row’s **SELECT** control. Press **LOCK IN** to write the files into this folder
and reload the game with the new base art. This button is not included in the
production bundle. Uploaded files are written at their original size; the
shipped set is then baked to 640 × 960 WebP like the core portraits.

## How the core set was made

The full-resolution faces were pasted into the game in the browser, then sent to
the dev server's `/api/bake-faces` endpoint (`vite.config.ts`), which wrote them
here. They were downscaled and converted to WebP with a headless Chromium render
so the shipped bundle stays small.

To change a portrait later, replace the matching file (same artist id) and
rebuild. To regenerate only the procedural SVG fallbacks, run:

```bash
bun scripts/bake-portraits.mjs
```
