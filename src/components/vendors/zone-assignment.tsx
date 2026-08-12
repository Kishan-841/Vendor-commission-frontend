"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useMasterZones } from "@/hooks/use-zones";
import { ZoneTypeBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { Zone, ZoneType } from "@/lib/types";
import { cn } from "@/lib/utils";

// One assignment the form is building: zone + type + commission % (as string
// while editing). The same zone can appear under both NEW and RENEWAL.
export interface AssignmentInput {
  zoneId: string;
  zoneType: ZoneType;
  commissionPercentage: string;
}

const key = (zoneId: string, type: ZoneType) => `${zoneId}|${type}`;

export function ZoneAssignment({
  value,
  onChange,
}: {
  value: AssignmentInput[];
  onChange: (a: AssignmentInput[]) => void;
}) {
  const [q, setQ] = useState("");
  const zones = useMasterZones();
  const byKey = useMemo(
    () => new Map(value.map((a) => [key(a.zoneId, a.zoneType), a])),
    [value],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (zones.data ?? []).filter((z) => !needle || z.name.toLowerCase().includes(needle));
  }, [zones.data, q]);

  const toggle = (zoneId: string, type: ZoneType) => {
    if (byKey.has(key(zoneId, type))) {
      onChange(value.filter((a) => key(a.zoneId, a.zoneType) !== key(zoneId, type)));
    } else {
      onChange([...value, { zoneId, zoneType: type, commissionPercentage: "" }]);
    }
  };

  const setPct = (zoneId: string, type: ZoneType, pct: string) =>
    onChange(
      value.map((a) =>
        key(a.zoneId, a.zoneType) === key(zoneId, type) ? { ...a, commissionPercentage: pct } : a,
      ),
    );

  const total = zones.data?.length ?? 0;
  if (!zones.isLoading && total === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No master zones yet. Upload them in{" "}
        <Link href="/zones" className="text-primary underline-offset-2 hover:underline">
          Zone Master
        </Link>{" "}
        first.
      </div>
    );
  }

  const types: ZoneType[] = ["NEW", "RENEWAL"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search zones…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{value.length} selected</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {types.map((type) => {
          const selectedCount = value.filter((a) => a.zoneType === type).length;
          return (
            <div key={type} className="rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <ZoneTypeBadge type={type} />
                <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {q ? "No matches" : "No zones"}
                  </p>
                ) : (
                  filtered.map((z: Zone) => {
                    const assigned = byKey.get(key(z.id, type));
                    const isSel = !!assigned;
                    return (
                      <div
                        key={z.id}
                        className={cn(
                          "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                          isSel && "bg-primary/5",
                        )}
                      >
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={() => toggle(z.id, type)}
                          id={`${type}-${z.id}`}
                        />
                        <label htmlFor={`${type}-${z.id}`} className="flex-1 cursor-pointer truncate">
                          {z.name}
                        </label>
                        {isSel && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={assigned.commissionPercentage}
                              onChange={(e) => setPct(z.id, type, e.target.value)}
                              placeholder="%"
                              className="h-7 w-16 text-right"
                              aria-label={`${z.name} ${type} commission %`}
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
