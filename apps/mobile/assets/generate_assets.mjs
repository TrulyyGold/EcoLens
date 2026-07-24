import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(kind, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(kind, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function writePng(path, width, height, pixels) {
  const stride = width * 4;
  const rows = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const payload = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, payload);
}

function canvas(width, height, color) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels.set(color, offset);
  }
  return pixels;
}

function paintEllipse(pixels, width, height, cx, cy, rx, ry, angle, color) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const minY = Math.max(0, Math.floor(cy - rx - ry));
  const maxY = Math.min(height, Math.floor(cy + rx + ry) + 1);
  const minX = Math.max(0, Math.floor(cx - rx - ry));
  const maxX = Math.min(width, Math.floor(cx + rx + ry) + 1);
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const localX = dx * cosine + dy * sine;
      const localY = -dx * sine + dy * cosine;
      if ((localX / rx) ** 2 + (localY / ry) ** 2 <= 1) {
        pixels.set(color, (y * width + x) * 4);
      }
    }
  }
}

function makeMark(size, background) {
  const pixels = canvas(size, size, background);
  paintEllipse(pixels, size, size, size * 0.5, size * 0.5, size * 0.34, size * 0.34, 0, [242, 245, 233, 255]);
  paintEllipse(pixels, size, size, size * 0.42, size * 0.48, size * 0.09, size * 0.22, -0.58, [104, 151, 86, 255]);
  paintEllipse(pixels, size, size, size * 0.58, size * 0.5, size * 0.08, size * 0.19, 0.64, [226, 181, 74, 255]);
  paintEllipse(pixels, size, size, size * 0.5, size * 0.64, size * 0.026, size * 0.19, 0, [22, 59, 46, 255]);
  return pixels;
}

writePng(join(ROOT, 'icon.png'), 1024, 1024, makeMark(1024, [22, 59, 46, 255]));
writePng(join(ROOT, 'adaptive-icon.png'), 1024, 1024, makeMark(1024, [22, 59, 46, 0]));

const splashWidth = 1242;
const splashHeight = 2436;
const splash = canvas(splashWidth, splashHeight, [242, 245, 233, 255]);
const mark = makeMark(520, [22, 59, 46, 255]);
const left = Math.floor((splashWidth - 520) / 2);
const top = Math.floor((splashHeight - 520) / 2) - 100;
for (let row = 0; row < 520; row += 1) {
  mark.copy(splash, ((top + row) * splashWidth + left) * 4, row * 520 * 4, (row + 1) * 520 * 4);
}
writePng(join(ROOT, 'splash.png'), splashWidth, splashHeight, splash);

console.log('Generated EcoLens icon, adaptive icon, and splash assets.');
