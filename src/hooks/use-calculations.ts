"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Approval, Calculation, Paginated } from "@/lib/types";

// `type` (not `interface`) so it gets TS's implicit index signature and is
// assignable to the api client's Record<string, …> query param.
export type CalcFilters = {
  page?: number;
  pageSize?: number;
  vendorId?: string;
  status?: string;
  month?: string;
  search?: string;
};

export function useCalculations(filters: CalcFilters = {}) {
  return useQuery({
    queryKey: ["calculations", filters],
    queryFn: async () => {
      const r = await api.get<Calculation[]>("/calculations", filters);
      return { items: r.data, meta: r.meta } as Paginated<Calculation>;
    },
  });
}

export function useCalculation(id: string | undefined) {
  return useQuery({
    queryKey: ["calculation", id],
    enabled: !!id,
    queryFn: () => api.get<Calculation>(`/calculations/${id}`).then((r) => r.data),
  });
}

export function useApprovalHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["approvals", id],
    enabled: !!id,
    queryFn: () => api.get<Approval[]>(`/calculations/${id}/approvals`).then((r) => r.data),
  });
}

export interface CreateCalcInput {
  vendorId: string;
  month: string;
  billingPeriod?: string;
  totalSales: number;
  zones: { zoneId: string; zoneType: "NEW" | "RENEWAL"; commissionPercentage: number }[];
}

// Sheet upload + per-vendor / bulk calculation now live in use-sales.ts
// (the two-tab flow: upload once, then calculate from the stored sheet).

export function useCreateCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalcInput) =>
      api.post<Calculation>("/calculations", input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calculations"] }),
  });
}

export function useDeleteCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/calculations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calculations"] }),
  });
}

// Best-effort bulk delete: locked (SUBMITTED/APPROVED) rows come back in
// `skippedIds` instead of failing the whole batch.
// Bulk workflow transitions: eligible rows move, the rest come back as skipped.
export function useBulkSubmitCalculations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api
        .post<{ updatedCount: number; skippedIds: string[] }>("/calculations/bulk-submit", { ids })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calculations"] }),
  });
}

export function useBulkApproveCalculations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api
        .post<{ updatedCount: number; skippedIds: string[] }>("/calculations/bulk-approve", { ids })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calculations"] }),
  });
}

export function useBulkDeleteCalculations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api
        .post<{ deletedCount: number; skippedIds: string[] }>("/calculations/bulk-delete", { ids })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calculations"] }),
  });
}

// Workflow transitions. `action` maps to POST /calculations/:id/{action}.
export function useWorkflowAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; action: "submit" | "approve" | "reject"; remarks?: string }) =>
      api.post<Calculation>(`/calculations/${input.id}/${input.action}`, { remarks: input.remarks }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["calculations"] });
      qc.invalidateQueries({ queryKey: ["calculation", vars.id] });
      qc.invalidateQueries({ queryKey: ["approvals", vars.id] });
    },
  });
}
