// Renders the PWA PNG icons from the SVG sources. Run: node scripts/generate-icons.mjs
import sharp from 'sharp'

const src = 'scripts/icon-src'
const out = 'public/icons'
const jobs = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['maskable.svg', 'icon-maskable-512.png', 512],
  ['maskable.svg', 'apple-touch-icon.png', 180],
  ['badge.svg', 'badge-96.png', 96],
]
for (const [file, dest, size] of jobs) {
  await sharp(`${src}/${file}`, { density: 384 }).resize(size, size).png().toFile(`${out}/${dest}`)
  console.log('wrote', dest)
}
