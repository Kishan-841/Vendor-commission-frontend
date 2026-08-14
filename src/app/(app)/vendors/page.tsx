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
import { DataTable } from "@/components/data-table";
import { ApiError } from "@/lib/api";
import { inr, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
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

// Hard cap for zone names in the zones dropdown so long names can't push the
// commission % out of view. Full name stays available via title tooltip.
const shortZone = (name: string) =>
  name.length > 20 ? `${name.slice(0, 20).trimEnd()}…` : name;

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
              {/* Company is the primary line; vendor (person) sits under it.
                  Vendors without a company fall back to the vendor name on top. */}
              <div className="font-medium">{v.companyName || v.vendorName}</div>
              {v.companyName && (
                <div className="text-sm text-muted-foreground">{v.vendorName}</div>
              )}
            </div>
          );
        },
      },
      {
        header: "Zones",
        cell: ({ row }) => {
          // Renewal first, then New — same convention as the vendor form.
          const assignments = [...(row.original.zoneAssignments ?? [])].sort((a, b) =>
            a.zoneType === b.zoneType ? 0 : a.zoneType === "RENEWAL" ? -1 : 1,
          );
          if (assignments.length === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          // Zones inline in the cell (no dropdown), one compact line each.
          return (
            <div className="space-y-0.5 py-0.5">
              {assignments.map((a) => (
                <div
                  key={`${a.zoneId}-${a.zoneType}`}
                  className="flex items-center gap-1.5 whitespace-nowrap text-xs"
                  title={a.zone?.name}
                >
                  <span
                    className={cn(
                      "rounded-full border px-1.5 text-[10px] font-medium leading-4",
                      a.zoneType === "NEW"
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-cyan/10 text-cyan border-cyan/30",
                    )}
                  >
                    {a.zoneType === "NEW" ? "New" : "Ren"}
                  </span>
                  <span>
                    {shortZone(a.zone?.name ?? "—")}{" "}
                    <span className="font-medium">· {pct(a.commissionPercentage)}</span>
                  </span>
                </div>
              ))}
            </div>
          );
        },
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
        header: "Fixed Pay",
        meta: { className: "text-right" },
        cell: ({ row }) =>
          row.original.fixedPayEnabled && row.original.fixedPayAmount ? (
            <span>{inr(row.original.fixedPayAmount)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
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
