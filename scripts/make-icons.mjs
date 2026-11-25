// Draws the Northbound app icons in public/ from the same shapes as public/icon.svg:
// the N made of the map's lines (purple, mint, cyan) whose last stroke becomes the white main line heading north,
// on the dark glass tile. Run from the project root: node scripts/make-icons.mjs  (no dependencies)
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

// On a 120 grid, drawn in this order (later strokes sit on top). Every stroke is 12 wide with round ends.
const STROKES = [
  { color: hex('#C08BFF'), segs: [[35, 92, 35, 30]] },
  { color: hex('#64D2FF'), segs: [[85, 90, 85, 54]] },
  { color: hex('#F5F5F7'), segs: [[85, 54, 85, 28], [71, 42, 85, 28], [99, 42, 85, 28]] },
  { color: hex('#5FE3B0'), segs: [[35, 30, 85, 90]] },
]
const HALF = 6
const TOP = hex('#0E1520')
const BOTTOM = hex('#05070B')
const RADIUS = 27 // corner radius of the tile, for icons with transparent corners

function distToSeg(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/** The tile's colour at a point: a dark vertical gradient with a faint sheen over the top half. */
function tile(y) {
  const t = Math.min(1, Math.max(0, y / 120))
  const c = TOP.map((v, i) => v + (BOTTOM[i] - v) * t)
  if (y < 56) {
    const a = 0.1 * (1 - y / 56)
    return c.map((v) => v + (255 - v) * a)
  }
  return c
}

function insideRounded(x, y) {
  const cx = Math.min(Math.max(x, RADIUS), 120 - RADIUS)
  const cy = Math.min(Math.max(y, RADIUS), 120 - RADIUS)
  return Math.hypot(x - cx, y - cy) <= RADIUS
}

/**
 * size: pixels. scale: how big the mark is (1 = as in icon.svg; maskable icons shrink it into the safe zone).
 * rounded: transparent rounded corners (favicons); otherwise a full square (home-screen and app icons).
 */
function draw(size, { scale = 1, rounded = false } = {}) {
  const k = 120 / size
  const px = Buffer.alloc(size * size * 4)
  const N = 4 // supersampling for smooth edges
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0]
      let cover = 0
      for (let sy = 0; sy < N; sy++)
        for (let sx = 0; sx < N; sx++) {
          const gx = (x + (sx + 0.5) / N) * k
          const gy = (y + (sy + 0.5) / N) * k
          if (rounded && !insideRounded(gx, gy)) continue
          // The mark shrinks toward the centre when scale < 1.
          const ax = 60 + (gx - 60) / scale
          const ay = 60 + (gy - 60) / scale
          let c = tile(gy)
          for (const s of STROKES) if (s.segs.some((seg) => distToSeg(ax, ay, seg) <= HALF)) c = s.color
          sum[0] += c[0]
          sum[1] += c[1]
          sum[2] += c[2]
          cover++
        }
      const i = (y * size + x) * 4
      if (cover) for (let c = 0; c < 3; c++) px[i + c] = Math.round(sum[c] / cover)
      px[i + 3] = Math.round((cover / (N * N)) * 255)
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

/** A .ico holding PNG images, for browsers and tools that only look for /favicon.ico. */
function ico(images) {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const dir = images.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([head, ...dir, ...images.map((i) => i.data)])
}

// Installed app (Android, desktop) and notifications: a full square; the system adds its own corners.
writeFileSync('public/icon-192.png', draw(192))
writeFileSync('public/icon-512.png', draw(512))
// Android's round and squircle masks crop the outer edge: keep the mark inside the 80% safe zone.
writeFileSync('public/icon-512-maskable.png', draw(512, { scale: 0.8 }))
// iPhone home screen: an opaque square, which iOS rounds itself.
writeFileSync('public/apple-touch-icon.png', draw(180, { scale: 0.92 }))
// Browser tabs that can't use the SVG.
writeFileSync('public/favicon-32.png', draw(32, { rounded: true }))
writeFileSync('public/favicon.ico', ico([16, 32, 48].map((size) => ({ size, data: draw(size, { rounded: true }) }))))
console.log('Icons written to public/')
