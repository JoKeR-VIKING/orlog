import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT_DIR = path.resolve(process.env.ACHIEVEMENTS_OUT_DIR || 'google-play-achievements-import');
const SIZE = 512;

const achievements = [
  {
    name: 'First Saga',
    description: 'Win your first match.',
    incremental: false,
    steps: '',
    points: 10,
    order: 10,
    icon: 'first-saga.png',
    theme: 'gold',
    symbol: 'victory',
  },
  {
    name: 'Skald Slayer',
    description: 'Defeat the Skald AI.',
    incremental: false,
    steps: '',
    points: 10,
    order: 20,
    icon: 'skald-slayer.png',
    theme: 'silver',
    symbol: 'lyre',
  },
  {
    name: 'Vikingr Victor',
    description: 'Defeat the Vikingr AI.',
    incremental: false,
    steps: '',
    points: 15,
    order: 30,
    icon: 'vikingr-victor.png',
    theme: 'bronze',
    symbol: 'helm',
  },
  {
    name: 'Jarl Breaker',
    description: 'Defeat the Jarl AI.',
    incremental: false,
    steps: '',
    points: 25,
    order: 40,
    icon: 'jarl-breaker.png',
    theme: 'iron',
    symbol: 'crown',
  },
  {
    name: 'Berserkr Bane',
    description: 'Defeat the Berserkr AI.',
    incremental: false,
    steps: '',
    points: 40,
    order: 50,
    icon: 'berserkr-bane.png',
    theme: 'red',
    symbol: 'mask',
  },
  {
    name: 'Bloodied Victor',
    description: 'Win a match with exactly 1 health remaining.',
    incremental: false,
    steps: '',
    points: 25,
    order: 60,
    icon: 'bloodied-victor.png',
    theme: 'green',
    symbol: 'singleGem',
  },
  {
    name: 'Untouched Fate',
    description: 'Win a match without taking damage.',
    incremental: false,
    steps: '',
    points: 35,
    order: 70,
    icon: 'untouched-fate.png',
    theme: 'white',
    symbol: 'shield',
  },
  {
    name: 'Thunder Caller',
    description: "Invoke Thor's Strike.",
    incremental: false,
    steps: '',
    points: 15,
    order: 80,
    icon: 'thunder-caller.png',
    theme: 'storm',
    symbol: 'hammer',
  },
  {
    name: 'Apple Keeper',
    description: "Invoke Idun's Rejuvenation.",
    incremental: false,
    steps: '',
    points: 15,
    order: 90,
    icon: 'apple-keeper.png',
    theme: 'green',
    symbol: 'apple',
  },
  {
    name: "Trickster's Mark",
    description: "Invoke Loki's Trick.",
    incremental: false,
    steps: '',
    points: 15,
    order: 100,
    icon: 'tricksters-mark.png',
    theme: 'purple',
    symbol: 'mask',
  },
  {
    name: "Norn's Claim",
    description: "Destroy opponent favor with Skuld's Claim.",
    incremental: false,
    steps: '',
    points: 20,
    order: 110,
    icon: 'norns-claim.png',
    theme: 'red',
    symbol: 'brokenToken',
  },
  {
    name: 'Favor Thief',
    description: 'Steal at least 3 favor in one round.',
    incremental: false,
    steps: '',
    points: 15,
    order: 120,
    icon: 'favor-thief.png',
    theme: 'gold',
    symbol: 'handTokens',
  },
  {
    name: 'Shield Wall',
    description: 'Block 4 or more attacks in one round.',
    incremental: false,
    steps: '',
    points: 20,
    order: 130,
    icon: 'shield-wall.png',
    theme: 'blue',
    symbol: 'shieldWall',
  },
  {
    name: 'Divine Timing',
    description: 'Invoke an early and late god favor in the same round.',
    incremental: false,
    steps: '',
    points: 25,
    order: 140,
    icon: 'divine-timing.png',
    theme: 'violet',
    symbol: 'sunMoon',
  },
  {
    name: 'Saga Veteran',
    description: 'Win 10 matches.',
    incremental: true,
    steps: 10,
    points: 25,
    order: 150,
    icon: 'saga-veteran.png',
    theme: 'parchment',
    symbol: 'scroll',
  },
  {
    name: 'Dice Monoculture',
    description: 'Finish a round with all six dice showing the same face.',
    incremental: false,
    steps: '',
    points: 20,
    order: 160,
    icon: 'dice-monoculture.png',
    theme: 'gold',
    symbol: 'sixDice',
    newOnly: true,
  },
  {
    name: 'Oops, All Axes',
    description: 'Finish a round with six axes. Subtlety has left the longhouse.',
    incremental: false,
    steps: '',
    points: 15,
    order: 170,
    icon: 'oops-all-axes.png',
    theme: 'red',
    symbol: 'axeStack',
    newOnly: true,
  },
  {
    name: 'Pointy Weather',
    description: 'Finish a round with six arrows.',
    incremental: false,
    steps: '',
    points: 15,
    order: 180,
    icon: 'pointy-weather.png',
    theme: 'storm',
    symbol: 'arrowRain',
    newOnly: true,
  },
  {
    name: 'Helmet Convention',
    description: 'Finish a round with six helmets. Very safe. Very silly.',
    incremental: false,
    steps: '',
    points: 15,
    order: 190,
    icon: 'helmet-convention.png',
    theme: 'iron',
    symbol: 'helmetStack',
    newOnly: true,
  },
  {
    name: 'Shield Sandwich',
    description: 'Finish a round with six shields.',
    incremental: false,
    steps: '',
    points: 15,
    order: 200,
    icon: 'shield-sandwich.png',
    theme: 'blue',
    symbol: 'shieldPile',
    newOnly: true,
  },
  {
    name: 'Sticky Fingers',
    description: 'Finish a round with six steals. Nobody check the pockets.',
    incremental: false,
    steps: '',
    points: 15,
    order: 210,
    icon: 'sticky-fingers.png',
    theme: 'purple',
    symbol: 'stickyHand',
    newOnly: true,
  },
  {
    name: 'Gods on Do Not Disturb',
    description: 'Win without invoking a god favor.',
    incremental: false,
    steps: '',
    points: 30,
    order: 220,
    icon: 'gods-on-do-not-disturb.png',
    theme: 'violet',
    symbol: 'mutedGod',
    newOnly: true,
  },
  {
    name: 'Face Tank',
    description: 'Win without blocking a single attack.',
    incremental: false,
    steps: '',
    points: 25,
    order: 230,
    icon: 'face-tank.png',
    theme: 'bronze',
    symbol: 'faceTank',
    newOnly: true,
  },
  {
    name: 'Queue Conqueror',
    description: 'Win 10 matchmaking battles. No codes. No bots. Just trouble.',
    incremental: true,
    steps: 10,
    points: 30,
    order: 240,
    icon: 'queue-conqueror.png',
    theme: 'green',
    symbol: 'queue',
    newOnly: true,
  },
  {
    name: 'Dragon Sits on Gold',
    description: 'Win with 15 or more favor still unspent.',
    incremental: false,
    steps: '',
    points: 25,
    order: 250,
    icon: 'dragon-sits-on-gold.png',
    theme: 'gold',
    symbol: 'dragonGold',
    newOnly: true,
  },
];

const themes = {
  gold: ['#17100b', '#49321c', '#c68234', '#f7d37a'],
  silver: ['#111317', '#303843', '#9ea8b4', '#f1f2eb'],
  bronze: ['#17100d', '#55311b', '#b87434', '#ffd08a'],
  iron: ['#111116', '#292c35', '#777f8a', '#d9d5cc'],
  red: ['#17090a', '#4b1414', '#a7342a', '#f2a16f'],
  green: ['#07120b', '#143b20', '#33a852', '#d6f5a5'],
  white: ['#111514', '#39433c', '#ddd8c9', '#fff5d3'],
  storm: ['#071018', '#16324a', '#4aa9ff', '#fff189'],
  purple: ['#120a18', '#3b1f49', '#8e4ea8', '#f3bc78'],
  blue: ['#08121b', '#163958', '#5a9bc6', '#d0f1ff'],
  violet: ['#120b1f', '#33215c', '#9b72d2', '#f0cb6c'],
  parchment: ['#1a120d', '#4b321f', '#bd9a64', '#f1dfb8'],
};

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([len, name, data, crc]);
}

function pngFromRgba(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function canvas() {
  return Buffer.alloc(SIZE * SIZE * 4);
}

function blendPixel(img, x, y, color, alpha = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  const a = Math.max(0, Math.min(1, alpha * (color[3] ?? 255) / 255));
  img[i] = Math.round(img[i] * (1 - a) + color[0] * a);
  img[i + 1] = Math.round(img[i + 1] * (1 - a) + color[1] * a);
  img[i + 2] = Math.round(img[i + 2] * (1 - a) + color[2] * a);
  img[i + 3] = 255;
}

function background(img, palette) {
  const c0 = hexToRgb(palette[0]);
  const c1 = hexToRgb(palette[1]);
  const c2 = hexToRgb(palette[2]);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const dx = (x - SIZE / 2) / (SIZE / 2);
      const dy = (y - SIZE / 2) / (SIZE / 2);
      const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const ray = Math.max(0, 1 - dist);
      const base = mix(c0, c1, y / SIZE);
      const glow = mix(base, c2, ray * 0.55);
      const vignette = 1 - Math.max(0, dist - 0.62) * 0.75;
      const i = (y * SIZE + x) * 4;
      img[i] = Math.round(glow[0] * vignette);
      img[i + 1] = Math.round(glow[1] * vignette);
      img[i + 2] = Math.round(glow[2] * vignette);
      img[i + 3] = 255;
    }
  }
}

function circle(img, cx, cy, r, color, alpha = 1) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) blendPixel(img, x, y, color, alpha * Math.min(1, r - d + 1));
    }
  }
}

function ellipse(img, cx, cy, rx, ry, color, alpha = 1) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const d = ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry);
      if (d <= 1) blendPixel(img, x, y, color, alpha * Math.min(1, (1 - d) * 5));
    }
  }
}

function line(img, x1, y1, x2, y2, width, color, alpha = 1) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 1.5);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    circle(img, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color, alpha);
  }
}

function polygon(img, points, color, alpha = 1) {
  const minY = Math.floor(Math.min(...points.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])));
  for (let y = minY; y <= maxY; y += 1) {
    const nodes = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
        nodes.push(xi + ((y - yi) / (yj - yi)) * (xj - xi));
      }
    }
    nodes.sort((a, b) => a - b);
    for (let k = 0; k < nodes.length; k += 2) {
      for (let x = Math.floor(nodes[k]); x <= Math.ceil(nodes[k + 1]); x += 1) blendPixel(img, x, y, color, alpha);
    }
  }
}

function rect(img, x, y, w, h, color, alpha = 1) {
  polygon(img, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, alpha);
}

function token(img, cx, cy, r, palette) {
  circle(img, cx + 8, cy + 10, r + 5, [0, 0, 0], 0.28);
  circle(img, cx, cy, r, hexToRgb(palette[2]), 1);
  circle(img, cx - r * 0.25, cy - r * 0.28, r * 0.48, hexToRgb(palette[3]), 0.74);
  circle(img, cx, cy, r * 0.58, [70, 34, 8], 0.28);
}

function drawSymbol(img, symbol, palette) {
  const light = hexToRgb(palette[3]);
  const mid = hexToRgb(palette[2]);
  const dark = [20, 12, 8];
  token(img, 256, 260, 164, palette);
  switch (symbol) {
    case 'victory':
      line(img, 184, 318, 244, 196, 34, dark, 0.88);
      line(img, 244, 196, 328, 318, 34, dark, 0.88);
      line(img, 202, 294, 310, 294, 28, dark, 0.88);
      circle(img, 256, 152, 28, light, 0.9);
      break;
    case 'lyre':
      line(img, 190, 170, 190, 332, 20, dark, 0.88);
      line(img, 322, 170, 322, 332, 20, dark, 0.88);
      line(img, 190, 170, 256, 126, 18, dark, 0.88);
      line(img, 322, 170, 256, 126, 18, dark, 0.88);
      line(img, 214, 184, 214, 330, 7, light, 0.84);
      line(img, 256, 158, 256, 342, 7, light, 0.84);
      line(img, 298, 184, 298, 330, 7, light, 0.84);
      line(img, 172, 346, 340, 346, 24, dark, 0.88);
      break;
    case 'helm':
      ellipse(img, 256, 242, 106, 86, dark, 0.9);
      rect(img, 164, 248, 184, 76, dark, 0.9);
      line(img, 256, 146, 256, 333, 16, light, 0.85);
      line(img, 148, 246, 88, 190, 24, light, 0.72);
      line(img, 364, 246, 424, 190, 24, light, 0.72);
      break;
    case 'crown':
      polygon(img, [[144, 334], [162, 190], [220, 268], [256, 160], [292, 268], [350, 190], [368, 334]], dark, 0.9);
      line(img, 156, 330, 356, 330, 24, light, 0.76);
      line(img, 194, 224, 318, 346, 16, [120, 20, 18], 0.8);
      break;
    case 'mask':
      ellipse(img, 206, 246, 62, 94, dark, 0.9);
      ellipse(img, 306, 246, 62, 94, dark, 0.9);
      circle(img, 226, 238, 18, light, 0.76);
      circle(img, 286, 238, 18, light, 0.76);
      line(img, 256, 248, 238, 316, 12, light, 0.78);
      line(img, 256, 248, 274, 316, 12, light, 0.78);
      break;
    case 'singleGem':
      polygon(img, [[256, 124], [338, 194], [316, 334], [256, 390], [196, 334], [174, 194]], [20, 90, 38], 1);
      polygon(img, [[256, 144], [314, 202], [292, 320], [256, 354], [220, 320], [198, 202]], light, 0.55);
      line(img, 176, 362, 336, 152, 20, [150, 25, 20], 0.86);
      break;
    case 'shield':
      polygon(img, [[256, 120], [354, 168], [330, 330], [256, 392], [182, 330], [158, 168]], dark, 0.9);
      polygon(img, [[256, 146], [326, 184], [308, 310], [256, 356], [204, 310], [186, 184]], light, 0.86);
      line(img, 256, 154, 256, 350, 16, mid, 0.9);
      break;
    case 'hammer':
      line(img, 284, 212, 190, 342, 34, dark, 0.9);
      rect(img, 224, 142, 148, 74, dark, 0.9);
      polygon(img, [[286, 76], [250, 216], [312, 204], [252, 428], [386, 174], [320, 186]], light, 0.78);
      break;
    case 'apple':
      circle(img, 244, 264, 78, [180, 34, 26], 0.95);
      circle(img, 292, 264, 78, [205, 57, 31], 0.95);
      line(img, 266, 174, 294, 124, 12, dark, 0.86);
      ellipse(img, 318, 152, 42, 24, [86, 178, 75], 0.9);
      circle(img, 226, 226, 22, light, 0.65);
      break;
    case 'brokenToken':
      token(img, 224, 260, 92, palette);
      token(img, 302, 260, 92, palette);
      line(img, 256, 134, 246, 196, 12, dark, 0.9);
      line(img, 246, 196, 272, 250, 12, dark, 0.9);
      line(img, 272, 250, 248, 386, 12, dark, 0.9);
      break;
    case 'handTokens':
      token(img, 214, 190, 42, palette);
      token(img, 286, 178, 42, palette);
      token(img, 346, 224, 42, palette);
      ellipse(img, 248, 300, 80, 54, dark, 0.9);
      line(img, 186, 284, 142, 218, 26, dark, 0.9);
      line(img, 232, 278, 214, 198, 22, dark, 0.9);
      line(img, 274, 278, 290, 198, 22, dark, 0.9);
      break;
    case 'shieldWall':
      for (const cx of [176, 256, 336]) {
        polygon(img, [[cx, 152], [cx + 48, 178], [cx + 36, 320], [cx, 364], [cx - 36, 320], [cx - 48, 178]], dark, 0.9);
        line(img, cx, 170, cx, 344, 9, light, 0.72);
      }
      line(img, 110, 210, 402, 296, 10, light, 0.82);
      line(img, 112, 320, 402, 222, 10, light, 0.82);
      break;
    case 'sunMoon':
      circle(img, 212, 234, 64, light, 0.88);
      circle(img, 306, 244, 70, dark, 0.9);
      circle(img, 334, 220, 62, mid, 0.82);
      token(img, 256, 334, 56, palette);
      break;
    case 'scroll':
      rect(img, 166, 166, 180, 188, [214, 181, 122], 0.94);
      circle(img, 166, 166, 28, light, 0.92);
      circle(img, 346, 354, 28, light, 0.92);
      for (let i = 0; i < 10; i += 1) {
        circle(img, 198 + i * 14, 300, 5, mid, 0.9);
      }
      line(img, 194, 218, 320, 218, 8, dark, 0.66);
      line(img, 194, 250, 306, 250, 8, dark, 0.66);
      break;
    case 'sixDice':
      for (const [cx, cy] of [[198, 190], [270, 190], [198, 262], [270, 262], [198, 334], [270, 334]]) {
        rect(img, cx - 26, cy - 26, 52, 52, light, 0.9);
        circle(img, cx, cy, 8, dark, 0.9);
      }
      break;
    case 'axeStack':
      for (const x of [210, 256, 302]) {
        line(img, x - 42, 330, x + 34, 158, 18, dark, 0.92);
        polygon(img, [[x + 24, 146], [x + 88, 174], [x + 36, 228], [x + 4, 196]], light, 0.78);
      }
      break;
    case 'arrowRain':
      for (const x of [178, 226, 274, 322]) {
        line(img, x - 32, 150, x + 32, 342, 12, dark, 0.9);
        polygon(img, [[x - 44, 140], [x + 4, 116], [x + 8, 170]], light, 0.86);
      }
      break;
    case 'helmetStack':
      for (const [cx, cy] of [[206, 204], [306, 204], [256, 304]]) {
        ellipse(img, cx, cy, 58, 46, dark, 0.92);
        rect(img, cx - 50, cy, 100, 46, dark, 0.92);
        line(img, cx, cy - 44, cx, cy + 52, 8, light, 0.84);
      }
      break;
    case 'shieldPile':
      for (const cx of [188, 256, 324]) {
        polygon(img, [[cx, 142], [cx + 54, 174], [cx + 38, 324], [cx, 378], [cx - 38, 324], [cx - 54, 174]], dark, 0.9);
        line(img, cx, 166, cx, 346, 8, light, 0.76);
      }
      break;
    case 'stickyHand':
      ellipse(img, 250, 304, 88, 56, dark, 0.92);
      for (const [x, y] of [[176, 232], [220, 204], [264, 198], [308, 218]]) {
        line(img, x, 300, x, y, 24, dark, 0.92);
        token(img, x + 10, y - 20, 28, palette);
      }
      break;
    case 'mutedGod':
      circle(img, 256, 224, 70, dark, 0.9);
      polygon(img, [[210, 330], [302, 330], [276, 398], [236, 398]], dark, 0.9);
      line(img, 154, 370, 360, 150, 22, [150, 25, 20], 0.9);
      line(img, 168, 152, 344, 376, 18, [150, 25, 20], 0.7);
      break;
    case 'faceTank':
      circle(img, 256, 230, 78, dark, 0.92);
      circle(img, 228, 218, 10, light, 0.9);
      circle(img, 284, 218, 10, light, 0.9);
      line(img, 218, 278, 294, 278, 12, light, 0.75);
      line(img, 256, 308, 256, 384, 34, dark, 0.92);
      for (const x of [156, 356]) line(img, x, 176, 256, 260, 14, [150, 25, 20], 0.8);
      break;
    case 'queue':
      for (const [cx, cy] of [[178, 220], [256, 220], [334, 220], [216, 318], [294, 318]]) {
        circle(img, cx, cy, 26, light, 0.86);
        line(img, cx, cy + 34, cx, cy + 82, 20, dark, 0.86);
      }
      line(img, 142, 402, 370, 402, 18, dark, 0.88);
      break;
    case 'dragonGold':
      token(img, 190, 320, 38, palette);
      token(img, 244, 340, 42, palette);
      token(img, 306, 318, 38, palette);
      line(img, 170, 230, 250, 150, 34, dark, 0.9);
      line(img, 250, 150, 356, 230, 34, dark, 0.9);
      polygon(img, [[256, 178], [286, 240], [256, 220], [226, 240]], light, 0.72);
      circle(img, 226, 196, 9, light, 0.9);
      circle(img, 286, 196, 9, light, 0.9);
      break;
    default:
      circle(img, 256, 256, 80, dark, 0.8);
  }
}

function renderIcon(achievement) {
  const img = canvas();
  const palette = themes[achievement.theme];
  background(img, palette);
  circle(img, 256, 256, 210, [0, 0, 0], 0.22);
  circle(img, 256, 256, 190, hexToRgb(palette[2]), 0.18);
  drawSymbol(img, achievement.symbol, palette);
  circle(img, 154, 132, 34, hexToRgb(palette[3]), 0.22);
  return pngFromRgba(SIZE, SIZE, img);
}

function csvRow(values) {
  return values.map((value) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  }).join(',');
}

const selectedAchievements = process.env.NEW_ACHIEVEMENTS_ONLY === '1'
  ? achievements.filter((achievement) => achievement.newOnly)
  : achievements;

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const metadata = selectedAchievements.map((a) => csvRow([
  a.name,
  a.description,
  a.incremental ? 'True' : 'False',
  a.steps,
  'Revealed',
  a.points,
  a.order,
])).join('\n') + '\n';

const mappings = selectedAchievements.map((a) => csvRow([a.name, a.icon])).join('\n') + '\n';

fs.writeFileSync(path.join(OUT_DIR, 'AchievementsMetadata.csv'), metadata);
fs.writeFileSync(path.join(OUT_DIR, 'AchievementsLocalizations.csv'), '');
fs.writeFileSync(path.join(OUT_DIR, 'AchievementsIconsMappings.csv'), mappings);

for (const achievement of selectedAchievements) {
  fs.writeFileSync(path.join(OUT_DIR, achievement.icon), renderIcon(achievement));
}

console.log(`Wrote ${selectedAchievements.length} achievements to ${OUT_DIR}`);
