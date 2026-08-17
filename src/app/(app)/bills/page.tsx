"use client";

import { useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import toast from "react-hot-toast";
import type { ColumnDef } from "@tanstack/react-table";
import { useBills, downloadBillPdf, fetchBillPdf } from "@/hooks/use-bills";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { DocumentViewerDialog, type ViewerDoc } from "@/components/document-viewer";
import { ApiError } from "@/lib/api";
import { inr, formatMonth, formatDateTime } from "@/lib/format";
import type { Bill } from "@/lib/types";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

export default function BillsPage() {
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<ViewerDoc | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { data, isLoading } = useBills({ page, pageSize: PAGE_SIZE });

  const download = async (bill: Bill) => {
    try {
      await downloadBillPdf(bill);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Download failed");
    }
  };

  const view = async (bill: Bill) => {
    setLoadingId(bill.id);
    try {
      const { blob, fileName } = await fetchBillPdf(bill);
      setViewing({ title: `Bill ${bill.billNumber}`, fileName, blob });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bill");
    } finally {
      setLoadingId(null);
    }
  };

  const columns = useMemo<ColumnDef<Bill, unknown>[]>(
    () => [
      {
        header: "Bill number",
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.billNumber}</span>
        ),
      },
      {
        header: "Vendor",
        cell: ({ row }) => row.original.vendor?.vendorName,
      },
      {
        header: "Month",
        cell: ({ row }) => formatMonth(row.original.billingMonth),
      },
      {
        header: "Gross",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="font-mono">{inr(row.original.grossCommission)}</span>
        ),
      },
      {
        header: "GST",
        meta: { className: "text-right" },
        cell: ({ row }) => <span className="font-mono">{inr(row.original.gstAmount)}</span>,
      },
      {
        header: "TDS",
        meta: { className: "text-right" },
        cell: ({ row }) => <span className="font-mono">{inr(row.original.tdsAmount)}</span>,
      },
      {
        header: "Final payable",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="font-mono font-medium">{inr(row.original.finalPayable)}</span>
        ),
      },
      {
        header: "Generated",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDateTime(row.original.generatedAt)}
          </span>
        ),
      },
      {
        id: "download",
        header: "",
        size: 150,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              title="View bill"
              disabled={loadingId === row.original.id}
              onClick={() => view(row.original)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => download(row.original)}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadingId drives the eye button state
    [loadingId],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Bills" description="Generated commission bills. Download or print the PDF." />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No bills generated yet."
        page={data?.meta.page ?? page}
        pageSize={data?.meta.pageSize ?? PAGE_SIZE}
        total={data?.meta.total ?? 0}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <DocumentViewerDialog doc={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}
