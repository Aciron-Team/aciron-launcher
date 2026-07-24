import { useEffect, useRef } from "react";
import { useTheme } from "../ThemeContext";

type Cube = {
  x: number;
  y: number;
  base: number;
  vy: number;
  rot: number;
  vrot: number;
  ci: number;
};

const COUNT = 30;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function rgbTriple(hex: string): string {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

export default function BackgroundCubes() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { palette } = useTheme();

  const bgRef = useRef(palette.bg);
  const colorsRef = useRef<string[]>([]);
  const glowRef = useRef("");
  bgRef.current = palette.bg;
  colorsRef.current = [
    rgbTriple(palette.accent),
    rgbTriple(palette.accentHover),
    rgbTriple(palette.accentActive),
  ];
  glowRef.current = rgbTriple(palette.accent);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const cubes: Cube[] = [];

    const spawn = (c: Cube, atBottom: boolean) => {
      c.base = rand(16, 60);
      c.x = rand(0, w);
      c.y = atBottom ? h + rand(0, h * 0.4) : rand(0, h);
      c.vy = rand(10, 34);
      c.rot = rand(0, Math.PI);
      c.vrot = rand(-0.25, 0.25);
      c.ci = Math.floor(rand(0, colorsRef.current.length));
    };

    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w;
      cv.height = h;
    };
    resize();
    for (let i = 0; i < COUNT; i++) {
      const c: Cube = { x: 0, y: 0, base: 0, vy: 0, rot: 0, vrot: 0, ci: 0 };
      spawn(c, false);
      cubes.push(c);
    }

    const rr = (x: number, y: number, s: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + s, y, x + s, y + s, r);
      ctx.arcTo(x + s, y + s, x, y + s, r);
      ctx.arcTo(x, y + s, x, y, r);
      ctx.arcTo(x, y, x + s, y, r);
      ctx.closePath();
    };

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const colors = colorsRef.current;
      const glow = glowRef.current;

      ctx.fillStyle = bgRef.current;
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, h, 0, h * 0.3);
      grad.addColorStop(0, `rgba(${glow},0.13)`);
      grad.addColorStop(0.5, `rgba(${glow},0.05)`);
      grad.addColorStop(1, `rgba(${glow},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const c of cubes) {
        c.y -= c.vy * dt;
        c.rot += c.vrot * dt;
        const prog = Math.max(0, Math.min(1, c.y / h));
        const size = c.base * (0.3 + 0.7 * prog);
        const alpha = prog * prog * 0.16;
        if (alpha > 0.002) {
          const rgb = colors[c.ci] ?? colors[0];
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rot);
          ctx.shadowColor = `rgba(${rgb},${alpha})`;
          ctx.shadowBlur = size * 0.5;
          ctx.fillStyle = `rgba(${rgb},${alpha})`;
          rr(-size / 2, -size / 2, size, size * 0.22);
          ctx.fill();
          ctx.restore();
        }
        if (c.y < -c.base) spawn(c, true);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 h-full w-full" />;
}
