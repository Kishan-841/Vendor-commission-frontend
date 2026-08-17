"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api";
import type {
  SalesFilterOptions,
  SalesListFilters,
  SalesMonth,
  SalesRecord,
  SalesUpload,
  UploadResult,
  VendorForMonth,
  VendorCalcResult,
  BulkGenerateResult,
  ZoneType,
} from "@/lib/types";

// Months that have an uploaded sales sheet (newest first) — drives the picker.
export function useSalesMonths() {
  return useQuery({
    queryKey: ["sales-months"],
    queryFn: () => api.get<SalesMonth[]>("/sales/months").then((r) => r.data),
  });
}

// ── Tab 1: Upload management ────────────────────────────────────────────────

export function useSalesUploads() {
  return useQuery({
    queryKey: ["sales-uploads"],
    queryFn: () => api.get<SalesUpload[]>("/sales/uploads").then((r) => r.data),
  });
}

const invalidateSales = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["sales-uploads"] });
  qc.invalidateQueries({ queryKey: ["sales-months"] });
  qc.invalidateQueries({ queryKey: ["sales"] });
  qc.invalidateQueries({ queryKey: ["sales-filters"] });
};

// Upload a monthly sheet for one type (New/Renewal). `replace` (admin)
// overwrites an existing (month, type). On a 409 the caller can re-issue with
// replace=true after confirming.
export function useUploadSalesSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { month: string; salesType: ZoneType; file: File; replace?: boolean }) => {
      const form = new FormData();
      form.append("month", input.month);
      form.append("salesType", input.salesType);
      form.append("file", input.file);
      if (input.replace) form.append("replace", "true");
      return api.upload<UploadResult>("/sales/uploads", form).then((r) => r.data);
    },
    onSuccess: () => invalidateSales(qc),
  });
}

export function useUnlockUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/sales/uploads/${id}/unlock`),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useLockUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/sales/uploads/${id}/lock`),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useDeleteUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/sales/uploads/${id}`),
    onSuccess: () => invalidateSales(qc),
  });
}

export async function downloadUpload(id: string, fileName: string) {
  const blob = await api.download(`/sales/uploads/${id}/file`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Tab 2: Calculations from a stored sheet ─────────────────────────────────

// Active vendors for the month's calculation dropdown (enabled only once a
// sheet exists for that month).
export function useVendorsForMonth(month: string, enabled: boolean) {
  return useQuery({
    queryKey: ["vendors-for-month", month],
    queryFn: () =>
      api.get<VendorForMonth[]>("/calculations/vendors-for-month", { month }).then((r) => r.data),
    enabled: enabled && !!month,
  });
}

const invalidateCalcs = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["calculations"] });
  qc.invalidateQueries({ queryKey: ["vendors-for-month"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
};

export function useGenerateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { month: string; vendorId: string }) =>
      api.post<VendorCalcResult>("/calculations/generate-vendor", input).then((r) => r.data),
    onSuccess: () => invalidateCalcs(qc),
  });
}

// Calculate a selected set of vendors at once.
export function useGenerateVendors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { month: string; vendorIds: string[] }) =>
      api.post<BulkGenerateResult>("/calculations/generate-vendors", input).then((r) => r.data),
    onSuccess: () => invalidateCalcs(qc),
  });
}

export function useGenerateAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { month: string }) =>
      api.post<BulkGenerateResult>("/calculations/generate-all", input).then((r) => r.data),
    onSuccess: () => invalidateCalcs(qc),
  });
}

// Download the vendor + month Excel workbook (two sheets).
export async function downloadSalesExport(month: string, vendorId: string, fileName: string) {
  const blob = await api.download(
    `/sales/export?month=${encodeURIComponent(month)}&vendorId=${encodeURIComponent(vendorId)}`,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// Re-export so pages can narrow on 409 (replace confirmation).
export { ApiError };

interface SalesListResult {
  items: SalesRecord[];
  total: number;
  totalPlanAmount: number;
  page: number;
  pageSize: number;
}

export function useSalesList(filters: SalesListFilters) {
  return useQuery({
    queryKey: ["sales", filters],
    queryFn: () => api.get<SalesListResult>("/sales", filters).then((r) => r.data),
    enabled: !!filters.month,
    placeholderData: (prev) => prev, // keep the table steady while refetching
  });
}

export interface SalesGroup {
  zoneName: string;
  salesType: "NEW" | "RENEWAL";
  count: number;
  totalPlanAmount: number;
}

interface SalesGroupedResult {
  groups: SalesGroup[];
  totalPlanAmount: number;
}

export type SalesGroupedFilters = {
  month: string;
  search?: string;
  salesType?: "NEW" | "RENEWAL";
  zone?: string;
};

// Zone+type aggregated summary; the per-row drill-down uses useSalesList
// with a zone filter when a group is expanded.
export function useSalesGrouped(filters: SalesGroupedFilters) {
  return useQuery({
    queryKey: ["sales-grouped", filters],
    queryFn: () => api.get<SalesGroupedResult>("/sales/grouped", filters).then((r) => r.data),
    enabled: !!filters.month,
    placeholderData: (prev) => prev,
  });
}

// Distinct zones/operators/sites/statuses within a month, for filter dropdowns.
export function useSalesFilterOptions(month: string) {
  return useQuery({
    queryKey: ["sales-filters", month],
    queryFn: () => api.get<SalesFilterOptions>("/sales/filters", { month }).then((r) => r.data),
    enabled: !!month,
  });
}
