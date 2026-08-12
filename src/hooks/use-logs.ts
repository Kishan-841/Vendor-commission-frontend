"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditLogEntry, LogFilterOptions, Paginated } from "@/lib/types";

export interface LogFilters {
  page: number;
  pageSize: number;
  userId?: string;
  action?: string;
  entityType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useLogs(filters: LogFilters) {
  return useQuery({
    queryKey: ["logs", filters],
    queryFn: async () => {
      const r = await api.get<AuditLogEntry[]>("/logs", { ...filters });
      return { items: r.data, meta: r.meta } as Paginated<AuditLogEntry>;
    },
    // Keep showing the previous page while the next one loads.
    placeholderData: (prev) => prev,
  });
}

export function useLogFilterOptions() {
  return useQuery({
    queryKey: ["log-filters"],
    queryFn: () => api.get<LogFilterOptions>("/logs/filters").then((r) => r.data),
  });
}
