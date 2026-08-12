"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { ColumnDef } from "@tanstack/react-table";
import { useVendors, useDeleteVendor } from "@/hooks/use-vendors";
import { useDebounce } from "@/hooks/use-debounce";
import { useRole } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { VendorStatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { ApiError } from "@/lib/api";
import { pct } from "@/lib/format";
import type { Vendor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 10;

export default function VendorsPage() {
  const role = useRole();
  const isAdmin = role === "ADMIN";
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Vendor | null>(null);

  // New search term ⇒ back to the first page.
  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading } = useVendors({ search, page, pageSize: PAGE_SIZE });
  const del = useDeleteVendor();

  const confirmDelete = () => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Vendor deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed"),
    });
  };

  const columns = useMemo<ColumnDef<Vendor, unknown>[]>(() => {
    const cols: ColumnDef<Vendor, unknown>[] = [
      {
        header: "Vendor",
        cell: ({ row }) => {
          const v = row.original;
          return (
            <div>
              <div className="font-medium">{v.vendorName}</div>
              {v.companyName && (
                <div className="text-sm text-muted-foreground">{v.companyName}</div>
              )}
            </div>
          );
        },
      },
      {
        header: "Contact",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.email || row.original.mobileNumber || "—"}
          </span>
        ),
      },
      {
        header: "AGR",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span>{row.original.agrApplicable ? pct(row.original.agrPercentage) : "—"}</span>
        ),
      },
      {
        header: "TDS",
        meta: { className: "text-right" },
        cell: ({ row }) => <span>{pct(row.original.tdsPercentage)}</span>,
      },
      {
        header: "GST",
        cell: ({ row }) =>
          row.original.gstNumber ? (
            <Badge variant="outline" className="text-xs">
              GST
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => <VendorStatusBadge status={row.original.status} />,
      },
    ];

    if (isAdmin) {
      cols.push({
        id: "actions",
        header: "Actions",
        size: 96,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/vendors/${row.original.id}/edit`} aria-label="Edit vendor">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      });
    }

    return cols;
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" description="Manage broadband vendors and their tax details.">
        {isAdmin && (
          <Button asChild>
            <Link href="/vendors/new">
              <Plus className="h-4 w-4" /> New vendor
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors by name, email or PAN…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No vendors found."
        page={data?.meta.page ?? page}
        pageSize={data?.meta.pageSize ?? PAGE_SIZE}
        total={data?.meta.total ?? 0}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <span className="font-medium">{deleting?.vendorName}</span>. Vendors with
              calculations or bills can&apos;t be deleted — deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={del.isPending}>
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
