/**
 * 產生 src/icons 底下的四個 PNG 圖示（16/32/48/128）：
 *
 *   node tools/make-icons.js
 *
 * 圖形是用解析式幾何加 4x4 超取樣畫出來的（圓角方塊 + 粗體 M），
 * 所以不需要任何影像處理套件，也不必把二進位檔案手工塞進版控。
 * 只有在要改配色或造型時才需要重跑，產出的 PNG 本身會進版控。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'icons');
const SIZES = [16, 32, 48, 128];
const SAMPLES = 4; // 每個像素邊長取樣次數

// 與介面同一組品牌色（teal -> green），字形用白色
const TOP = [15, 118, 110];
const BOTTOM = [34, 160, 107];
const GLYPH = [255, 255, 255];

// ------------------------------------------------------------------ PNG

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ------------------------------------------------------------------ 幾何

function insideRoundRect(x, y, radius) {
  if (x < 0 || y < 0 || x > 1 || y > 1) return false;
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq ? ((px - ax) * dx + (py - ay) * dy) / lengthSq : 0;
  t = Math.min(1, Math.max(0, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** 粗體 M：兩根豎筆 + 兩條斜筆，圓端讓小尺寸也不會出現鋸齒缺口 */
function glyphSegments() {
  const top = 0.30;
  const bottom = 0.72;
  const mid = 0.585;
  const left = 0.245;
  const center = 0.5;
  const right = 0.755;
  return [
    [left, bottom, left, top],
    [left, top, center, mid],
    [center, mid, right, top],
    [right, top, right, bottom]
  ];
}

function insideGlyph(x, y, halfWidth) {
  for (const [ax, ay, bx, by] of glyphSegments()) {
    if (distToSegment(x, y, ax, ay, bx, by) <= halfWidth) return true;
  }
  return false;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = 0.22;
  const halfWidth = (size <= 32 ? 0.135 : 0.115) / 2;
  const step = 1 / (size * SAMPLES);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bgHits = 0;
      let glyphHits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px * SAMPLES + sx + 0.5) * step;
          const y = (py * SAMPLES + sy + 0.5) * step;
          if (!insideRoundRect(x, y, radius)) continue;
          bgHits++;
          if (insideGlyph(x, y, halfWidth)) glyphHits++;
        }
      }

      const total = SAMPLES * SAMPLES;
      const offset = (py * size + px) * 4;
      if (!bgHits) continue; // 完全透明

      const t = (py + 0.5) / size;
      const base = [lerp(TOP[0], BOTTOM[0], t), lerp(TOP[1], BOTTOM[1], t), lerp(TOP[2], BOTTOM[2], t)];
      const glyphRatio = glyphHits / bgHits;
      for (let i = 0; i < 3; i++) {
        rgba[offset + i] = Math.round(lerp(base[i], GLYPH[i], glyphRatio));
      }
      rgba[offset + 3] = Math.round((bgHits / total) * 255);
    }
  }
  return rgba;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = path.join(OUT_DIR, 'icon' + size + '.png');
  fs.writeFileSync(file, encodePng(render(size), size));
  console.log('wrote ' + path.relative(ROOT, file) + ' (' + size + 'x' + size + ')');
}
