"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, FilterX, FileDown } from "lucide-react";
import { useSalesMonths, useSalesGrouped, useSalesFilterOptions } from "@/hooks/use-sales";
import { useDebounce } from "@/hooks/use-debounce";
import { PageHeader } from "@/components/page-header";
import { GroupedSalesTable } from "@/components/sales/grouped-sales-table";
import { SalesDetailSheet } from "@/components/sales/sales-detail-sheet";
import { ExportSalesDialog } from "@/components/sales/export-sales-dialog";
import { inr, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SalesRecord, ZoneType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__"; // shadcn Select forbids empty-string item values

const mono = { fontFamily: "var(--font-geist-mono)" } as const;

export default function SalesSummaryPage() {
  const [month, setMonth] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [zone, setZone] = useState(ALL);
  const [salesType, setSalesType] = useState(ALL);
  const [sortBy, setSortBy] = useState("zoneName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<SalesRecord | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const months = useSalesMonths();

  // Default to the newest uploaded month once the list arrives.
  useEffect(() => {
    if (!month && months.data?.length) setMonth(months.data[0].month);
  }, [month, months.data]);

  const filterOptions = useSalesFilterOptions(month);
  // One entry per zone+type; the expanded per-zone rows are fetched lazily
  // inside GroupedSalesTable.
  const grouped = useSalesGrouped({
    month,
    search: search || undefined,
    zone: zone === ALL ? undefined : zone,
    salesType: salesType === ALL ? undefined : (salesType as ZoneType),
  });

  const hasFilters = searchInput !== "" || zone !== ALL || salesType !== ALL;

  const clearFilters = () => {
    setSearchInput("");
    setZone(ALL);
    setSalesType(ALL);
  };

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const sortHeader = (label: string, key: string, alignRight?: boolean) => {
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

  // Client-side sort over the (bounded) group list.
  const sortedGroups = useMemo(() => {
    const groups = [...(grouped.data?.groups ?? [])];
    const dir = sortOrder === "asc" ? 1 : -1;
    groups.sort((a, b) => {
      if (sortBy === "count") return (a.count - b.count) * dir;
      if (sortBy === "totalPlanAmount") return (a.totalPlanAmount - b.totalPlanAmount) * dir;
      return a.zoneName.localeCompare(b.zoneName) * dir || a.salesType.localeCompare(b.salesType);
    });
    return groups;
  }, [grouped.data?.groups, sortBy, sortOrder]);

  const totalPlanAmount = grouped.data?.totalPlanAmount ?? 0;
  const noUploads = months.isSuccess && months.data.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Summary"
        description="Month-wise sales rows with their zone and plan amount."
      >
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <FileDown className="h-4 w-4" /> Export Excel
        </Button>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="mb-1.5 block text-sm text-muted-foreground">Month</Label>
          <Select value={month} onValueChange={setMonth} disabled={noUploads}>
            <SelectTrigger className="w-[170px]">
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

        <div>
          <Label className="mb-1.5 block text-sm text-muted-foreground">Type</Label>
          <Select value={salesType} onValueChange={setSalesType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL}>All types</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="RENEWAL">Renewal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <FilterSelect
          label="Zone"
          value={zone}
          onChange={setZone}
          options={filterOptions.data?.zones}
          allLabel="All zones"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5">
            <FilterX className="mr-1 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1 basis-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search zone or plan…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Grand total across ALL matching rows (not just this page). */}
        <div className="rounded-md border border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total plan amount:</span>{" "}
          <span className="font-mono font-semibold tabular-nums" style={mono}>
            {inr(totalPlanAmount)}
          </span>
        </div>
      </div>

      <GroupedSalesTable
        // Remount on filter change so open groups collapse with the new set.
        key={`${month}|${salesType}|${zone}|${search}`}
        groups={sortedGroups}
        isLoading={grouped.isLoading || (months.isLoading && !month)}
        emptyMessage={
          noUploads
            ? "No sales uploaded yet. Upload a monthly sheet under Sales Sheets."
            : "No sales records match the current filters."
        }
        month={month}
        search={search || undefined}
        sortHeader={sortHeader}
        onRowClick={setSelected}
      />

      <SalesDetailSheet record={selected} onOpenChange={(o) => !o && setSelected(null)} />
      <ExportSalesDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  width = "w-[200px]",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  allLabel: string;
  width?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={width}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options?.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
