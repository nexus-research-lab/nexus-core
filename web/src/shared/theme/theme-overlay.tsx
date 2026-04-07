"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "./theme-context";

/* ─────────────────────────────────────
   Rain canvas
   ───────────────────────────────────── */

interface RainDrop {
  x: number; y: number;
  len: number; speed: number; w: number;
  r: number; g: number; b: number; alpha: number;
  drift: number; splash_chance: number;
}
interface Splash {
  x: number; y: number;
  radius: number; max_radius: number;
  alpha: number; life: number; max_life: number;
}

const RAIN_LAYERS = [
  { count: 70,  len: [12, 22] as [number,number], speed: 20, w: 1.0, c: [200,210,225] as const, a: [0.20,0.38] as [number,number], sc: 0.30 },
  { count: 150, len: [7,  15] as [number,number], speed: 14, w: 0.7, c: [185,195,212] as const, a: [0.12,0.25] as [number,number], sc: 0.05 },
  { count: 120, len: [4,   9] as [number,number], speed:  9, w: 0.4, c: [170,180,200] as const, a: [0.06,0.15] as [number,number], sc: 0.02 },
];

function make_drops(W: number, H: number): RainDrop[] {
  return RAIN_LAYERS.flatMap(l =>
    Array.from({ length: l.count }, () => ({
      x: Math.random() * (W + 60) - 30,
      y: Math.random() * H,
      len: l.len[0] + Math.random() * (l.len[1] - l.len[0]),
      speed: l.speed + Math.random() * l.speed * 0.4,
      w: l.w + Math.random() * 0.15,
      r: l.c[0], g: l.c[1], b: l.c[2],
      alpha: l.a[0] + Math.random() * (l.a[1] - l.a[0]),
      drift: 1.5 + Math.random(),
      splash_chance: l.sc,
    }))
  );
}

function RainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, drops: RainDrop[] = [];
    const splashes: Splash[] = [];
    let raf = 0;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      drops = make_drops(W, H);
    };

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of drops) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.drift * (d.len / d.speed), d.y + d.len);
        ctx.strokeStyle = `rgba(${d.r},${d.g},${d.b},${d.alpha})`;
        ctx.lineWidth = d.w;
        ctx.lineCap = "round";
        ctx.stroke();
        d.y += d.speed; d.x += d.drift;
        if (d.y > H) {
          if (Math.random() < d.splash_chance)
            splashes.push({ x: d.x, y: H - 2, radius: 0,
              max_radius: 2 + Math.random() * 3,
              alpha: 0.2 + Math.random() * 0.15,
              life: 0, max_life: 8 + Math.random() * 6 });
          d.y = -d.len - Math.random() * 80;
          d.x = Math.random() * (W + 60) - 30;
        }
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.life++;
        s.radius = s.max_radius * (s.life / s.max_life);
        const a = s.alpha * (1 - s.life / s.max_life);
        if (a <= 0 || s.life >= s.max_life) { splashes.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.radius * 1.5, s.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180,190,205,${a})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} style={{ position:"fixed", inset:0, pointerEvents:"none", width:"100%", height:"100%" }} />;
}

/* ─────────────────────────────────────
   Sunny — SVG branch shadow overlay
   mix-blend-mode: multiply so it
   darkens the warm background like
   real leaf shadows cast by sunlight
   ───────────────────────────────────── */

function SunnyLeafShadow() {
  // Shadow color: warm dark olive-brown, multiply blends with #f0ead8
  const SHADOW = "rgba(80,68,40,0.13)";
  const SHADOW_DARK = "rgba(60,50,28,0.18)";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        mixBlendMode: "multiply",
        overflow: "visible",
      }}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id="leaf-blur">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id="leaf-blur-soft">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* ── Top-left branch cluster (sways gently) ── */}
      <g filter="url(#leaf-blur)" style={{ animation: "nexus-branch-sway-l 7s ease-in-out infinite alternate", transformOrigin: "0 0" }}>
        {/* Main stem from top-left */}
        <path d="M -40 -60 Q 80 120 180 280 Q 260 400 200 520" stroke={SHADOW_DARK} strokeWidth="18" fill="none" strokeLinecap="round" />
        <path d="M -40 -60 Q 60 80 140 200" stroke={SHADOW_DARK} strokeWidth="12" fill="none" strokeLinecap="round" />

        {/* Left branches */}
        <path d="M 60 100 Q -20 160 -80 200 Q -140 230 -160 290" stroke={SHADOW} strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M 110 170 Q 30 210 -20 280 Q -60 340 -100 360" stroke={SHADOW} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M 155 250 Q 80 290 20 360 Q -30 420 -60 440" stroke={SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />

        {/* Leaf clusters — ellipses scattered along branches */}
        {[
          [-100, 195, 48, 22, -25], [-130, 260, 42, 18, -15], [-150, 290, 36, 14, -10],
          [-85, 340, 44, 20, -30], [-110, 370, 38, 16, -20],
          [20, 155, 52, 24, 15], [0, 200, 44, 20, 5], [-15, 240, 40, 18, 10],
          [70, 90, 56, 26, 20], [40, 130, 48, 22, 12],
          [-40, 420, 36, 14, -18], [-70, 450, 32, 13, -12],
          [25, 290, 46, 20, 8], [5, 330, 40, 17, 4],
        ].map(([cx, cy, rx, ry, rot], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
            transform={`rotate(${rot} ${cx} ${cy})`}
            fill={SHADOW_DARK} />
        ))}
      </g>

      {/* ── Top-right branch cluster (sways opposite phase) ── */}
      <g filter="url(#leaf-blur)" style={{ animation: "nexus-branch-sway-r 9s ease-in-out infinite alternate", transformOrigin: "1440px 0" }}>
        {/* Main stem from top-right */}
        <path d="M 1480 -40 Q 1340 150 1240 300 Q 1160 420 1210 540" stroke={SHADOW_DARK} strokeWidth="20" fill="none" strokeLinecap="round" />
        <path d="M 1480 -40 Q 1380 100 1310 210" stroke={SHADOW_DARK} strokeWidth="13" fill="none" strokeLinecap="round" />

        {/* Right branches */}
        <path d="M 1360 130 Q 1450 200 1510 250 Q 1560 290 1580 350" stroke={SHADOW} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M 1300 200 Q 1400 260 1440 330 Q 1480 390 1500 430" stroke={SHADOW} strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M 1250 290 Q 1350 340 1390 410 Q 1420 470 1440 500" stroke={SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />

        {/* Leaf clusters */}
        {[
          [1510, 240, 52, 24, 25], [1545, 300, 44, 20, 18], [1565, 350, 38, 16, 12],
          [1500, 400, 46, 20, 20], [1530, 440, 40, 17, 15],
          [1420, 185, 56, 26, -15], [1450, 225, 48, 22, -10], [1465, 265, 42, 18, -6],
          [1380, 140, 60, 28, -20], [1405, 175, 52, 24, -14],
          [1450, 480, 38, 15, 16], [1470, 510, 34, 13, 10],
          [1410, 340, 50, 22, -8], [1435, 375, 44, 19, -4],
        ].map(([cx, cy, rx, ry, rot], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
            transform={`rotate(${rot} ${cx} ${cy})`}
            fill={SHADOW_DARK} />
        ))}
      </g>

      {/* ── Softer mid-ground shadow patches (barely-there depth) ── */}
      <g filter="url(#leaf-blur-soft)" style={{ animation: "nexus-branch-sway-l 13s ease-in-out infinite alternate", transformOrigin: "200px 0" }}>
        <path d="M 160 -20 Q 280 180 320 380 Q 350 520 300 640" stroke={SHADOW} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M 280 100 Q 220 200 180 320 Q 140 420 160 500" stroke={SHADOW} strokeWidth="7" fill="none" strokeLinecap="round" />
        {[
          [170, 290, 38, 16, -10], [140, 380, 34, 14, -6], [155, 460, 30, 12, -4],
          [310, 200, 42, 18, 12], [290, 270, 36, 15, 8], [270, 340, 32, 13, 5],
        ].map(([cx, cy, rx, ry, rot], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
            transform={`rotate(${rot} ${cx} ${cy})`}
            fill={SHADOW} />
        ))}
      </g>

      <g filter="url(#leaf-blur-soft)" style={{ animation: "nexus-branch-sway-r 11s ease-in-out infinite alternate", transformOrigin: "1200px 0" }}>
        <path d="M 1280 -10 Q 1180 200 1160 380 Q 1150 520 1200 650" stroke={SHADOW} strokeWidth="10" fill="none" strokeLinecap="round" />
        {[
          [1270, 280, 40, 17, 10], [1240, 370, 34, 14, 7], [1260, 460, 30, 12, 4],
          [1150, 200, 44, 19, -12], [1160, 290, 36, 15, -8],
        ].map(([cx, cy, rx, ry, rot], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
            transform={`rotate(${rot} ${cx} ${cy})`}
            fill={SHADOW} />
        ))}
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────
   ThemeOverlay — root component
   ───────────────────────────────────── */

export function ThemeOverlay() {
  const { theme } = useTheme();
  const T = "opacity 700ms cubic-bezier(0.23,1,0.32,1)";

  return (
    <>
      {/* ── Sunny leaf shadow ── */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999,
        opacity: theme === "sunny" ? 1 : 0, transition: T,
      }}>
        <SunnyLeafShadow />
      </div>

      {/* ── Rain fog layer ── */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 996,
        opacity: theme === "rain" ? 1 : 0, transition: T,
        background: "radial-gradient(ellipse at 50% 100%,rgba(70,80,95,0.18) 0%,transparent 45%),radial-gradient(ellipse at 20% 85%,rgba(60,70,85,0.1) 0%,transparent 35%)",
        animation: "nexus-fog-drift 25s ease-in-out infinite alternate",
      }} />

      {/* ── Rain canvas ── */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 997,
        opacity: theme === "rain" ? 1 : 0, transition: T,
      }}>
        <RainCanvas />
      </div>
    </>
  );
}
