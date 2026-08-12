"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import toast from "react-hot-toast";
import {
  useSalesMonths,
  useVendorsForMonth,
  useGenerateVendors,
  useGenerateAll,
  ApiError,
} from "@/hooks/use-sales";
import { useRole } from "@/components/app-shell";
import { VendorMultiSelect } from "@/components/calculations/vendor-multi-select";
import { inr, formatMonth } from "@/lib/format";
import type { BulkGenerateResult } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tab-2 flow: pick a month that has an uploaded sheet, pick one or more vendors,
// and calculate them from the stored sheet. Admins can also calculate every
// matching vendor at once.
export function CalculateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isAdmin = useRole() === "ADMIN";
  const months = useSalesMonths();
  const generateVendors = useGenerateVendors();
  const generateAll = useGenerateAll();

  const [month, setMonth] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkGenerateResult | null>(null);

  const vendors = useVendorsForMonth(month, open);

  useEffect(() => {
    if (!open) {
      setMonth("");
      setSelected(new Set());
      setResult(null);
    }
  }, [open]);

  // Reset selection + result when the month changes.
  useEffect(() => {
    setSelected(new Set());
    setResult(null);
  }, [month]);

  const monthChosen = /^\d{4}-\d{2}$/.test(month);
  const sheetExists = months.data?.some((m) => m.month === month) ?? false;
  const vendorOptions = useMemo(() => vendors.data ?? [], [vendors.data]);
  const allCalculated =
    vendorOptions.length > 0 && vendorOptions.every((v) => v.alreadyCalculated);

  const calcSelected = () => {
    if (selected.size === 0) return toast.error("Select at least one vendor");
    generateVendors.mutate(
      { month, vendorIds: [...selected] },
      {
        onSuccess: (res) => {
          setResult(res);
          toast.success(`Created ${res.created.length} calculation(s)`);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Calculation failed"),
      },
    );
  };

  const calcAll = () => {
    generateAll.mutate(
      { month },
      {
        onSuccess: (res) => {
          setResult(res);
          toast.success(`Created ${res.created.length} calculation(s)`);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Bulk calc failed"),
      },
    );
  };

  const busy = generateVendors.isPending || generateAll.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Calculate commission</DialogTitle>
          <DialogDescription>
            Pick a month that already has an uploaded sales sheet, then one or more vendors. Each
            selected vendor&apos;s commission is calculated from the stored sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: month */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent position="popper">
                {(months.data ?? []).map((m) => (
                  <SelectItem key={m.month} value={m.month}>
                    {formatMonth(m.month)} · {m.rowCount.toLocaleString("en-IN")} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* No sheet for the chosen month */}
          {monthChosen && !sheetExists && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                No sales sheet uploaded for this month.{" "}
                <Link href="/sales-sheets" className="underline">
                  Upload it first
                </Link>
                .
              </span>
            </div>
          )}

          {/* Step 2: vendors (searchable multi-select, enabled once a sheet exists) */}
          {monthChosen && sheetExists && !result && (
            <div>
              <Label className="mb-1.5 block text-sm text-muted-foreground">Vendors</Label>
              {allCalculated ? (
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  Every active vendor already has a calculation for this month.
                </div>
              ) : (
                <VendorMultiSelect
                  vendors={vendorOptions}
                  selected={selected}
                  onChange={setSelected}
                  loading={vendors.isLoading}
                />
              )}
            </div>
          )}

          {/* Result */}
          {result && <ResultView result={result} />}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {/* Admin bulk option */}
          {isAdmin && monthChosen && sheetExists && !result ? (
            <Button variant="outline" onClick={calcAll} disabled={busy}>
              <Layers className="mr-1.5 h-4 w-4" />
              {generateAll.isPending ? "Calculating…" : "Calculate all matching"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {result ? "Done" : "Close"}
            </Button>
            {!result && (
              <Button onClick={calcSelected} disabled={busy || !sheetExists || selected.size === 0}>
                {generateVendors.isPending
                  ? "Calculating…"
                  : `Calculate ${selected.size || ""} vendor${selected.size === 1 ? "" : "s"}`.trim()}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultView({ result }: { result: BulkGenerateResult }) {
  return (
    <div className="space-y-3 rounded-md border border-success/30 bg-success/10 p-4">
      <div className="flex items-center gap-2 font-medium text-success">
        <CheckCircle2 className="h-5 w-5" /> {result.created.length} calculation(s) created for{" "}
        {formatMonth(result.month)}
      </div>
      {result.created.length > 0 && (
        <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border bg-card">
          {result.created.map((c) => (
            <div
              key={c.calculationId}
              className="flex items-center justify-between px-3 py-1.5 text-sm"
            >
              <span>{c.vendorName}</span>
              <span className="tabular-nums" style={{ fontFamily: "var(--font-geist-mono)" }}>
                {inr(c.finalPayable)}
              </span>
            </div>
          ))}
        </div>
      )}
      {(result.skippedExisting.length > 0 || result.vendorsWithoutMatchingZones > 0) && (
        <p className="text-xs text-muted-foreground">
          {result.skippedExisting.length > 0 &&
            `Skipped ${result.skippedExisting.length} already calculated. `}
          {result.vendorsWithoutMatchingZones > 0 &&
            `${result.vendorsWithoutMatchingZones} selected vendor(s) had no matching sales.`}
        </p>
      )}
    </div>
  );
}
