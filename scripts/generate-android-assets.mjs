import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const iconTargets = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

const splashTargets = [
  ['drawable/splash.png', 480, 320],
  ['drawable-port-mdpi/splash.png', 320, 480],
  ['drawable-port-hdpi/splash.png', 480, 800],
  ['drawable-port-xhdpi/splash.png', 720, 1280],
  ['drawable-port-xxhdpi/splash.png', 960, 1600],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920],
  ['drawable-land-mdpi/splash.png', 480, 320],
  ['drawable-land-hdpi/splash.png', 800, 480],
  ['drawable-land-xhdpi/splash.png', 1280, 720],
  ['drawable-land-xxhdpi/splash.png', 1600, 960],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280],
];

const root = 'android/app/src/main/res';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
  return out;
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hex(color) {
  const n = Number.parseInt(color.replace('#', ''), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255, 255];
}

function canvas(width, height, color = '#1a1412') {
  const data = Buffer.alloc(width * height * 4);
  const c = hex(color);
  for (let i = 0; i < data.length; i += 4) data.set(c, i);
  return { width, height, data };
}

function blendPixel(c, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
  const i = (Math.floor(y) * c.width + Math.floor(x)) * 4;
  const a = Math.max(0, Math.min(1, alpha * color[3] / 255));
  c.data[i] = Math.round(color[0] * a + c.data[i] * (1 - a));
  c.data[i + 1] = Math.round(color[1] * a + c.data[i + 1] * (1 - a));
  c.data[i + 2] = Math.round(color[2] * a + c.data[i + 2] * (1 - a));
  c.data[i + 3] = 255;
}

function fillCircle(c, cx, cy, r, color, alpha = 1) {
  const col = hex(color);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) blendPixel(c, x, y, col, alpha);
    }
  }
}

function strokeCircle(c, cx, cy, r, width, color, alpha = 1) {
  const col = hex(color);
  const half = width / 2;
  for (let y = Math.floor(cy - r - half); y <= Math.ceil(cy + r + half); y++) {
    for (let x = Math.floor(cx - r - half); x <= Math.ceil(cx + r + half); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (Math.abs(d - r) <= half) blendPixel(c, x, y, col, alpha);
    }
  }
}

function fillPolygon(c, points, color, alpha = 1) {
  const col = hex(color);
  const minY = Math.floor(Math.min(...points.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])));
  for (let y = minY; y <= maxY; y++) {
    const nodes = [];
    let j = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      const pi = points[i];
      const pj = points[j];
      if ((pi[1] < y && pj[1] >= y) || (pj[1] < y && pi[1] >= y)) {
        nodes.push(pi[0] + ((y - pi[1]) / (pj[1] - pi[1])) * (pj[0] - pi[0]));
      }
      j = i;
    }
    nodes.sort((a, b) => a - b);
    for (let i = 0; i < nodes.length; i += 2) {
      for (let x = Math.floor(nodes[i]); x < Math.ceil(nodes[i + 1]); x++) blendPixel(c, x, y, col, alpha);
    }
  }
}

function line(c, x1, y1, x2, y2, width, color, alpha = 1) {
  const col = hex(color);
  const minX = Math.floor(Math.min(x1, x2) - width);
  const maxX = Math.ceil(Math.max(x1, x2) + width);
  const minY = Math.floor(Math.min(y1, y2) - width);
  const maxY = Math.ceil(Math.max(y1, y2) + width);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      if (Math.hypot(x - px, y - py) <= width / 2) blendPixel(c, x, y, col, alpha);
    }
  }
}

function drawMark(c, cx, cy, size) {
  fillCircle(c, cx, cy, size * 0.49, '#0b0504', 0.94);
  strokeCircle(c, cx, cy, size * 0.43, size * 0.06, '#c68234');
  strokeCircle(c, cx, cy, size * 0.33, size * 0.018, '#6b3a0e');
  const shield = [
    [cx, cy - size * 0.27],
    [cx + size * 0.23, cy - size * 0.18],
    [cx + size * 0.22, cy + size * 0.05],
    [cx, cy + size * 0.31],
    [cx - size * 0.22, cy + size * 0.05],
    [cx - size * 0.23, cy - size * 0.18],
  ];
  fillPolygon(c, shield, '#e8dcc4');
  line(c, cx, cy - size * 0.23, cx, cy + size * 0.27, size * 0.035, '#2a1606');
  line(c, cx - size * 0.2, cy - size * 0.02, cx + size * 0.2, cy - size * 0.02, size * 0.035, '#2a1606');
  line(c, cx - size * 0.31, cy + size * 0.31, cx + size * 0.31, cy - size * 0.31, size * 0.045, '#2a1606');
  line(c, cx - size * 0.28, cy + size * 0.29, cx + size * 0.3, cy - size * 0.29, size * 0.022, '#c68234');
  fillCircle(c, cx, cy, size * 0.105, '#c68234');
  fillCircle(c, cx, cy, size * 0.045, '#2a1606', 0.9);
}

function drawBackdrop(c) {
  const cx = c.width / 2;
  const cy = c.height / 2;
  const max = Math.hypot(cx, cy);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const d = Math.hypot(x - cx, y - cy) / max;
      blendPixel(c, x, y, hex(d < 0.52 ? '#24160f' : '#100a08'), d * 0.8);
      if ((x + y) % 29 === 0) blendPixel(c, x, y, hex('#c68234'), 0.055);
    }
  }
}

function writePng(path, c) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png(c.width, c.height, c.data));
}

for (const [dir, size] of iconTargets) {
  const c = canvas(size, size);
  drawBackdrop(c);
  drawMark(c, size / 2, size / 2, size * 0.92);
  writePng(`${root}/${dir}/ic_launcher.png`, c);
  writePng(`${root}/${dir}/ic_launcher_round.png`, c);
  writePng(`${root}/${dir}/ic_launcher_foreground.png`, c);
}

for (const [rel, width, height] of splashTargets) {
  const c = canvas(width, height);
  drawBackdrop(c);
  drawMark(c, width / 2, height / 2, Math.min(width, height) * 0.52);
  writePng(`${root}/${rel}`, c);
}
