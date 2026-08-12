"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, X, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { useRecordReceipt, useUpdateReceipt } from "@/hooks/use-payouts";
import { ApiError } from "@/lib/api";
import { inr, formatMonth, num } from "@/lib/format";
import type { LedgerPayout, LedgerReceipt, PaymentMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODES: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "UPI", label: "UPI" },
  { value: "OTHER", label: "Other" },
];

const today = () => new Date().toISOString().slice(0, 10);

// Receipt Entry form — records a receipt against one of the vendor's payouts
// (months). Doubles as the edit form when `editing` is set.
export function ReceiptEntryForm({
  vendorName,
  payouts,
  editing,
  onDone,
}: {
  vendorName: string;
  payouts: LedgerPayout[];
  editing: LedgerReceipt | null;
  onDone: () => void;
}) {
  const record = useRecordReceipt();
  const update = useUpdateReceipt();

  const [calculationId, setCalculationId] = useState("");
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState<PaymentMode>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const isEdit = !!editing;

  // Load the editing receipt (or reset for a fresh entry).
  useEffect(() => {
    if (editing) {
      setCalculationId(editing.calculationId);
      setDate(editing.paymentDate.slice(0, 10));
      setMode(editing.paymentMode);
      setReference(editing.paymentReference ?? "");
      setAmount(String(editing.amount));
      setRemarks(editing.notes ?? "");
      setAttachment(null);
    } else {
      setCalculationId("");
      setDate(today());
      setMode("BANK_TRANSFER");
      setReference("");
      setAmount("");
      setRemarks("");
      setAttachment(null);
    }
  }, [editing]);

  const selectedPayout = useMemo(
    () => payouts.find((p) => p.calculationId === calculationId),
    [payouts, calculationId],
  );

  // Max receipt amount: the payout's outstanding, plus this receipt's own
  // amount when editing (since it's excluded from "already paid").
  const maxAmount = selectedPayout
    ? selectedPayout.outstanding + (isEdit ? num(editing!.amount) : 0)
    : undefined;

  const clearFields = () => {
    setCalculationId("");
    setDate(today());
    setMode("BANK_TRANSFER");
    setReference("");
    setAmount("");
    setRemarks("");
    setAttachment(null);
  };

  const reset = () => {
    if (!isEdit) clearFields();
    onDone();
  };

  const submit = () => {
    if (!calculationId) return toast.error("Select a payout (month)");
    const paid = Number(amount);
    if (!Number.isFinite(paid) || paid <= 0) return toast.error("Enter a valid amount");
    if (maxAmount !== undefined && paid > maxAmount + 0.005)
      return toast.error(`Amount exceeds outstanding (${inr(maxAmount)})`);
    if (!date) return toast.error("Select the receipt date");

    const payload = {
      paidAmount: paid,
      paymentDate: date,
      paymentMode: mode,
      paymentReference: reference || undefined,
      notes: remarks || undefined,
      attachment,
    };

    const onOk = () => {
      toast.success(isEdit ? "Receipt updated" : "Receipt saved");
      if (!isEdit) clearFields();
      onDone();
    };
    const onErr = (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to save receipt");

    if (isEdit) update.mutate({ paymentId: editing!.id, ...payload }, { onSuccess: onOk, onError: onErr });
    else record.mutate({ calculationId, ...payload }, { onSuccess: onOk, onError: onErr });
  };

  const busy = record.isPending || update.isPending;

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-6">
        <CardTitle className="text-base font-medium">
          {isEdit ? `Edit receipt ${editing!.receiptNumber ?? ""}` : "Receipt Entry"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Vendor (read-only) */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Vendor</Label>
            <Input value={vendorName} readOnly className="bg-muted/40" />
          </div>

          {/* Payout / month */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Payout (month)</Label>
            <Select value={calculationId} onValueChange={setCalculationId} disabled={isEdit}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payout" />
              </SelectTrigger>
              <SelectContent position="popper">
                {payouts.map((p) => (
                  <SelectItem key={p.calculationId} value={p.calculationId} disabled={!isEdit && p.outstanding <= 0}>
                    {formatMonth(p.month)} · due {inr(p.outstanding)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zone (read-only, from payout) */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Zone</Label>
            <Input
              value={selectedPayout ? selectedPayout.zones.join(", ") || "—" : "—"}
              readOnly
              className="bg-muted/40"
            />
          </div>

          {/* Receipt date */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Receipt date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Receipt number (auto) */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Receipt number</Label>
            <Input value={editing?.receiptNumber ?? "Auto-generated"} readOnly className="bg-muted/40" />
          </div>

          {/* Payment mode */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Payment mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Reference number</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn / cheque no." />
          </div>

          {/* Amount */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">
              Amount received (₹){maxAmount !== undefined ? ` · max ${inr(maxAmount)}` : ""}
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>

          {/* Attachment */}
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">
              Attachment{isEdit && editing?.hasAttachment ? " (replace)" : ""}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                className="file:mr-2 file:text-sm"
              />
              {attachment && <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <Label className="mb-1.5 block text-sm text-muted-foreground">Remarks</Label>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Optional notes…" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={reset} disabled={busy}>
            <X className="mr-1 h-4 w-4" /> {isEdit ? "Cancel" : "Clear"}
          </Button>
          <Button onClick={submit} disabled={busy}>
            <Save className="mr-1 h-4 w-4" />
            {busy ? "Saving…" : isEdit ? "Update receipt" : "Save receipt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
