"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Calculator } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useCalculations } from "@/hooks/use-calculations";
import { useRole } from "@/components/app-shell";
import { CreateCalculationDialog } from "@/components/calculations/create-calculation-dialog";
import { CalculateDialog } from "@/components/calculations/calculate-dialog";
import { PageHeader } from "@/components/page-header";
import { CalcStatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { inr, formatMonth } from "@/lib/format";
import type { Calculation, CalculationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: (CalculationStatus | "ALL")[] = ["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];
// Rows-per-page choices; backend caps pageSize at 100.
const PAGE_SIZES = [10, 25, 50, 75, 100];

export default function CalculationsPage() {
  const isAdmin = useRole() === "ADMIN";
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);

  // New filter or page size ⇒ back to the first page.
  useEffect(() => {
    setPage(1);
  }, [status, pageSize]);

  const { data, isLoading } = useCalculations({
    status: status === "ALL" ? undefined : status,
    page,
    pageSize,
  });

  const columns = useMemo<ColumnDef<Calculation, unknown>[]>(
    () => [
      {
        header: "Vendor",
        cell: ({ row }) => {
          const v = row.original.vendor;
          if (!v) return <span className="text-muted-foreground">—</span>;
          // Company is the primary line, vendor (person) under it — same as
          // the vendors table.
          return (
            <div>
              <div className="font-medium">{v.companyName || v.vendorName}</div>
              {v.companyName && (
                <div className="text-sm text-muted-foreground">{v.vendorName}</div>
              )}
            </div>
          );
        },
      },
      {
        header: "Month",
        cell: ({ row }) => formatMonth(row.original.month),
      },
      {
        header: "Total sales",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="font-mono">{inr(row.original.totalSales)}</span>
        ),
      },
      {
        header: "Gross comm.",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="font-mono">{inr(row.original.grossCommission)}</span>
        ),
      },
      {
        header: "Final payable",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="font-mono font-medium">{inr(row.original.finalPayable)}</span>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => <CalcStatusBadge status={row.original.status} />,
      },
      {
        id: "view",
        header: "",
        size: 80,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <Link
            href={`/calculations/${row.original.id}`}
            className="text-primary hover:underline"
          >
            View
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Calculations" description="Commission calculations and their approval status.">
        {isAdmin && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Manual
          </Button>
        )}
        <Button onClick={() => setGenOpen(true)}>
          <Calculator className="h-4 w-4" /> Calculate
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="max-w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Show
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          per page
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No calculations yet."
        page={data?.meta.page ?? page}
        pageSize={data?.meta.pageSize ?? pageSize}
        total={data?.meta.total ?? 0}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <CreateCalculationDialog open={open} onOpenChange={setOpen} />
      <CalculateDialog open={genOpen} onOpenChange={setGenOpen} />
    </div>
  );
}
