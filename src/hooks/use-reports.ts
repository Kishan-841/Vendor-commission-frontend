"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ZoneCommissionReport } from "@/lib/types";

export function useZoneCommissionReport(month: string) {
  return useQuery({
    queryKey: ["zone-commission", month],
    queryFn: () =>
      api.get<ZoneCommissionReport>("/reports/zone-commission", { month }).then((r) => r.data),
    enabled: !!month,
    placeholderData: (prev) => prev,
  });
}

export async function downloadZoneCommissionExport(month: string) {
  const blob = await api.download(`/reports/zone-commission/export?month=${encodeURIComponent(month)}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Zone_Commission_${month}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
