"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useCalculations } from "@/hooks/use-calculations";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { inr, formatMonth } from "@/lib/format";
import type { Calculation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PAGE_SIZE = 10;

export default function ApprovalsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCalculations({ status: "SUBMITTED", page, pageSize: PAGE_SIZE });

  const columns = useMemo<ColumnDef<Calculation, unknown>[]>(
    () => [
      {
        header: "Vendor",
        cell: ({ row }) => <span className="font-medium">{row.original.vendor?.vendorName}</span>,
      },
      {
        header: "Month",
        cell: ({ row }) => formatMonth(row.original.month),
      },
      {
        header: "Total sales",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="font-mono">{inr(row.original.totalSales)}</span>
        ),
      },
      {
        header: "Final payable",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="font-mono font-medium">{inr(row.original.finalPayable)}</span>
        ),
      },
      {
        id: "review",
        header: "",
        size: 112,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <Button size="sm" asChild>
            <Link href={`/calculations/${row.original.id}`}>Review</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  const isEmpty = !isLoading && (data?.items.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Calculations awaiting review. Open one to approve or reject with remarks."
      />

      {isEmpty ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            🎉 Nothing pending. All submitted calculations have been reviewed.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading}
          emptyMessage="Nothing pending."
          page={data?.meta.page ?? page}
          pageSize={data?.meta.pageSize ?? PAGE_SIZE}
          total={data?.meta.total ?? 0}
          totalPages={data?.meta.totalPages ?? 1}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
