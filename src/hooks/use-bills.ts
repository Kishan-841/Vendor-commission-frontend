"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Bill, Paginated } from "@/lib/types";

export function useBills(filters: { page?: number; pageSize?: number; vendorId?: string; month?: string } = {}) {
  return useQuery({
    queryKey: ["bills", filters],
    queryFn: async () => {
      const r = await api.get<Bill[]>("/bills", filters);
      return { items: r.data, meta: r.meta } as Paginated<Bill>;
    },
  });
}

export function useBill(id: string | undefined) {
  return useQuery({
    queryKey: ["bill", id],
    enabled: !!id,
    queryFn: () => api.get<Bill>(`/bills/${id}`).then((r) => r.data),
  });
}

export function useGenerateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (calculationId: string) =>
      api.post<Bill>("/bills", { calculationId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["calculations"] });
    },
  });
}

// Fetch the PDF blob (with auth) and trigger a browser download.
export async function downloadBillPdf(bill: Bill) {
  const blob = await api.download(`/bills/${bill.id}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bill.billNumber.replace(/[\\/]/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
