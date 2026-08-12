"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates `delayMs` after the
 * source value stops changing. Handy for search inputs so the query fires
 * ~350ms after the user stops typing rather than on every keystroke.
 */
export function useDebounce<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
