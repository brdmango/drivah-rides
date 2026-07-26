/* Builds docs/index.html — the whole app as one self-contained file.
 *
 * Run with:  npm run build:standalone
 *
 * Everything is inlined (JS + fonts as data URIs) so the page works from
 * GitHub Pages, from a USB stick, or by double-clicking it with no internet
 * at all. The Google Fonts @import the app normally uses is stripped, because
 * a file:// or CSP-restricted context cannot fetch it and would silently fall
 * back to system fonts.
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500' +
                  '&family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'

async function inlineFonts() {
  const css = await (await fetch(FONTS_CSS, { headers: { 'User-Agent': UA } })).text()
  const faces = [...css.matchAll(/@font-face\s*\{(.*?)\}/gs)].map(m => m[1])
  const groups = new Map()

  for (const face of faces) {
    // Keep only the base latin subset — the only one this UI renders.
    const range = /unicode-range:\s*([^;]+);/.exec(face)
    if (!range || !range[1].trim().startsWith('U+0000-00FF')) continue

    const family = /font-family:\s*'([^']+)'/.exec(face)[1]
    const weight = Number(/font-weight:\s*(\d+)/.exec(face)[1])
    const url    = /src:\s*url\(([^)]+)\)/.exec(face)[1]
    const buf    = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer())

    // DM Sans and Syne are variable fonts: every weight serves the identical
    // file. Group by content hash so one face covers the whole weight range
    // instead of embedding the same 37 KB four times over.
    const key = `${family}:${createHash('sha256').update(buf).digest('hex')}`
    const g = groups.get(key) || { family, weights: [], buf }
    g.weights.push(weight)
    groups.set(key, g)
  }

  let bytes = 0
  const out = [...groups.values()].map(({ family, weights, buf }) => {
    bytes += buf.length
    const lo = Math.min(...weights), hi = Math.max(...weights)
    return `@font-face{font-family:'${family}';font-style:normal;` +
           `font-weight:${lo === hi ? lo : `${lo} ${hi}`};font-display:swap;` +
           `src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');}`
  })
  console.log(`  fonts: ${out.length} faces, ${bytes.toLocaleString()} bytes embedded`)
  return out.join('\n')
}

const dist = path.join(root, 'dist')
const assets = await readdir(path.join(dist, 'assets')).catch(() => {
  throw new Error('dist/ not found — run `npm run build` first.')
})
const bundleName = assets.find(f => f.endsWith('.js'))
let js = await readFile(path.join(dist, 'assets', bundleName), 'utf8')

const before = js.length
js = js.replace(/@import url\('https:\/\/fonts\.googleapis\.com[^']*'\);/, '')
if (js.length === before) throw new Error('font @import not found in bundle — check theme.js')
if (js.includes('</script')) throw new Error('bundle contains </script> and cannot be inlined as-is')

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="theme-color" content="#0B0C0F" />
<meta name="description" content="DRIVAH — the verified campus carpool network for UF students. Interactive demo." />
<title>DRIVAH · Campus Carpool</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(
  await readFile(path.join(root, 'public', 'favicon.svg'), 'utf8'))}" />
<style>
${await inlineFonts()}

/* The app owns the full viewport and commits to a single dark world, so the
   page keeps that ground rather than following the OS light/dark preference. */
:root { color-scheme: dark; }
html, body { height: 100%; }
body { margin: 0; background: #07080C; overflow: hidden; }

/* DRIVAH is phone-shaped: full-bleed on a handset, framed as a centred column
   on wider screens instead of stretching trip cards across a monitor. The
   transform makes each screen the containing block for its own position:fixed
   children (toast, demo banner, post-trip sheet) so they stay in the frame. */
@media (min-width: 560px) {
  body { background: radial-gradient(900px 520px at 50% 0%, #12183A 0%, #07080C 62%), #07080C; }
  #root > div {
    max-width: 430px;
    margin-inline: auto;
    position: relative;
    transform: translateZ(0);
    overflow: hidden;
    border-inline: 1px solid #252A35;
    box-shadow: 0 0 90px rgba(26, 86, 255, .18);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
</style>
</head>
<body>
<div id="root"></div>
<script type="module">
${js}
</script>
</body>
</html>
`

await mkdir(path.join(root, 'docs'), { recursive: true })
await writeFile(path.join(root, 'docs', 'index.html'), page)
// Stop GitHub Pages running the output through Jekyll.
await writeFile(path.join(root, 'docs', '.nojekyll'), '')
console.log(`  wrote docs/index.html (${(page.length / 1024).toFixed(0)} KB)`)
