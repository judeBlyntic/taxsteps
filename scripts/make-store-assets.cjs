// Generates DRAFT store/app icon assets from the Tax Steps "footprints" mark (apps/web/app/icon.svg).
// Usage: node make-store-assets.cjs <repoRoot> <outDir>
// Re-runnable by the implementing engineer: copy into the repo (e.g. scripts/make-app-icons.mjs) if adopted.
const path = require('path')
const fs = require('fs')
const repo = process.argv[2]
const out = process.argv[3]
const sharp = require(path.join(repo, 'node_modules', 'sharp'))

const LILAC = '#7e6be0'
const PAPER = '#f5f5f1'
const INK = '#2f2760' // accentRamp 900 (Fresh theme)
// Lucide "footprints" paths, 24x24 grid (same paths as apps/web/app/icon.svg).
const FEET = `
  <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/>
  <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/>
  <path d="M16 17h4"/>
  <path d="M4 13h4"/>`
const feet = (size, canvas, color, dx = 0, dy = 0) => {
  const t = (canvas - size) / 2
  return `<g transform="translate(${t + dx} ${t + dy}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">${FEET}</g>`
}
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)

async function png(file, input, { opaque = false } = {}) {
  let img = sharp(input)
  if (opaque) img = img.flatten({ background: LILAC }).removeAlpha()
  await img.png().toFile(path.join(out, file))
  const m = await sharp(path.join(out, file)).metadata()
  console.log(file.padEnd(34), `${m.width}x${m.height}`, m.hasAlpha ? 'alpha' : 'opaque')
}

;(async () => {
  fs.mkdirSync(out, { recursive: true })
  // iOS app icon: 1024 square, full-bleed, NO alpha (iOS applies the rounded mask itself).
  await png('icon-ios-1024.png', svg(1024, 1024, `<rect width="1024" height="1024" fill="${LILAC}"/>${feet(560, 1024, PAPER)}`), { opaque: true })
  // Generic expo.icon fallback (also used for Android legacy icon by Expo): same artwork.
  await png('icon.png', svg(1024, 1024, `<rect width="1024" height="1024" fill="${LILAC}"/>${feet(560, 1024, PAPER)}`), { opaque: true })
  // Android adaptive icon foreground: transparent, mark inside the 66% safe zone (diameter 676px of 1024).
  await png('android-icon-foreground.png', svg(1024, 1024, feet(440, 1024, PAPER)))
  // Android adaptive background: solid lilac (or use android.adaptiveIcon.backgroundColor only).
  await png('android-icon-background.png', svg(1024, 1024, `<rect width="1024" height="1024" fill="${LILAC}"/>`), { opaque: true })
  // Android 13+ themed (monochrome) icon: single colour on transparent; the system tints it.
  await png('android-icon-monochrome.png', svg(1024, 1024, feet(440, 1024, '#ffffff')))
  // Splash image: the round lilac mark on transparent; shown on #f5f5f1.
  await png('splash-icon.png', svg(1024, 1024, `<circle cx="512" cy="512" r="512" fill="${LILAC}"/>${feet(512, 1024, PAPER)}`))
  // Web favicon for the Expo web target.
  await png('favicon.png', svg(48, 48, `<circle cx="24" cy="24" r="24" fill="${LILAC}"/>${feet(24, 48, PAPER)}`))
  // Google Play hi-res icon: 512x512, full-bleed square (Play applies its own mask). Opaque to be safe.
  await png('play-icon-512.png', svg(512, 512, `<rect width="512" height="512" fill="${LILAC}"/>${feet(280, 512, PAPER)}`), { opaque: true })

  // Google Play feature graphic: 1024x500, no alpha. Wordmark in Caprasimo (the app's heading font).
  const cap = path.join(repo, 'node_modules/@expo-google-fonts/caprasimo/400Regular/Caprasimo_400Regular.ttf')
  const fig = path.join(repo, 'node_modules/@expo-google-fonts/figtree/600SemiBold/Figtree_600SemiBold.ttf')
  const base = sharp(svg(1024, 500, `<rect width="1024" height="500" fill="${PAPER}"/>
    <circle cx="880" cy="70" r="190" fill="#e6e1fd"/><circle cx="120" cy="480" r="120" fill="#cfc6fb"/>
    <circle cx="250" cy="250" r="150" fill="${LILAC}"/>${feet(150, 300, PAPER, 100, 100)}`))
  const layers = []
  try {
    const title = await sharp({ text: { text: `<span foreground="${INK}">Tax Steps</span>`, fontfile: cap, font: 'Caprasimo 92', rgba: true, dpi: 72 } }).png().toBuffer()
    const tag = await sharp({ text: { text: `<span foreground="${INK}">Scan receipts. Sorted for tax time.</span>`, fontfile: fig, font: 'Figtree SemiBold 34', rgba: true, dpi: 72 } }).png().toBuffer()
    layers.push({ input: title, left: 450, top: 165 }, { input: tag, left: 456, top: 290 })
  } catch (e) {
    console.warn('text rendering unavailable, feature graphic has no wordmark:', e.message)
  }
  await base.composite(layers).flatten({ background: PAPER }).removeAlpha().png().toFile(path.join(out, 'play-feature-graphic-1024x500.png'))
  console.log('play-feature-graphic-1024x500.png'.padEnd(34), '1024x500 opaque')
})().catch((e) => { console.error(e); process.exit(1) })
