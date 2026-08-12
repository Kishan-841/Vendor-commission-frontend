"use client";

// Adapted from the React Bits "Shiny Text": a sweeping sheen animates across
// the text. Uses background-clip:text with a moving gradient.

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function ShinyText({
  text,
  speed = 4,
  className,
  style,
}: {
  text: string;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("shiny-text", className)}
      style={{ "--shiny-speed": `${speed}s`, ...style } as CSSProperties}
    >
      {text}
    </span>
  );
}
