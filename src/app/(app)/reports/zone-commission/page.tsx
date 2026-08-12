"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";
import type { ColumnDef } from "@tanstack/react-table";
import { useSalesMonths } from "@/hooks/use-sales";
import { useZoneCommissionReport, downloadZoneCommissionExport } from "@/hooks/use-reports";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { inr, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ZoneCommissionRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mono = { fontFamily: "var(--font-geist-mono)" } as const;
const pct2 = (n: number) => `${n.toFixed(2)}%`;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="py-4">
      <CardContent className="px-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums" style={mono}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

type SortKey = "zone" | "totalSales" | "commissionPercentage" | "commissionAmount" | "totalOrders";

export default function ZoneCommissionPage() {
  const months = useSalesMonths();
  const [month, setMonth] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("commissionAmount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exporting, setExporting] = useState(false);

  // Default to the newest month once months load.
  useEffect(() => {
    if (!month && months.data?.length) setMonth(months.data[0].month);
  }, [month, months.data]);

  const report = useZoneCommissionReport(month);

  // Client-side sort (one row per zone — small dataset).
  const rows = useMemo(() => {
    const list = [...(report.data?.rows ?? [])];
    const dir = sortOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortBy === "zone") return a.zone.localeCompare(b.zone) * dir;
      return (a[sortBy] - b[sortBy]) * dir;
    });
    return list;
  }, [report.data, sortBy, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortOrder(key === "zone" ? "asc" : "desc");
    }
  };

  const sortHeader = (label: string, key: SortKey, alignRight?: boolean) => {
    const active = sortBy === key;
    const Icon = active ? (sortOrder === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-primary",
          alignRight && "flex-row-reverse",
          active && "text-primary",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  const exportXlsx = async () => {
    if (!month) return;
    setExporting(true);
    try {
      await downloadZoneCommissionExport(month);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<ColumnDef<ZoneCommissionRow, unknown>[]>(
    () => {
      const money = (v: number) => (
        <span className="font-mono tabular-nums" style={mono}>
          {inr(v)}
        </span>
      );
      return [
        {
          id: "zone",
          header: () => sortHeader("Zone", "zone"),
          accessorKey: "zone",
          cell: ({ row }) => <span className="font-medium">{row.original.zone}</span>,
        },
        {
          id: "totalSales",
          header: () => sortHeader("Total Sales", "totalSales", true),
          size: 150,
          meta: { className: "text-right" },
          cell: ({ row }) => money(row.original.totalSales),
        },
        {
          id: "commissionPercentage",
          header: () => sortHeader("Commission %", "commissionPercentage", true),
          size: 130,
          meta: { className: "text-right" },
          cell: ({ row }) => (
            <span className="tabular-nums" style={mono}>
              {pct2(row.original.commissionPercentage)}
            </span>
          ),
        },
        {
          id: "commissionAmount",
          header: () => sortHeader("Commission", "commissionAmount", true),
          size: 150,
          meta: { className: "text-right" },
          cell: ({ row }) => money(row.original.commissionAmount),
        },
        {
          id: "totalOrders",
          header: () => sortHeader("Orders", "totalOrders", true),
          size: 100,
          meta: { className: "text-right" },
          cell: ({ row }) => (
            <span className="tabular-nums">{row.original.totalOrders.toLocaleString("en-IN")}</span>
          ),
        },
        {
          id: "averageOrderValue",
          header: "Avg Order Value",
          size: 150,
          meta: { className: "text-right" },
          cell: ({ row }) => money(row.original.averageOrderValue),
        },
      ];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortOrder],
  );

  const summary = report.data?.summary;
  const noUploads = months.isSuccess && months.data.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zone-wise Commission"
        description="Sales and commission per zone for the selected month."
      >
        <Button variant="outline" onClick={exportXlsx} disabled={exporting || !month}>
          <FileDown className="h-4 w-4" /> {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </PageHeader>

      <div>
        <Label className="mb-1.5 block text-sm text-muted-foreground">Month</Label>
        <Select value={month} onValueChange={setMonth} disabled={noUploads}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent position="popper">
            {months.data?.map((m) => (
              <SelectItem key={m.month} value={m.month}>
                {formatMonth(m.month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Zones" value={summary?.totalZones ?? 0} />
        <StatCard label="Total Sales" value={inr(summary?.totalSales ?? 0)} />
        <StatCard label="Total Commission" value={inr(summary?.totalCommission ?? 0)} />
        <StatCard label="Avg Commission %" value={pct2(summary?.averageCommissionPercentage ?? 0)} />
        <StatCard label="Total Orders" value={(summary?.totalOrders ?? 0).toLocaleString("en-IN")} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={report.isLoading || (months.isLoading && !month)}
        emptyMessage={
          noUploads
            ? "No sales uploaded yet. Upload a monthly sheet under Sales Sheets."
            : "No commission data available for the selected month."
        }
      />
    </div>
  );
}
