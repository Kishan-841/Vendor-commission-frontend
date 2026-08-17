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

export interface VendorCommissionZoneLine {
  zoneName: string;
  zoneType: "NEW" | "RENEWAL" | null;
  commissionPercentage: number;
  baseAmount: number;
  commissionAmount: number;
}

export interface VendorCommissionRow {
  calculationId: string;
  vendorName: string;
  companyName: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  totalSales: number;
  agrAmount: number;
  zones: VendorCommissionZoneLine[];
  grossCommission: number;
  fixedPayAmount: number;
  gstAmount: number;
  tdsAmount: number;
  roundOff: number;
  finalPayable: number;
}

export interface VendorCommissionReport {
  month: string;
  rows: VendorCommissionRow[];
  // Month-wide totals (all pages).
  totals: {
    totalSales: number;
    agrAmount: number;
    grossCommission: number;
    fixedPayAmount: number;
    gstAmount: number;
    tdsAmount: number;
    finalPayable: number;
  };
  total: number;
  page: number;
  pageSize: number;
}

export function useVendorCommissionReport(
  month: string,
  status?: string,
  page = 1,
  pageSize = 25,
) {
  return useQuery({
    queryKey: ["vendor-commission", month, status, page, pageSize],
    queryFn: () =>
      api
        .get<VendorCommissionReport>("/reports/vendor-commission", { month, status, page, pageSize })
        .then((r) => r.data),
    enabled: !!month,
    placeholderData: (prev) => prev,
  });
}

// Exports ALL vendors for the month/status filter, regardless of pagination.
export async function downloadVendorCommissionExport(month: string, status?: string) {
  const params = new URLSearchParams({ month });
  if (status) params.set("status", status);
  const blob = await api.download(`/reports/vendor-commission/export?${params}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Vendor_Commission_${month}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
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
