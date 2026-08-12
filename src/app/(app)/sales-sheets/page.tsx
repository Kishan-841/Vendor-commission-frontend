"use client";

import { useState } from "react";
import { Upload, Download, Lock, LockOpen, Trash2, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import {
  useSalesUploads,
  useUploadSalesSheet,
  useUnlockUpload,
  useLockUpload,
  useDeleteUpload,
  downloadUpload,
  ApiError,
} from "@/hooks/use-sales";
import { useRole } from "@/components/app-shell";
import { ExcelDropzone } from "@/components/zones/excel-dropzone";
import { ZoneTypeBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { formatMonth, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SalesUpload, UploadResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function SalesSheetsPage() {
  const isAdmin = useRole() === "ADMIN";
  const uploads = useSalesUploads();
  const upload = useUploadSalesSheet();
  const unlock = useUnlockUpload();
  const lock = useLockUpload();
  const del = useDeleteUpload();

  const [month, setMonth] = useState("");
  const [salesType, setSalesType] = useState<"NEW" | "RENEWAL">("NEW");
  const [file, setFile] = useState<File | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [deleting, setDeleting] = useState<SalesUpload | null>(null);

  const runUpload = (replace: boolean) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return toast.error("Select a month");
    if (!file) return toast.error("Please upload a sales sheet");
    upload.mutate(
      { month, salesType, file, replace },
      {
        onSuccess: (res: UploadResult) => {
          setFile(null);
          setConfirmReplace(false);
          toast.success(
            `${res.replaced ? "Replaced" : "Uploaded"} ${res.salesType === "NEW" ? "New" : "Renewal"} · ${formatMonth(res.month)} · ${res.rowCount} rows`,
          );
          if (res.unmatchedZoneNames.length > 0) {
            toast(
              `${res.unmatchedZoneNames.length} zone(s) not in the master won't match any vendor`,
              { icon: "⚠️" },
            );
          }
        },
        onError: (err) => {
          // 409 = month exists; offer replacement (admin only).
          if (err instanceof ApiError && err.status === 409) {
            if (isAdmin) setConfirmReplace(true);
            else toast.error(err.message);
            return;
          }
          toast.error(err instanceof ApiError ? err.message : "Upload failed");
        },
      },
    );
  };

  const doUnlock = (u: SalesUpload) =>
    unlock.mutate(u.id, {
      onSuccess: () => toast.success(`${formatMonth(u.month)} unlocked`),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
    });
  const doLock = (u: SalesUpload) =>
    lock.mutate(u.id, {
      onSuccess: () => toast.success(`${formatMonth(u.month)} locked`),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
    });
  const confirmDelete = () => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(`${formatMonth(deleting.month)} deleted`);
        setDeleting(null);
      },
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Sheets"
        description="Upload each month's sales sheet once. Sheets are stored, locked, and reused by the Calculations tab."
      />

      {/* Upload form — New and Renewal are uploaded separately. */}
      <Card className="gap-4 py-5">
        <CardHeader className="px-6">
          <CardTitle className="text-base font-medium">Upload a monthly sheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="max-w-[200px]">
              <Label className="mb-1.5 block text-sm text-muted-foreground">Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm text-muted-foreground">Sheet type</Label>
              <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                {(["NEW", "RENEWAL"] as const).map((t) => (
                  <Button
                    key={t}
                    variant={salesType === t ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setSalesType(t)}
                  >
                    {t === "NEW" ? "New" : "Renewal"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <ExcelDropzone file={file} onFile={setFile} disabled={upload.isPending} />
          <p className="text-sm text-muted-foreground">
            Upload the <span className="font-medium">New</span> and{" "}
            <span className="font-medium">Renewal</span> sheets separately — pick the type above for
            each. The sheet needs &quot;Zone Name&quot; and &quot;Plan Amount&quot; columns; every
            column is stored per row (browsable under Sales Summary).
            {isAdmin
              ? " Re-uploading an existing month + type asks for confirmation and replaces it."
              : " If that month + type already has a sheet, only an admin can replace it."}
          </p>
          <div>
            <Button onClick={() => runUpload(false)} disabled={upload.isPending}>
              <Upload className="mr-1.5 h-4 w-4" />
              {upload.isPending ? "Uploading…" : `Upload ${salesType === "NEW" ? "New" : "Renewal"} sheet`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History grid */}
      <Card className="p-0 gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60 border-b border-border">
                <TableHead className="h-11 font-medium text-foreground">Month</TableHead>
                <TableHead className="h-11 font-medium text-foreground">Type</TableHead>
                <TableHead className="h-11 font-medium text-foreground">File</TableHead>
                <TableHead className="h-11 text-right font-medium text-foreground">Rows</TableHead>
                <TableHead className="h-11 text-right font-medium text-foreground">Ver.</TableHead>
                <TableHead className="h-11 font-medium text-foreground">Uploaded By</TableHead>
                <TableHead className="h-11 font-medium text-foreground">Uploaded</TableHead>
                <TableHead className="h-11 font-medium text-foreground">Status</TableHead>
                <TableHead className="h-11 text-right font-medium text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (uploads.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No sales sheets uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                uploads.data!.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{formatMonth(u.month)}</TableCell>
                    <TableCell>
                      {u.salesType ? (
                        <ZoneTypeBadge type={u.salesType} />
                      ) : (
                        <span className="text-sm text-muted-foreground">Mixed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[200px] truncate">{u.fileName}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{u.rowCount.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.version}</TableCell>
                    <TableCell className="text-muted-foreground">{u.uploadedBy ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(u.uploadedAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent",
                          u.locked ? "bg-muted text-foreground" : "bg-warning/15 text-warning",
                        )}
                      >
                        {u.locked ? (
                          <Lock className="mr-1 h-3 w-3" />
                        ) : (
                          <LockOpen className="mr-1 h-3 w-3" />
                        )}
                        {u.locked ? "Locked" : "Unlocked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.hasFile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download original file"
                            onClick={() => downloadUpload(u.id, u.fileName)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={u.locked ? "Unlock" : "Lock"}
                              onClick={() => (u.locked ? doUnlock(u) : doLock(u))}
                            >
                              {u.locked ? (
                                <LockOpen className="h-4 w-4" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => setDeleting(u)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Replace confirmation (admin, on 409) */}
      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              A sales sheet for {month && formatMonth(month)} already exists. Replacing it removes
              the previous rows and increments the version. Existing calculations for this month are
              not affected. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => runUpload(true)} disabled={upload.isPending}>
              {upload.isPending ? "Replacing…" : "Replace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sales sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  The stored sheet for {formatMonth(deleting.month)} ({deleting.rowCount} rows) and
                  its data will be permanently removed. Calculations already generated from it are
                  not deleted. This cannot be undone.
                </>
              )}
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
