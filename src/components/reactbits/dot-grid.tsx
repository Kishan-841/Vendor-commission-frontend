"use client";

// Adapted from the React Bits "Dot Grid" component: an interactive canvas grid
// of dots that brighten/scale near the cursor, push away on hover, and ripple
// out on click. Dependency-free (canvas 2D). Respects reduced motion.

import { useEffect, useRef } from "react";

interface Dot {
  cx: number;
  cy: number; // base position
  x: number;
  y: number; // current position
  vx: number;
  vy: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function DotGrid({
  gap = 30,
  dotSize = 2.4,
  baseColor = "#26262e",
  activeColor = "#3B82F6",
  proximity = 130,
  shockRadius = 220,
  shockStrength = 6,
  className,
}: {
  gap?: number;
  dotSize?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  shockRadius?: number;
  shockStrength?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const ctx = canvas.getContext("2d")!;
    const base = hexToRgb(baseColor);
    const active = hexToRgb(activeColor);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    const pointer = { x: -9999, y: -9999 };
    let raf = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(width / gap);
      const rows = Math.ceil(height / gap);
      const offX = (width - (cols - 1) * gap) / 2;
      const offY = (height - (rows - 1) * gap) / 2;
      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = offX + c * gap;
          const cy = offY + r * gap;
          dots.push({ cx, cy, x: cx, y: cy, vx: 0, vy: 0 });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const prox2 = proximity * proximity;
      for (const d of dots) {
        // Spring back to base with damping (inertia).
        if (!reduce) {
          const sx = (d.cx - d.x) * 0.12;
          const sy = (d.cy - d.y) * 0.12;
          d.vx = (d.vx + sx) * 0.82;
          d.vy = (d.vy + sy) * 0.82;
          d.x += d.vx;
          d.y += d.vy;
        }
        // Proximity → brighten + scale.
        const dx = pointer.x - d.x;
        const dy = pointer.y - d.y;
        const dist2 = dx * dx + dy * dy;
        let t = 0;
        if (dist2 < prox2) t = 1 - Math.sqrt(dist2) / proximity;

        const r = Math.round(base[0] + (active[0] - base[0]) * t);
        const g = Math.round(base[1] + (active[1] - base[1]) * t);
        const b = Math.round(base[2] + (active[2] - base[2]) * t);
        const radius = (dotSize / 2) * (1 + t * 1.6);

        ctx.beginPath();
        ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.globalAlpha = 0.5 + t * 0.5;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onClick = (e: PointerEvent) => {
      if (reduce) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      for (const d of dots) {
        const dx = d.x - px;
        const dy = d.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist < shockRadius && dist > 0) {
          const force = (1 - dist / shockRadius) * shockStrength;
          d.vx += (dx / dist) * force;
          d.vy += (dy / dist) * force;
        }
      }
    };

    build();
    draw();
    const ro = new ResizeObserver(build);
    ro.observe(parent);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onClick);
    parent.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onClick);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, [gap, dotSize, baseColor, activeColor, proximity, shockRadius, shockStrength]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
