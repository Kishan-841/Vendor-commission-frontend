"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useSalesList, type SalesGroup } from "@/hooks/use-sales";
import { ZoneTypeBadge } from "@/components/status-badge";
import { inr, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SalesRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mono = { fontFamily: "var(--font-geist-mono)" } as const;
// Page size for the expanded per-zone rows (backend caps pageSize at 200).
const ROWS_PAGE = 50;

interface GroupedSalesTableProps {
  groups: SalesGroup[];
  isLoading: boolean;
  emptyMessage: string;
  month: string;
  search?: string;
  // Rendered in the Zone / Sales / Total headers (page owns the sort state).
  sortHeader: (label: string, key: string, alignRight?: boolean) => ReactNode;
  onRowClick: (r: SalesRecord) => void;
}

// Zone+type groups with a chevron that expands to the group's individual
// sales. Mount it keyed by (month, filters) so expansion resets when the
// visible group set changes.
export function GroupedSalesTable({
  groups,
  isLoading,
  emptyMessage,
  month,
  search,
  sortHeader,
  onRowClick,
}: GroupedSalesTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const keyOf = (g: SalesGroup) => `${g.zoneName}|${g.salesType}`;

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const totalSales = groups.reduce((s, g) => s + g.count, 0);

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60 border-b border-border">
              <TableHead className="h-11 w-10" />
              <TableHead className="h-11 whitespace-nowrap font-medium text-foreground border-r border-border">
                {sortHeader("Zone", "zoneName")}
              </TableHead>
              <TableHead className="h-11 w-[110px] whitespace-nowrap font-medium text-foreground border-r border-border">
                Type
              </TableHead>
              <TableHead className="h-11 w-[110px] whitespace-nowrap font-medium text-foreground border-r border-border text-right">
                {sortHeader("Sales", "count", true)}
              </TableHead>
              <TableHead className="h-11 w-[180px] whitespace-nowrap font-medium text-foreground text-right">
                {sortHeader("Total plan amount", "totalPlanAmount", true)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => {
                const key = keyOf(g);
                const open = expanded.has(key);
                return (
                  <GroupRow
                    key={key}
                    group={g}
                    open={open}
                    onToggle={() => toggle(key)}
                    month={month}
                    search={search}
                    onRowClick={onRowClick}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {!isLoading && groups.length > 0 && (
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          {groups.length} zone group{groups.length === 1 ? "" : "s"} · {totalSales} sales in{" "}
          {formatMonth(month)}
        </div>
      )}
    </Card>
  );
}

function GroupRow({
  group,
  open,
  onToggle,
  month,
  search,
  onRowClick,
}: {
  group: SalesGroup;
  open: boolean;
  onToggle: () => void;
  month: string;
  search?: string;
  onRowClick: (r: SalesRecord) => void;
}) {
  return (
    <>
      <TableRow onClick={onToggle} className="cursor-pointer">
        <TableCell className="w-10">
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
        </TableCell>
        <TableCell className="border-r border-border font-medium">{group.zoneName}</TableCell>
        <TableCell className="border-r border-border">
          <ZoneTypeBadge type={group.salesType} />
        </TableCell>
        <TableCell className="border-r border-border text-right font-mono tabular-nums" style={mono}>
          {group.count}
        </TableCell>
        <TableCell className="text-right font-mono font-medium tabular-nums" style={mono}>
          {inr(group.totalPlanAmount)}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="bg-muted/30 p-0">
            <GroupSalesRows group={group} month={month} search={search} onRowClick={onRowClick} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// Lazy per-group drill-down: fetched only when the group is expanded, via the
// existing row-level list endpoint filtered to this zone+type.
function GroupSalesRows({
  group,
  month,
  search,
  onRowClick,
}: {
  group: SalesGroup;
  month: string;
  search?: string;
  onRowClick: (r: SalesRecord) => void;
}) {
  const [page, setPage] = useState(1);
  const rows = useSalesList({
    month,
    zone: group.zoneName,
    salesType: group.salesType,
    search,
    sortBy: "billDate",
    sortOrder: "asc",
    page,
    pageSize: ROWS_PAGE,
  });

  const total = rows.data?.total ?? group.count;
  const totalPages = Math.max(1, Math.ceil(total / ROWS_PAGE));

  if (rows.isLoading) {
    return <div className="px-12 py-4 text-sm text-muted-foreground">Loading sales…</div>;
  }

  return (
    <div className="px-4 py-2 sm:px-12">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1.5 font-medium">Bill date</th>
            <th className="py-1.5 font-medium">Customer</th>
            <th className="py-1.5 font-medium">Plan</th>
            <th className="py-1.5 text-right font-medium">Plan amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.data?.items.map((r) => (
            <tr
              key={r.id}
              onClick={(e) => {
                e.stopPropagation();
                onRowClick(r);
              }}
              className="cursor-pointer border-t border-border/60 hover:bg-muted/40"
            >
              <td className="py-2 pr-4 whitespace-nowrap">
                {r.billDate ? new Date(r.billDate).toLocaleDateString("en-IN") : "—"}
              </td>
              <td className="max-w-[220px] truncate py-2 pr-4">
                {r.userName || r.customerName || "—"}
              </td>
              <td className="max-w-[260px] truncate py-2 pr-4">{r.planName || "—"}</td>
              <td className="py-2 text-right font-mono tabular-nums" style={mono}>
                {inr(r.planAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between border-t border-border/60 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} sales
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
