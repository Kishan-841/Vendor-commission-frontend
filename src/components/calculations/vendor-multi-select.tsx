"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface VendorOption {
  id: string;
  vendorName: string;
  companyName: string | null;
  alreadyCalculated: boolean;
}

// Inline searchable multi-select for vendors. Rendered as an always-open
// bordered panel (no popover) so it never mispositions inside the dialog.
// Already-calculated vendors are shown disabled.
export function VendorMultiSelect({
  vendors,
  selected,
  onChange,
  loading,
}: {
  vendors: VendorOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.vendorName.toLowerCase().includes(q) ||
        (v.companyName ?? "").toLowerCase().includes(q),
    );
  }, [vendors, query]);

  const selectable = filtered.filter((v) => !v.alreadyCalculated);
  const allVisibleSelected =
    selectable.length > 0 && selectable.every((v) => selected.has(v.id));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  // Select/clear all currently-visible selectable vendors.
  const toggleAllVisible = () => {
    const next = new Set(selected);
    if (allVisibleSelected) selectable.forEach((v) => next.delete(v.id));
    else selectable.forEach((v) => next.add(v.id));
    onChange(next);
  };

  return (
    <div className="rounded-md border border-border">
      <div className="relative border-b border-border">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vendors…"
          className="h-9 border-0 pl-8 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="max-h-52 overflow-y-auto py-1">
        {loading ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">Loading vendors…</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            {vendors.length === 0 ? "No active vendors." : "No vendors match your search."}
          </p>
        ) : (
          filtered.map((v) => {
            const checked = selected.has(v.id);
            return (
              <label
                key={v.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm",
                  v.alreadyCalculated
                    ? "cursor-not-allowed opacity-55"
                    : "hover:bg-muted/60",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={v.alreadyCalculated}
                  onCheckedChange={() => !v.alreadyCalculated && toggle(v.id)}
                />
                <span className="min-w-0 flex-1 truncate">
                  {v.vendorName}
                  {v.companyName && (
                    <span className="text-muted-foreground"> · {v.companyName}</span>
                  )}
                </span>
                {v.alreadyCalculated && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                    <Check className="h-3 w-3" /> done
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span>
          {selected.size} selected
          {selectable.length > 0 && ` · ${selectable.length} available`}
        </span>
        {selectable.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={toggleAllVisible}
          >
            {allVisibleSelected ? "Clear" : "Select all"}
            {query.trim() && " shown"}
          </Button>
        )}
      </div>
    </div>
  );
}
