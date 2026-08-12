"use client";

import type { AuditLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { ActionBadge } from "./action-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Change = { from: unknown; to: unknown };

// metadata.changes is written by the backend's diffChanges() helper.
function getChanges(metadata: Record<string, unknown> | null): [string, Change][] {
  const changes = metadata?.changes;
  if (!changes || typeof changes !== "object") return [];
  return Object.entries(changes as Record<string, Change>);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  );
}

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

export function LogDetailSheet({
  log,
  onClose,
}: {
  log: AuditLogEntry | null;
  onClose: () => void;
}) {
  const changes = log ? getChanges(log.metadata) : [];
  // Everything in metadata except the diff (rendered as its own table).
  const otherMeta = log?.metadata
    ? Object.entries(log.metadata).filter(([k]) => k !== "changes")
    : [];

  return (
    <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {log && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ActionBadge action={log.action} />
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6 space-y-6">
              <div>
                <Row label="Time" value={formatDateTime(log.createdAt)} />
                <Row
                  label="User"
                  value={log.user ? `${log.user.name} (${log.user.email})` : "System"}
                />
                <Row label="IP address" value={<span className="font-mono">{show(log.ip)}</span>} />
                <Row label="Entity" value={show(log.entityType)} />
                <Row label="Entity ID" value={<span className="font-mono text-xs">{show(log.entityId)}</span>} />
              </div>

              {changes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Changes</h4>
                  <div className="rounded-md border border-border divide-y divide-border">
                    {changes.map(([field, c]) => (
                      <div key={field} className="px-3 py-2 text-sm">
                        <span className="font-medium">{field}</span>
                        <div className="mt-0.5 flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground line-through break-all">{show(c.from)}</span>
                          <span aria-hidden>→</span>
                          <span className="break-all">{show(c.to)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otherMeta.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Details</h4>
                  <div>
                    {otherMeta.map(([k, v]) => (
                      <Row
                        key={k}
                        label={k}
                        value={typeof v === "object" ? JSON.stringify(v) : show(v)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
