"use client";

// Adapted from the React Bits "Spotlight Card": a card with a radial glow that
// tracks the cursor, plus a glowing border edge. Pure CSS via mouse-tracked
// custom properties.

import { useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(59,130,246,0.18)",
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn("group/spot relative overflow-hidden", className)}
      style={{ "--spot": spotlightColor } as CSSProperties}
    >
      {/* Cursor-following radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(320px circle at var(--mx, 50%) var(--my, 0%), var(--spot), transparent 60%)",
        }}
      />
      {children}
    </div>
  );
}
