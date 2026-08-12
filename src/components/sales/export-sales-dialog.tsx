"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import toast from "react-hot-toast";
import { useSalesMonths, downloadSalesExport } from "@/hooks/use-sales";
import { useVendorOptions } from "@/hooks/use-vendors";
import { formatMonth } from "@/lib/format";
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

// Export a two-sheet Excel workbook (Sales Summary + Sales Zone Data) for a
// chosen vendor + month. A vendor's sales are the rows in its assigned zones.
export function ExportSalesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const months = useSalesMonths();
  const vendors = useVendorOptions();
  const [month, setMonth] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setMonth("");
      setVendorId("");
      setBusy(false);
    }
  }, [open]);

  const run = async () => {
    if (!month) return toast.error("Select a month");
    if (!vendorId) return toast.error("Select a vendor");
    const vendor = vendors.data?.find((v) => v.id === vendorId);
    const fileName = `Sales_${(vendor?.vendorName ?? "vendor").replace(/[^\w]+/g, "_")}_${month}.xlsx`;
    setBusy(true);
    try {
      await downloadSalesExport(month, vendorId, fileName);
      toast.success("Export downloaded");
      onOpenChange(false);
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Excel</DialogTitle>
          <DialogDescription>
            Download a workbook for one vendor and month — a <b>Sales Summary</b> sheet plus a{" "}
            <b>Sales Zone Data</b> sheet with every matching record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId} disabled={vendors.isLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={vendors.isLoading ? "Loading vendors…" : "Select a vendor"} />
              </SelectTrigger>
              <SelectContent position="popper">
                {(vendors.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Month</Label>
            <Select value={month} onValueChange={setMonth} disabled={months.isLoading}>
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
            {months.isSuccess && months.data.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                No sales sheets uploaded yet.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={run} disabled={busy || !month || !vendorId}>
            <FileDown className="mr-1.5 h-4 w-4" />
            {busy ? "Exporting…" : "Download Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
