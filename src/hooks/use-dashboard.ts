"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";

export function useDashboardStats(months: 6 | 12, month?: string) {
  return useQuery({
    queryKey: ["dashboard", months, month ?? "all"],
    queryFn: () =>
      api.get<DashboardStats>("/dashboard/stats", { months, month }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}
