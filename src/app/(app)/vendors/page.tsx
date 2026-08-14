"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Search, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { ColumnDef } from "@tanstack/react-table";
import { useVendors, useDeleteVendor } from "@/hooks/use-vendors";
import { useDebounce } from "@/hooks/use-debounce";
import { useRole } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ZoneTypeBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { ApiError } from "@/lib/api";
import { inr, pct } from "@/lib/format";
import type { Vendor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 font-normal">
                  {assignments.length} {assignments.length === 1 ? "zone" : "zones"}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 max-h-72 overflow-y-auto">
                {assignments.map((a) => (
                  <div
                    key={`${a.zoneId}-${a.zoneType}`}
                    className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm"
                  >
                    <span className="whitespace-nowrap" title={a.zone?.name}>
                      {shortZone(a.zone?.name ?? "—")}{" "}
                      <span className="font-medium">· {pct(a.commissionPercentage)}</span>
                    </span>
                    <ZoneTypeBadge type={a.zoneType} />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
