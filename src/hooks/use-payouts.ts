"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  PageMeta,
  PayoutStatus,
  RecordPaymentInput,
  VendorLedger,
  VendorPayoutSummary,
} from "@/lib/types";

type PayoutListFilters = {
  search?: string;
  status?: PayoutStatus | "";
  month?: string;
  page?: number;
  pageSize?: number;
};

interface PayoutListData {
  items: VendorPayoutSummary[];
  totals: { totalCommission: number; totalPaid: number; totalPending: number };
}

export function useVendorPayouts(filters: PayoutListFilters) {
  return useQuery({
    queryKey: ["payouts", filters],
    queryFn: async () => {
      const r = await api.get<PayoutListData>("/payouts/vendors", filters);
      return { ...r.data, meta: r.meta as PageMeta };
    },
    placeholderData: (prev) => prev,
  });
}

// Distinct months with approved calculations (for the payouts month filter).
export function usePayoutMonths() {
  return useQuery({
    queryKey: ["payout-months"],
    queryFn: () => api.get<string[]>("/payouts/months").then((r) => r.data),
  });
}

const invalidatePayoutData = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["payouts"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["calculations"] });
};

// Vendor ledger: payout details, receipts and the running ledger.
export function useVendorLedger(vendorId: string) {
  return useQuery({
    queryKey: ["payouts", "ledger", vendorId],
    queryFn: () => api.get<VendorLedger>(`/payouts/vendors/${vendorId}/ledger`).then((r) => r.data),
    enabled: !!vendorId,
  });
}

// Build the multipart body for a receipt (optional attachment).
function receiptForm(input: RecordPaymentInput & { attachment?: File | null }): FormData {
  const form = new FormData();
  form.append("paidAmount", String(input.paidAmount));
  form.append("paymentDate", input.paymentDate);
  form.append("paymentMode", input.paymentMode);
  if (input.paymentReference) form.append("paymentReference", input.paymentReference);
  if (input.notes) form.append("notes", input.notes);
  if (input.attachment) form.append("attachment", input.attachment);
  return form;
}

export function useRecordReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { calculationId: string; attachment?: File | null } & RecordPaymentInput) => {
      const { calculationId, ...rest } = input;
      return api.upload(`/payouts/calculations/${calculationId}/payments`, receiptForm(rest)).then((r) => r.data);
    },
    onSuccess: () => invalidatePayoutData(qc),
  });
}

export function useUpdateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { paymentId: string; attachment?: File | null } & RecordPaymentInput) => {
      const { paymentId, ...rest } = input;
      return api.uploadPatch(`/payouts/payments/${paymentId}`, receiptForm(rest)).then((r) => r.data);
    },
    onSuccess: () => invalidatePayoutData(qc),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => api.del(`/payouts/payments/${paymentId}`),
    onSuccess: () => invalidatePayoutData(qc),
  });
}

// Binary downloads (auth header attached by api.download). Fetchers return
// the raw blob so pages can preview in-app (DocumentViewerDialog) or save.
export async function fetchReceiptPdf(paymentId: string) {
  return api.download(`/payouts/payments/${paymentId}/receipt`);
}

export async function fetchReceiptAttachment(paymentId: string) {
  return api.download(`/payouts/payments/${paymentId}/attachment`);
}

export async function downloadLedgerPdf(vendorId: string, vendorName: string) {
  const blob = await api.download(`/payouts/vendors/${vendorId}/ledger/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Ledger_${vendorName.replace(/[^\w]+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPayoutsCsv() {
  const blob = await api.download(`/payouts/export`);
  return URL.createObjectURL(blob);
}
