"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import toast from "react-hot-toast";
import { useCalculationMonths } from "@/hooks/use-calculations";
import { useVendorCommissionReport, downloadVendorCommissionExport } from "@/hooks/use-reports";
import { PageHeader } from "@/components/page-header";
import { CalcStatusBadge, ZoneTypeBadge } from "@/components/status-badge";
import { inr, formatMonth } from "@/lib/format";
import type { CalculationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mono = { fontFamily: "var(--font-geist-mono)" } as const;
const STATUSES: (CalculationStatus | "ALL")[] = ["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];
const PAGE_SIZE = 25;

// Right-aligned money cell.
function Money({ value, bold }: { value: number; bold?: boolean }) {
  return (
    <span className={bold ? "font-mono font-semibold tabular-nums" : "font-mono tabular-nums"} style={mono}>
      {inr(value)}
    </span>
  );
}

export default function VendorCommissionReportPage() {
  const months = useCalculationMonths();
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Default to the newest month that has calculations.
  useEffect(() => {
    if (!month && months.data?.length) setMonth(months.data[0]);
  }, [month, months.data]);

  // Filter change ⇒ back to the first page.
  useEffect(() => {
    setPage(1);
  }, [month, status]);

  const report = useVendorCommissionReport(
    month,
    status === "ALL" ? undefined : status,
    page,
    PAGE_SIZE,
  );
  const rows = report.data?.rows ?? [];
  const totals = report.data?.totals;
  const total = report.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const noMonths = months.isSuccess && months.data.length === 0;

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadVendorCommissionExport(month, status === "ALL" ? undefined : status);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const headCls = "h-11 whitespace-nowrap font-medium text-foreground border-r border-border";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Report"
        description="Per-vendor commission breakdown for a month — zones, rates, taxes, and final payable."
      >
        <Button variant="outline" onClick={onExport} disabled={exporting || !month || rows.length === 0}>
          <FileDown className="h-4 w-4" /> {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="mb-1.5 block text-sm text-muted-foreground">Month</Label>
          <Select value={month} onValueChange={setMonth} disabled={noMonths}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent position="popper">
              {months.data?.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL" ? "All statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0 gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1180px]">
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60 border-b border-border">
                <TableHead className={headCls}>Vendor</TableHead>
                <TableHead className={headCls}>Zones</TableHead>
                <TableHead className={`${headCls} text-right`}>Zone sales</TableHead>
                <TableHead className={`${headCls} text-right`}>Commission</TableHead>
                <TableHead className={`${headCls} text-right`}>AGR</TableHead>
                <TableHead className={`${headCls} text-right`}>Fixed pay</TableHead>
                <TableHead className={`${headCls} text-right`}>Total comm.</TableHead>
                <TableHead className={`${headCls} text-right`}>GST</TableHead>
                <TableHead className={`${headCls} text-right`}>TDS</TableHead>
                <TableHead className="h-11 whitespace-nowrap font-medium text-foreground text-right">
                  Final payable
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.isLoading || (months.isLoading && !month) ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    {noMonths
                      ? "No calculations yet — generate them under Calculations."
                      : "No calculations match the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.calculationId} className="align-top">
                    <TableCell className="border-r border-border">
                      <div className="font-medium">{r.companyName || r.vendorName}</div>
                      {r.companyName && (
                        <div className="text-sm text-muted-foreground">{r.vendorName}</div>
                      )}
                      <div className="mt-1">
                        <CalcStatusBadge status={r.status} />
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-border">
                      <div className="space-y-1.5">
                        {r.zones.map((z, i) => (
                          <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                            <span className="max-w-[200px] truncate">{z.zoneName}</span>
                            {z.zoneType && <ZoneTypeBadge type={z.zoneType} />}
                            <span className="text-muted-foreground">{z.commissionPercentage}%</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-border text-right">
                      <div className="space-y-1.5">
                        {r.zones.map((z, i) => (
                          <div key={i}>
                            <Money value={z.baseAmount} />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-border text-right">
                      <div className="space-y-1.5">
                        {r.zones.map((z, i) => (
                          <div key={i}>
                            <Money value={z.commissionAmount} />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-border text-right">
                      <Money value={r.agrAmount} />
                    </TableCell>
                    <TableCell className="border-r border-border text-right">
                      <Money value={r.fixedPayAmount} />
                    </TableCell>
                    <TableCell className="border-r border-border text-right">
                      <Money value={r.grossCommission} bold />
                    </TableCell>
                    <TableCell className="border-r border-border text-right">
                      <Money value={r.gstAmount} />
                    </TableCell>
                    <TableCell className="border-r border-border text-right">
                      <Money value={r.tdsAmount} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={r.finalPayable} bold />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totals && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 border-t border-border px-4 py-3 text-sm">
            {/* Month-wide totals across ALL pages, not just the visible one. */}
            <span className="text-muted-foreground">
              {total} vendor{total === 1 ? "" : "s"} · {formatMonth(month)}
            </span>
            <span>
              Total comm. <Money value={totals.grossCommission} bold />
            </span>
            <span>
              Fixed pay <Money value={totals.fixedPayAmount} bold />
            </span>
            <span>
              GST <Money value={totals.gstAmount} bold />
            </span>
            <span>
              TDS <Money value={totals.tdsAmount} bold />
            </span>
            <span>
              Final payable <Money value={totals.finalPayable} bold />
            </span>
          </div>
        )}
        {rows.length > 0 && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
