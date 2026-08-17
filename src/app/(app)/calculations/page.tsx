"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Calculator, Check, Search, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useCalculations,
  useCalculationMonths,
  useBulkDeleteCalculations,
  useBulkSubmitCalculations,
  useBulkApproveCalculations,
} from "@/hooks/use-calculations";
import { useDebounce } from "@/hooks/use-debounce";
import { useRole } from "@/components/app-shell";
import { CreateCalculationDialog } from "@/components/calculations/create-calculation-dialog";
import { CalculateDialog } from "@/components/calculations/calculate-dialog";
import { PageHeader } from "@/components/page-header";
import { CalcStatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { inr, formatMonth } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { Calculation, CalculationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: (CalculationStatus | "ALL")[] = ["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];
// Rows-per-page choices; backend caps pageSize at 100.
const PAGE_SIZES = [10, 25, 50, 75, 100];

// Which rows a role can act on in bulk: ADMIN can act on ANY status (submit
// DRAFT/REJECTED, approve SUBMITTED, delete anything — approved deletes also
// remove the bill + receipts); FINANCE can only approve SUBMITTED.
const isSelectable = (c: Calculation, isAdmin: boolean) =>
  isAdmin ? true : c.status === "SUBMITTED";

export default function CalculationsPage() {
  const isAdmin = useRole() === "ADMIN";
  const [status, setStatus] = useState<string>("ALL");
  const [month, setMonth] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  const months = useCalculationMonths();

  // New filter, search or page size ⇒ back to the first page.
  useEffect(() => {
    setPage(1);
  }, [status, month, search, pageSize]);

  // Selection only ever refers to rows the user can currently see — clear it
  // whenever the visible slice changes so a delete can't hit off-screen rows.
  useEffect(() => {
    setSelected(new Set());
  }, [status, month, search, page, pageSize]);

  const { data, isLoading } = useCalculations({
    status: status === "ALL" ? undefined : status,
    month: month === "ALL" ? undefined : month,
    search: search || undefined,
    page,
    pageSize,
  });

  const bulkDelete = useBulkDeleteCalculations();
  const bulkSubmit = useBulkSubmitCalculations();
  const bulkApprove = useBulkApproveCalculations();
  const items = data?.items ?? [];
  const pageSelectableIds = items.filter((c) => isSelectable(c, isAdmin)).map((c) => c.id);
  const allSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selected.has(id));

  // Per-action subsets of the selection (each button acts only on the rows in
  // the right state; the backend would skip the rest anyway).
  const byStatus = (statuses: Calculation["status"][]) =>
    items.filter((c) => selected.has(c.id) && statuses.includes(c.status)).map((c) => c.id);
  const submitIds = byStatus(["DRAFT", "REJECTED"]);
  const approveIds = byStatus(["SUBMITTED"]);
  // Every selected row is deletable (admin); the backend cascades bills/receipts.
  const deleteIds = isAdmin ? [...selected] : [];

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const doBulkSubmit = () => {
    bulkSubmit.mutate(submitIds, {
      onSuccess: (res) => {
        setSelected(new Set());
        toast.success(
          res.skippedIds.length > 0
            ? `Submitted ${res.updatedCount}, skipped ${res.skippedIds.length}`
            : `Submitted ${res.updatedCount} calculation${res.updatedCount === 1 ? "" : "s"} for approval`,
        );
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Submit failed"),
    });
  };

  const doBulkApprove = () => {
    bulkApprove.mutate(approveIds, {
      onSuccess: (res) => {
        setApproveConfirmOpen(false);
        setSelected(new Set());
        toast.success(
          res.skippedIds.length > 0
            ? `Approved ${res.updatedCount}, skipped ${res.skippedIds.length}`
            : `Approved ${res.updatedCount} calculation${res.updatedCount === 1 ? "" : "s"}`,
        );
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Approve failed"),
    });
  };

  const confirmDelete = () => {
    bulkDelete.mutate(deleteIds, {
      onSuccess: (res) => {
        setConfirmOpen(false);
        setSelected(new Set());
        if (res.skippedIds.length > 0) {
          toast.success(
            `Deleted ${res.deletedCount}, skipped ${res.skippedIds.length} (locked or already removed)`,
          );
        } else {
          toast.success(`Deleted ${res.deletedCount} calculation${res.deletedCount === 1 ? "" : "s"}`);
        }
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed"),
    });
  };

  const columns = useMemo<ColumnDef<Calculation, unknown>[]>(
    () => [
      // Selection column for bulk actions. ADMIN can tick anything not yet
      // approved (submit/approve/delete); FINANCE only SUBMITTED (approve).
      // The disabled checkbox's title explains why a row can't be ticked.
      {
        id: "select",
        size: 44,
        header: () => (
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) =>
              setSelected(v === true ? new Set(pageSelectableIds) : new Set())
            }
            aria-label="Select all actionable calculations on this page"
          />
        ),
        cell: ({ row }) => {
          const selectable = isSelectable(row.original, isAdmin);
          return (
            <span
              title={selectable ? undefined : "Only submitted calculations can be approved"}
            >
              <Checkbox
                checked={selected.has(row.original.id)}
                disabled={!selectable}
                onCheckedChange={(v) => toggleRow(row.original.id, v === true)}
                aria-label="Select calculation"
              />
            </span>
          );
        },
      },
      {
        header: "Vendor",
        cell: ({ row }) => {
          const v = row.original.vendor;
          if (!v) return <span className="text-muted-foreground">—</span>;
          // Company is the primary line, vendor (person) under it — same as
          // the vendors table.
          return (
            <div>
              <div className="font-medium">{v.companyName || v.vendorName}</div>
              {v.companyName && (
                <div className="text-sm text-muted-foreground">{v.vendorName}</div>
              )}
            </div>
          );
        },
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
        header: "Gross comm.",
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <span className="font-mono">{inr(row.original.grossCommission)}</span>
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
        header: "Status",
        cell: ({ row }) => <CalcStatusBadge status={row.original.status} />,
      },
      {
        id: "view",
        header: "",
        size: 80,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <Link
            href={`/calculations/${row.original.id}`}
            className="text-primary hover:underline"
          >
            View
          </Link>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pageDeletableIds is derived fresh each render; selected/allSelected drive the checkboxes
    [isAdmin, selected, allSelected, items],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Calculations" description="Commission calculations and their approval status.">
        {isAdmin && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Manual
          </Button>
        )}
        <Button onClick={() => setGenOpen(true)}>
          <Calculator className="h-4 w-4" /> Calculate
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendor or company…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="max-w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL" ? "All statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="max-w-[170px]">
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All months</SelectItem>
              {months.data?.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && submitIds.length > 0 && (
            <Button onClick={doBulkSubmit} disabled={bulkSubmit.isPending}>
              <Send className="h-4 w-4" /> Submit ({submitIds.length})
            </Button>
          )}
          {approveIds.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setApproveConfirmOpen(true)}
              disabled={bulkApprove.isPending}
            >
              <Check className="h-4 w-4" /> Approve ({approveIds.length})
            </Button>
          )}
          {isAdmin && deleteIds.length > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete ({deleteIds.length})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Show
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          per page
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No calculations yet."
        page={data?.meta.page ?? page}
        pageSize={data?.meta.pageSize ?? pageSize}
        total={data?.meta.total ?? 0}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <CreateCalculationDialog open={open} onOpenChange={setOpen} />
      <CalculateDialog open={genOpen} onOpenChange={setGenOpen} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteIds.length} calculation{deleteIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected calculations and their zone breakdowns.
              {byStatus(["APPROVED"]).length > 0 && (
                <>
                  {" "}
                  <span className="font-medium text-destructive">
                    {byStatus(["APPROVED"]).length} of them are approved — their bills and all
                    receipt entries will be deleted too.
                  </span>
                </>
              )}{" "}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={bulkDelete.isPending}>
              {bulkDelete.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Approve {approveIds.length} calculation{approveIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Approved calculations are locked and become payable — they can no longer be
              edited or deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doBulkApprove} disabled={bulkApprove.isPending}>
              {bulkApprove.isPending ? "Approving…" : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
