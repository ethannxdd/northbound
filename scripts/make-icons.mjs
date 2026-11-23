// Draws the Northbound app icons in public/: the up-arrow on the accent tile.
// Run from the project root: node scripts/make-icons.mjs  (no dependencies)
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const ACCENT = [0x4a, 0xa8, 0xff]
const INK = [0x05, 0x07, 0x0b]
// The arrow on a 120 grid: a stem and two arms, 12 units wide with round ends.
const SEGS = [
  [60, 92, 60, 28],
  [38, 50, 60, 28],
  [82, 50, 60, 28],
]
const HALF = 6

function distToSeg(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function draw(size, inset) {
  const k = 120 / size
  const scale = 1 - 2 * inset
  const px = Buffer.alloc(size * size * 4)
  const N = 4 // supersampling for smooth edges
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let hit = 0
      for (let sy = 0; sy < N; sy++)
        for (let sx = 0; sx < N; sx++) {
          // Pixel to the 120 grid, then undo the inset so the arrow shrinks toward the centre.
          const gx = 60 + ((x + (sx + 0.5) / N) * k - 60) / scale
          const gy = 60 + ((y + (sy + 0.5) / N) * k - 60) / scale
          if (SEGS.some((s) => distToSeg(gx, gy, s) <= HALF)) hit++
        }
      const a = hit / (N * N)
      const i = (y * size + x) * 4
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(ACCENT[c] * (1 - a) + INK[c] * a)
      px[i + 3] = 255
    }
  return png(size, px)
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

writeFileSync('public/icon-192.png', draw(192, 0))
writeFileSync('public/icon-512.png', draw(512, 0))
writeFileSync('public/icon-512-maskable.png', draw(512, 0.12))
writeFileSync('public/apple-touch-icon.png', draw(180, 0.04))
console.log('Icons written to public/')
