"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useVendorOptions, useVendor } from "@/hooks/use-vendors";
import { useCreateCalculation } from "@/hooks/use-calculations";
import { ApiError } from "@/lib/api";
import { inr, num } from "@/lib/format";
import { ZoneTypeBadge } from "@/components/status-badge";
import type { ZoneType } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ZoneRow {
  zoneId: string;
  zoneType: ZoneType;
  name: string;
  selected: boolean;
  commissionPercentage: string;
}

const rowKey = (zoneId: string, type: ZoneType) => `${zoneId}|${type}`;

export function CreateCalculationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const vendors = useVendorOptions();
  const create = useCreateCalculation();

  const [vendorId, setVendorId] = useState("");
  const [month, setMonth] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [rows, setRows] = useState<ZoneRow[]>([]);

  // Full vendor (with zone assignments + their commission %) for the picker.
  const vendorDetail = useVendor(vendorId || undefined);
  const vendor = vendors.data?.find((v) => v.id === vendorId);

  // Prefill the rows from the vendor's assignments — all selected, % from setup.
  useEffect(() => {
    const assignments = vendorDetail.data?.zoneAssignments ?? [];
    setRows(
      assignments.map((a) => ({
        zoneId: a.zoneId,
        zoneType: a.zoneType,
        name: a.zone?.name ?? "Zone",
        selected: true,
        commissionPercentage: String(a.commissionPercentage),
      })),
    );
  }, [vendorDetail.data]);

  useEffect(() => {
    if (!open) {
      setVendorId("");
      setMonth("");
      setBillingPeriod("");
      setTotalSales("");
      setRows([]);
    }
  }, [open]);

  // Live client-side preview of the same math the backend performs.
  const preview = useMemo(() => {
    const sales = num(totalSales || 0);
    const agr = vendor?.agrApplicable ? (sales * num(vendor.agrPercentage)) / 100 : 0;
    const afterAgr = sales - agr;
    const gross = rows
      .filter((r) => r.selected)
      .reduce((s, r) => s + (afterAgr * num(r.commissionPercentage || 0)) / 100, 0);
    const gstRate = vendor?.gstNumber ? 18 : 0;
    // Fixed pay joins the base before taxes: GST/TDS apply to gross + fixed pay.
    const fixedPay = vendor?.fixedPayEnabled ? num(vendor.fixedPayAmount ?? 0) : 0;
    const taxBase = gross + fixedPay;
    const gst = (taxBase * gstRate) / 100;
    const tds = (taxBase * num(vendor?.tdsPercentage ?? 0)) / 100;
    return { agr, afterAgr, gross, gst, tds, fixedPay, final: taxBase + gst - tds, gstRate };
  }, [totalSales, rows, vendor]);

  const toggle = (key: string, selected: boolean) =>
    setRows((rs) => rs.map((r) => (rowKey(r.zoneId, r.zoneType) === key ? { ...r, selected } : r)));
  const setPct = (key: string, val: string) =>
    setRows((rs) => rs.map((r) => (rowKey(r.zoneId, r.zoneType) === key ? { ...r, commissionPercentage: val } : r)));

  const submit = () => {
    const selected = rows.filter((r) => r.selected);
    if (!vendorId) return toast.error("Select a vendor");
    if (!/^\d{4}-\d{2}$/.test(month)) return toast.error("Select a month");
    if (num(totalSales) <= 0) return toast.error("Enter total sales");
    if (selected.length === 0) return toast.error("Select at least one zone");
    if (selected.some((r) => num(r.commissionPercentage) <= 0))
      return toast.error("Enter a commission % for each selected zone");

    create.mutate(
      {
        vendorId,
        month,
        billingPeriod: billingPeriod || undefined,
        totalSales: num(totalSales),
        zones: selected.map((r) => ({
          zoneId: r.zoneId,
          zoneType: r.zoneType,
          commissionPercentage: num(r.commissionPercentage),
        })),
      },
      {
        onSuccess: (calc) => {
          toast.success("Calculation created");
          onOpenChange(false);
          router.push(`/calculations/${calc.id}`);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to create"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New commission calculation</DialogTitle>
          <DialogDescription>
            AGR, TDS and GST come from the vendor. The vendor&apos;s assigned zones and their
            commission % are prefilled below (editable for this calculation).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm text-muted-foreground">Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Choose vendor…" /></SelectTrigger>
                <SelectContent>
                  {vendors.data?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm text-muted-foreground">Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm text-muted-foreground">Total sales (₹)</Label>
              <Input type="number" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="e.g. 100000" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm text-muted-foreground">Billing period (optional)</Label>
              <Input value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value)} placeholder="e.g. 01 Jul – 31 Jul 2026" />
            </div>
          </div>

          {vendor && (
            <div className="flex flex-wrap gap-4 rounded-md bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
              <span>AGR: {vendor.agrApplicable ? `${num(vendor.agrPercentage)}%` : "—"}</span>
              <span>TDS: {num(vendor.tdsPercentage)}%</span>
              <span>GST: {vendor.gstNumber ? "18%" : "not applicable"}</span>
            </div>
          )}

          {vendorId && (
            <div className="rounded-md border border-border">
              <div className="border-b border-border px-4 py-2 text-base font-medium">Assigned zones</div>
              <div className="max-h-64 divide-y divide-border overflow-y-auto">
                {rows.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    This vendor has no assigned zones. Assign zones on the vendor first.
                  </div>
                )}
                {rows.map((r) => {
                  const key = rowKey(r.zoneId, r.zoneType);
                  return (
                    <div key={key} className="flex items-center gap-3 px-4 py-2">
                      <Checkbox checked={r.selected} onCheckedChange={(v) => toggle(key, !!v)} />
                      <span className="flex-1 text-[15px]">{r.name}</span>
                      <ZoneTypeBadge type={r.zoneType} />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={r.commissionPercentage}
                          onChange={(e) => setPct(key, e.target.value)}
                          disabled={!r.selected}
                          className="h-8 w-20 text-right"
                          placeholder="%"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live preview */}
          <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-4 text-sm sm:grid-cols-3">
            <PreviewCell label="AGR amount" value={inr(preview.agr)} />
            <PreviewCell label="Sales after AGR" value={inr(preview.afterAgr)} />
            <PreviewCell label="Gross commission" value={inr(preview.gross)} />
            {preview.fixedPay > 0 && (
              <PreviewCell label="Fixed vendor pay" value={"+ " + inr(preview.fixedPay)} />
            )}
            <PreviewCell label={`GST (${preview.gstRate}%)`} value={inr(preview.gst)} />
            <PreviewCell label="TDS" value={"- " + inr(preview.tds)} />
            <PreviewCell label="Final payable" value={inr(preview.final)} highlight />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create calculation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div
        className={
          highlight
            ? "text-xl font-semibold text-primary font-mono tabular-nums"
            : "text-[15px] font-medium font-mono tabular-nums"
        }
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        {value}
      </div>
    </div>
  );
}
