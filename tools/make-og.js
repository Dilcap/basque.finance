/* Genere assets/og-basque-finance.png (1200x630) : fond papier, bande rouge
   et croix basque dessinee au pixel. Aucune dependance, zlib de Node suffit.
   Relancer avec `node tools/make-og.js` apres un changement de palette. */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1200, H = 630, SS = 3; /* supersampling */

const PAPER = [246, 243, 236];
const RED   = [163, 23, 42];
const GREEN = [23, 96, 63];

/* Croix basque centree en (cx, cy), rayon R. */
function inLauburu(x, y, cx, cy, R) {
  const dx = x - cx, dy = y - cy;
  for (let k = 0; k < 4; k++) {
    /* rotation inverse de k*90 degres pour se ramener au bras du haut */
    const a = -k * Math.PI / 2;
    const rx = dx * Math.cos(a) - dy * Math.sin(a);
    const ry = dx * Math.sin(a) + dy * Math.cos(a);
    if (rx < 0) continue;
    const big   = Math.hypot(rx, ry + R / 2) <= R / 2;
    const small = Math.hypot(rx, ry + R / 4) <= R / 4;
    if (big && !small) return true;
  }
  return false;
}

function sample(x, y) {
  if (y > H - 96) return GREEN;               /* filet vert en pied */
  if (y > H - 104) return RED;                /* filet rouge */
  if (inLauburu(x, y, W / 2, (H - 96) / 2, 190)) return RED;
  return PAPER;
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  const rowStart = y * (1 + W * 3);
  raw[rowStart] = 0; /* filter: none */
  for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
        r += c[0]; g += c[1]; b += c[2];
      }
    }
    const n = SS * SS, o = rowStart + 1 + x * 3;
    raw[o] = Math.round(r / n);
    raw[o + 1] = Math.round(g / n);
    raw[o + 2] = Math.round(b / n);
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;   /* bit depth */
ihdr[9] = 2;   /* truecolor */

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = path.join(__dirname, '..', 'assets', 'og-basque-finance.png');
fs.writeFileSync(out, png);
console.log('ecrit', out, png.length, 'octets');
