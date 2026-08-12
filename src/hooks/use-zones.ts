"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, Zone, ZoneUpload } from "@/lib/types";

// Master zone list (single list; optionally filtered by search).
export function useZones(filters: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["zones", filters],
    queryFn: async () => {
      const r = await api.get<Zone[]>("/zones", filters);
      return { items: r.data, meta: r.meta } as Paginated<Zone>;
    },
  });
}

// All master zones (up to 500) — used by the vendor form's zone picker.
export function useMasterZones() {
  return useQuery({
    queryKey: ["master-zones"],
    queryFn: () => api.get<Zone[]>("/zones", { pageSize: 500 }).then((r) => r.data),
  });
}

export function useZoneUploads() {
  return useQuery({
    queryKey: ["zone-uploads"],
    queryFn: () => api.get<ZoneUpload[]>("/zones/uploads").then((r) => r.data),
  });
}

export function useUploadZones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; replace: boolean }) => {
      const form = new FormData();
      form.append("file", input.file);
      form.append("replace", String(input.replace));
      return api
        .upload<{ uploadId: string; rowCount: number; columns: string[] }>("/zones/upload", form)
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zones"] });
      qc.invalidateQueries({ queryKey: ["master-zones"] });
      qc.invalidateQueries({ queryKey: ["zone-uploads"] });
    },
  });
}

// Create a single master zone by name.
export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Zone>("/zones", { name }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zones"] });
      qc.invalidateQueries({ queryKey: ["master-zones"] });
    },
  });
}

export function useRenameZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      api.patch<Zone>(`/zones/${input.id}`, { name: input.name }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zones"] });
      qc.invalidateQueries({ queryKey: ["master-zones"] });
    },
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/zones/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zones"] });
      qc.invalidateQueries({ queryKey: ["master-zones"] });
    },
  });
}
