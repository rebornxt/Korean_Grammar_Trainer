// Repo-native geometric icon, rasterized without external fonts or dependencies.
import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ROOT } from "./lib.mjs";
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([length, t, data, crc]);
}
function distance(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1,
    dy = y2 - y1,
    t = Math.max(
      0,
      Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)),
    );
  return Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
}
for (const size of [192, 512]) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 512,
        v = (y / size) * 512;
      const line = [
        [132, 166, 264, 166],
        [198, 130, 198, 166],
        [316, 148, 316, 294],
        [316, 216, 368, 216],
        [168, 300, 168, 368],
        [168, 368, 326, 368],
      ].some((a) => distance(u, v, ...a) < 11);
      const ring = Math.abs(Math.hypot(u - 198, v - 224) - 40) < 11;
      const color = line || ring ? [52, 91, 68] : [233, 240, 233];
      const p = y * (size * 4 + 1) + 1 + x * 4;
      raw.set([...color, 255], p);
    }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  await writeFile(
    resolve(ROOT, `public/icon-${size}.png`),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
