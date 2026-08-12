"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Download } from "lucide-react";
import toast from "react-hot-toast";
import type { ColumnDef } from "@tanstack/react-table";
import { useVendorPayouts, usePayoutMonths, downloadPayoutsCsv } from "@/hooks/use-payouts";
import { useDebounce } from "@/hooks/use-debounce";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { PayoutStatusBadge } from "@/components/payouts/payout-status-badge";
import { inr, formatDate, formatMonth } from "@/lib/format";
import type { PayoutStatus, VendorPayoutSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 20;
const ALL = "__all__";

const mono = { fontFamily: "var(--font-geist-mono)" } as const;

function TotalCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="py-4">
      <CardContent className="px-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)} style={mono}>
          {inr(value)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function VendorPayoutsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [status, setStatus] = useState(ALL);
  const [month, setMonth] = useState(ALL);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const months = usePayoutMonths();

  useEffect(() => {
    setPage(1);
  }, [search, status, month]);

  const payouts = useVendorPayouts({
    search: search || undefined,
    status: status === ALL ? undefined : (status as PayoutStatus),
    month: month === ALL ? undefined : month,
    page,
    pageSize: PAGE_SIZE,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const url = await downloadPayoutsCsv();
      const a = document.createElement("a");
      a.href = url;
      a.download = "vendor-payouts.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<ColumnDef<VendorPayoutSummary, unknown>[]>(
    () => [
      {
        id: "vendor",
        header: "Vendor",
        cell: ({ row }) => (
          <div className="leading-tight">
            <div className="font-medium">{row.original.vendorName}</div>
            {row.original.companyName && (
              <div className="truncate text-sm text-muted-foreground">{row.original.companyName}</div>
            )}
          </div>
        ),
      },
      {
        id: "calcs",
        header: "Calculations",
        size: 110,
        meta: { className: "text-right" },
        cell: ({ row }) => <span className="tabular-nums">{row.original.calculationCount}</span>,
      },
      {
        id: "total",
        header: "Total Commission",
        size: 150,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="tabular-nums" style={mono}>
            {inr(row.original.totalCommission)}
          </span>
        ),
      },
      {
        id: "paid",
        header: "Paid",
        size: 130,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="tabular-nums text-success" style={mono}>
            {inr(row.original.totalPaid)}
          </span>
        ),
      },
      {
        id: "pending",
        header: "Pending",
        size: 130,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span
            className={cn("tabular-nums", row.original.totalPending > 0 && "text-warning")}
            style={mono}
          >
            {inr(row.original.totalPending)}
          </span>
        ),
      },
      {
        id: "lastPayment",
        header: "Last Payment",
        size: 130,
        cell: ({ row }) =>
          row.original.lastPaymentDate ? formatDate(row.original.lastPaymentDate) : "—",
      },
      {
        id: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => <PayoutStatusBadge status={row.original.paymentStatus} />,
      },
    ],
    [],
  );

  const totals = payouts.data?.totals;
  const meta = payouts.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Payouts"
        description="Track approved commissions per vendor and record payments as they are settled."
      >
        <Button variant="outline" onClick={exportCsv} disabled={exporting}>
          <Download className="mr-1.5 h-4 w-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <TotalCard label="Total Commission (approved)" value={totals?.totalCommission ?? 0} />
        <TotalCard label="Total Paid" value={totals?.totalPaid ?? 0} tone="text-success" />
        <TotalCard label="Outstanding" value={totals?.totalPending ?? 0} tone="text-warning" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 basis-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            <SelectItem value={ALL}>All months</SelectItem>
            {(months.data ?? []).map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonth(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={payouts.data?.items ?? []}
        isLoading={payouts.isLoading}
        emptyMessage="No approved commissions yet. Payouts appear once calculations are approved."
        page={meta?.page ?? page}
        pageSize={meta?.pageSize ?? PAGE_SIZE}
        total={meta?.total ?? 0}
        totalPages={meta?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(v) => router.push(`/payouts/${v.vendorId}`)}
      />
    </div>
  );
}
