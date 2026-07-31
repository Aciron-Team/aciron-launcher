
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const SRC = "src-tauri/icons/128x128.png";
const OUT = "src-tauri/resources/badge-glyph.png";
const SIZE = 16;

const src = PNG.sync.read(fs.readFileSync(SRC));
const at = (x, y) => {
  const i = (src.width * y + x) << 2;
  return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
};

const [br, bg, bb] = at(1, 1);
const near = (r, g, b) => Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb) < 90;

let minX = src.width;
let minY = src.height;
let maxX = -1;
let maxY = -1;
const keep = new Uint8Array(src.width * src.height);
for (let y = 0; y < src.height; y++) {
  for (let x = 0; x < src.width; x++) {
    const [r, g, b, a] = at(x, y);
    if (a < 16 || near(r, g, b)) continue;
    keep[y * src.width + x] = 1;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}
if (maxX < 0) throw new Error("после удаления подложки не осталось ни одного пикселя");

const w = maxX - minX + 1;
const h = maxY - minY + 1;
const side = Math.max(w, h);
const offX = minX - Math.floor((side - w) / 2);
const offY = minY - Math.floor((side - h) / 2);

const out = new PNG({ width: SIZE, height: SIZE });
const step = side / SIZE;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let n = 0;
    const x0 = Math.floor(x * step);
    const y0 = Math.floor(y * step);
    const x1 = Math.max(x0 + 1, Math.floor((x + 1) * step));
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * step));
    for (let sy = y0; sy < y1; sy++) {
      for (let sx = x0; sx < x1; sx++) {
        const px = offX + sx;
        const py = offY + sy;
        n++;
        if (px < 0 || py < 0 || px >= src.width || py >= src.height) continue;
        if (!keep[py * src.width + px]) continue;
        const [cr, cg, cb] = at(px, py);
        r += cr;
        g += cg;
        b += cb;
        a += 255;
      }
    }
    const i = (SIZE * y + x) << 2;
    const solid = a / 255;

    out.data[i] = solid ? Math.round(r / solid) : 0;
    out.data[i + 1] = solid ? Math.round(g / solid) : 0;
    out.data[i + 2] = solid ? Math.round(b / solid) : 0;
    out.data[i + 3] = Math.round(a / n);
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, PNG.sync.write(out));
console.log(`${OUT}: ${SIZE}×${SIZE}, марка вырезана из области ${w}×${h} по (${minX},${minY})`);
