"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, Vendor } from "@/lib/types";

// `type` (not `interface`) so it gets TS's implicit index signature and is
// assignable to the api client's Record<string, …> query param.
export type VendorFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: "createdAt" | "vendorName";
  sortDir?: "asc" | "desc";
};

export function useVendors(filters: VendorFilters = {}) {
  return useQuery({
    queryKey: ["vendors", filters],
    queryFn: async () => {
      const r = await api.get<Vendor[]>("/vendors", filters);
      return { items: r.data, meta: r.meta } as Paginated<Vendor>;
    },
  });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ["vendor", id],
    enabled: !!id,
    queryFn: () => api.get<Vendor>(`/vendors/${id}`).then((r) => r.data),
  });
}

// Lightweight list for dropdowns (active vendors).
export function useVendorOptions() {
  return useQuery({
    queryKey: ["vendor-options"],
    queryFn: () =>
      api.get<Vendor[]>("/vendors", { pageSize: 100, status: "ACTIVE" }).then((r) => r.data),
  });
}

export function useSaveVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; data: Record<string, unknown> }) =>
      input.id
        ? api.patch<Vendor>(`/vendors/${input.id}`, input.data).then((r) => r.data)
        : api.post<Vendor>("/vendors", input.data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
      qc.invalidateQueries({ queryKey: ["vendor-options"] });
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/vendors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
}
