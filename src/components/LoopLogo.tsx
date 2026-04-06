import { useRef, useEffect, useState, useCallback } from "react";

// ============================================================
// Seeded PRNG
// ============================================================
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Point {
  x: number;
  y: number;
}

function generateScribble(
  cx: number,
  cy: number,
  baseRadius: number,
  seed: number
): Point[] {
  const rng = mulberry32(seed);
  const laps = 5;
  const pointsPerLap = 180;
  const totalPoints = laps * pointsPerLap;
  const path: Point[] = [];

  const lapConfigs: {
    radiusOffset: number;
    centerDx: number;
    centerDy: number;
    phaseOffset: number;
    wobbles: { freq: number; amp: number; phase: number }[];
  }[] = [];

  for (let l = 0; l < laps; l++) {
    const spreadRange = baseRadius * 0.35;
    const baseOffset = (l / (laps - 1) - 0.5) * spreadRange;
    const jitter = (rng() - 0.5) * 20;

    lapConfigs.push({
      radiusOffset: baseOffset + jitter,
      centerDx: (rng() - 0.5) * 24,
      centerDy: (rng() - 0.5) * 24,
      phaseOffset: (rng() - 0.5) * 0.35,
      wobbles: [
        { freq: 2, amp: (rng() - 0.5) * 14, phase: rng() * Math.PI * 2 },
        { freq: 3, amp: (rng() - 0.5) * 8, phase: rng() * Math.PI * 2 },
      ],
    });
  }

  for (let i = 0; i <= totalPoints; i++) {
    const lapFloat = i / pointsPerLap;
    const lapIdx = Math.min(laps - 1, Math.floor(lapFloat));
    const nextIdx = Math.min(laps - 1, lapIdx + 1);
    const t = lapFloat - lapIdx;
    const blend = t * t * (3 - 2 * t);

    const c1 = lapConfigs[lapIdx];
    const c2 = lapConfigs[nextIdx];

    const rOff = c1.radiusOffset * (1 - blend) + c2.radiusOffset * blend;
    const dx = c1.centerDx * (1 - blend) + c2.centerDx * blend;
    const dy = c1.centerDy * (1 - blend) + c2.centerDy * blend;
    const pOff = c1.phaseOffset * (1 - blend) + c2.phaseOffset * blend;

    const angle = (i / totalPoints) * laps * Math.PI * 2 + pOff;

    let wobble = 0;
    for (let w = 0; w < 2; w++) {
      const w1 = c1.wobbles[w],
        w2 = c2.wobbles[w];
      const amp = w1.amp * (1 - blend) + w2.amp * blend;
      const ph = w1.phase * (1 - blend) + w2.phase * blend;
      wobble += amp * Math.sin(((i % pointsPerLap) / pointsPerLap) * Math.PI * 2 * w1.freq + ph);
    }

    const r = baseRadius + rOff + wobble;
    path.push({
      x: cx + dx + Math.cos(angle) * r,
      y: cy + dy + Math.sin(angle) * r,
    });
  }

  return path;
}

// Brand colors
const C1 = "#BFD9D9";
const C2 = "#6BA3A3";

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function drawTexturedLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  startFrac: number,
  endFrac: number,
  color1: string,
  color2: string
) {
  const n = points.length - 1;
  const si = Math.max(0, Math.floor(startFrac * n));
  const ei = Math.min(n, Math.ceil(endFrac * n));
  if (ei - si < 3) return;

  const totalVisible = ei - si;
  const passes = 5;

  for (let p = 0; p < passes; p++) {
    const offsetAngle = (p / passes) * Math.PI * 2;
    const offsetDist = 4.5;

    ctx.beginPath();
    for (let i = si; i < ei; i++) {
      const frac = (i - si) / totalVisible;
      let taper = 1;
      if (frac < 0.03) taper = frac / 0.03;
      if (frac > 0.97) taper = (1 - frac) / 0.03;
      taper = Math.max(0, Math.min(1, taper));

      const jx = Math.cos(offsetAngle + i * 0.1) * offsetDist * taper;
      const jy = Math.sin(offsetAngle + i * 0.1) * offsetDist * taper;
      const x = points[i].x + jx;
      const y = points[i].y + jy;

      if (i === si) {
        ctx.moveTo(x, y);
      } else if (i < ei - 1) {
        const nx = points[i + 1].x + jx;
        const ny = points[i + 1].y + jy;
        ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
      } else {
        ctx.lineTo(x, y);
      }
    }

    const grad = ctx.createLinearGradient(
      points[si].x, points[si].y,
      points[Math.min(ei, n)].x, points[Math.min(ei, n)].y
    );
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 6 + (p % 2) * 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.22;
    ctx.stroke();
  }

  // Main center stroke
  ctx.beginPath();
  for (let i = si; i < ei; i++) {
    const x = points[i].x;
    const y = points[i].y;
    if (i === si) {
      ctx.moveTo(x, y);
    } else if (i < ei - 1) {
      const nx = points[i + 1].x;
      const ny = points[i + 1].y;
      ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    } else {
      ctx.lineTo(x, y);
    }
  }

  const mainGrad = ctx.createLinearGradient(100, 100, 500, 500);
  mainGrad.addColorStop(0, color1);
  mainGrad.addColorStop(0.5, color2);
  mainGrad.addColorStop(1, color1);
  ctx.strokeStyle = mainGrad;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.7;
  ctx.stroke();
}

// ============================================================
// Canvas size constants (internal resolution)
// ============================================================
const CANVAS_RES = 600;
const CENTER = 300;
const BASE_RADIUS = 170;

// ============================================================
// Scribbling: endlessly draws and erases different paths
// ============================================================
export function ScribblingLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scribbles] = useState(() => {
    const arr: Point[][] = [];
    for (let i = 0; i < 10; i++) {
      arr.push(generateScribble(CENTER, CENTER, BASE_RADIUS, 42 + i * 71));
    }
    return arr;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const cycleDuration = 5000;

    const animate = (ts: number) => {
      ctx.clearRect(0, 0, CANVAS_RES, CANVAS_RES);
      ctx.globalAlpha = 1;

      const totalProgress = ts / cycleDuration;
      const cycleIndex = Math.floor(totalProgress) % scribbles.length;
      const t = totalProgress - Math.floor(totalProgress);

      const path = scribbles[cycleIndex];
      const head = easeInOut(Math.min(1, t / 0.55));
      const tail = t > 0.32 ? easeInOut(Math.min(1, (t - 0.32) / 0.68)) : 0;

      if (head > tail + 0.003) {
        drawTexturedLine(ctx, path, tail, head, C1, C2);
      }

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [scribbles]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_RES}
      height={CANVAS_RES}
      className={className}
      style={{ width: size, height: size, imageRendering: "auto" }}
    />
  );
}

// ============================================================
// Thinking: draws once, then gently rotates and breathes
// ============================================================
export function ThinkingLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [path] = useState(() => generateScribble(CENTER, CENTER, BASE_RADIUS, 42));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let start: number | null = null;
    const drawTime = 3500;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;

      ctx.clearRect(0, 0, CANVAS_RES, CANVAS_RES);
      ctx.globalAlpha = 1;
      ctx.save();

      if (elapsed > drawTime) {
        const angle = ((elapsed - drawTime) / 18000) * Math.PI * 2;
        ctx.translate(CENTER, CENTER);
        ctx.rotate(angle);
        ctx.translate(-CENTER, -CENTER);
      }

      let progress = Math.min(1, elapsed / drawTime);
      progress = easeInOut(progress);

      if (elapsed > drawTime) {
        const phase = ((elapsed - drawTime) / 3500) % 1;
        const pulse = 0.85 + 0.15 * Math.sin(phase * Math.PI * 2);
        ctx.globalAlpha = pulse;
      }

      drawTexturedLine(ctx, path, 0, progress, C1, C2);
      ctx.restore();

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [path]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_RES}
      height={CANVAS_RES}
      className={className}
      style={{ width: size, height: size, imageRendering: "auto" }}
    />
  );
}

// ============================================================
// Static: full scribble, resting – drawn once
// ============================================================
export function StaticLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [path] = useState(() => generateScribble(CENTER, CENTER, BASE_RADIUS, 42));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_RES, CANVAS_RES);
    ctx.globalAlpha = 1;
    drawTexturedLine(ctx, path, 0, 1, C1, C2);
  }, [path]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_RES}
      height={CANVAS_RES}
      className={className}
      style={{ width: size, height: size, imageRendering: "auto" }}
    />
  );
}
