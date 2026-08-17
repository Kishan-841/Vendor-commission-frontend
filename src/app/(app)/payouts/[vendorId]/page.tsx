"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Trash2, Pencil, Paperclip, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import {
  useVendorLedger,
  useDeletePayment,
  fetchReceiptPdf,
  fetchReceiptAttachment,
  downloadLedgerPdf,
} from "@/hooks/use-payouts";
import { DocumentViewerDialog, type ViewerDoc } from "@/components/document-viewer";
import { useRole } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { PayoutStatusBadge } from "@/components/payouts/payout-status-badge";
import { ReceiptEntryForm } from "@/components/payouts/receipt-entry-form";
import { ApiError } from "@/lib/api";
import { inr, formatDate, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LedgerReceipt, PayoutStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const mono = { fontFamily: "var(--font-geist-mono)" } as const;

const statusOf = (payable: number, paid: number): PayoutStatus =>
  payable > 0 && paid >= payable ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="py-4">
      <CardContent className="px-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-xl font-semibold tabular-nums", tone)} style={mono}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium">{children}</h2>;
}

export default function VendorPayoutDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = use(params);
  const isAdmin = useRole() === "ADMIN";
  const ledger = useVendorLedger(vendorId);
  const del = useDeletePayment();
  const [editing, setEditing] = useState<LedgerReceipt | null>(null);
  const [deleting, setDeleting] = useState<LedgerReceipt | null>(null);
  const [exporting, setExporting] = useState(false);
  const [viewing, setViewing] = useState<ViewerDoc | null>(null);

  // In-app preview for the generated receipt PDF / uploaded attachment.
  const viewReceipt = async (r: LedgerReceipt) => {
    try {
      const blob = await fetchReceiptPdf(r.id);
      const name = r.receiptNumber ?? "receipt";
      setViewing({ title: `Receipt ${name}`, fileName: `${name}.pdf`, blob });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load receipt");
    }
  };

  const viewAttachment = async (r: LedgerReceipt) => {
    try {
      const blob = await fetchReceiptAttachment(r.id);
      const ext = blob.type === "application/pdf" ? "pdf" : (blob.type.split("/")[1] ?? "bin");
      const name = r.receiptNumber ?? "receipt";
      setViewing({ title: `Attachment — ${name}`, fileName: `${name}-attachment.${ext}`, blob });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load attachment");
    }
  };

  const d = ledger.data;

  const exportPdf = async () => {
    if (!d) return;
    setExporting(true);
    try {
      await downloadLedgerPdf(vendorId, d.vendor.vendorName);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Receipt deleted");
        if (editing?.id === deleting.id) setEditing(null);
        setDeleting(null);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed"),
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/payouts"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All payouts
        </Link>
        <PageHeader
          title={d?.vendor.vendorName ?? "Vendor payouts"}
          description={
            d
              ? [d.vendor.companyName, d.vendor.email, d.vendor.mobileNumber].filter(Boolean).join(" · ") ||
                "Payout details, receipts and ledger."
              : undefined
          }
        >
          {d && (
            <>
              <PayoutStatusBadge status={statusOf(d.summary.totalPayout, d.summary.totalReceived)} />
              <Button variant="outline" onClick={exportPdf} disabled={exporting}>
                <FileDown className="mr-1.5 h-4 w-4" /> {exporting ? "Exporting…" : "Export PDF"}
              </Button>
            </>
          )}
        </PageHeader>
      </div>

      {ledger.isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : !d ? (
        <p className="py-10 text-center text-muted-foreground">Vendor not found.</p>
      ) : (
        <>
          {/* ── Payout Details ─────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle>Payout Details</SectionTitle>
            <Card className="p-0 gap-0 overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60 border-b border-border">
                      <TableHead className="h-11 font-medium text-foreground">Month</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Bill</TableHead>
                      <TableHead className="h-11 text-right font-medium text-foreground">Payable</TableHead>
                      <TableHead className="h-11 text-right font-medium text-foreground">Paid</TableHead>
                      <TableHead className="h-11 text-right font-medium text-foreground">Due</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.payouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No approved payouts for this vendor yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      d.payouts.map((p) => (
                        <TableRow key={p.calculationId}>
                          <TableCell className="font-medium">{formatMonth(p.month)}</TableCell>
                          <TableCell className="text-muted-foreground">{p.billNumber ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums" style={mono}>{inr(p.finalPayable)}</TableCell>
                          <TableCell className="text-right tabular-nums text-success" style={mono}>{inr(p.paidAmount)}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", p.outstanding > 0 && "text-warning")} style={mono}>{inr(p.outstanding)}</TableCell>
                          <TableCell><PayoutStatusBadge status={statusOf(p.finalPayable, p.paidAmount)} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>

          {/* Receipts and Ledger live in separate tabs so each view stays focused. */}
          <Tabs defaultValue="receipts" className="space-y-6">
            <TabsList>
              <TabsTrigger value="receipts">Receipts</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="receipts" className="space-y-8">
          {/* ── Receipt Entry ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle>Receipt Entry</SectionTitle>
            <ReceiptEntryForm
              vendorName={d.vendor.vendorName}
              payouts={d.payouts}
              editing={editing}
              onDone={() => setEditing(null)}
            />
          </section>

          {/* ── Receipt Entries ────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle>Receipt Entries</SectionTitle>
            <Card className="p-0 gap-0 overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60 border-b border-border">
                      <TableHead className="h-11 font-medium text-foreground">Receipt Date</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Receipt No.</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Payment Mode</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Reference</TableHead>
                      <TableHead className="h-11 text-right font-medium text-foreground">Amount</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Remarks</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Created By</TableHead>
                      <TableHead className="h-11 text-right font-medium text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.receipts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No receipts recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      d.receipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{formatDate(r.paymentDate)}</TableCell>
                          <TableCell className="font-medium">{r.receiptNumber ?? "—"}</TableCell>
                          <TableCell>{r.paymentMode.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-muted-foreground">{r.paymentReference ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums" style={mono}>{inr(r.amount)}</TableCell>
                          <TableCell className="max-w-[160px] truncate text-muted-foreground" title={r.notes ?? ""}>
                            {r.notes ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.createdBy ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-0.5">
                              {r.hasAttachment && (
                                <Button variant="ghost" size="icon" title="View attachment" onClick={() => viewAttachment(r)}>
                                  <Paperclip className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" title="View receipt" onClick={() => viewReceipt(r)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(r)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
          </section>
            </TabsContent>

            <TabsContent value="ledger">
          {/* ── Ledger Summary ─────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Ledger</SectionTitle>
              <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting}>
                <FileDown className="mr-1.5 h-4 w-4" /> {exporting ? "Exporting…" : "Export PDF"}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Payout" value={inr(d.summary.totalPayout)} />
              <StatCard label="Total Received" value={inr(d.summary.totalReceived)} tone="text-success" />
              <StatCard
                label="Outstanding Balance"
                value={inr(d.summary.outstanding)}
                tone={d.summary.outstanding > 0 ? "text-warning" : undefined}
              />
              <StatCard label="Receipts" value={String(d.summary.receiptCount)} />
            </div>

            {/* ── Ledger table ─────────────────────────────────────────── */}
            <Card className="p-0 gap-0 overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[820px]">
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60 border-b border-border">
                      <TableHead className="h-11 font-medium text-foreground">Date</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Transaction Type</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Reference</TableHead>
                      <TableHead className="h-11 font-medium text-foreground">Description</TableHead>
                      <TableHead className="h-11 text-right font-medium text-foreground">Debit</TableHead>
                      <TableHead className="h-11 text-right font-medium text-foreground">Credit</TableHead>
                      <TableHead className="h-11 text-right font-medium text-foreground">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.ledger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          No ledger transactions yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      d.ledger.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>{formatDate(e.date)}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded px-1.5 py-0.5 text-xs",
                                e.transactionType === "Receipt"
                                  ? "bg-success/15 text-success"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {e.transactionType}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{e.reference}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {e.description}
                            {/* Detailed math behind the payout: commission + fixed + GST − TDS = final. */}
                            {e.breakdown && (
                              <div className="mt-0.5 text-xs tabular-nums" style={mono}>
                                Comm {inr(e.breakdown.grossCommission)}
                                {e.breakdown.fixedPayAmount !== 0 &&
                                  ` ${e.breakdown.fixedPayAmount > 0 ? "+" : "−"} Fixed ${inr(Math.abs(e.breakdown.fixedPayAmount))}`}
                                {e.breakdown.gstAmount !== 0 && ` + GST ${inr(e.breakdown.gstAmount)}`}
                                {e.breakdown.tdsAmount !== 0 && ` − TDS ${inr(e.breakdown.tdsAmount)}`}
                                {e.breakdown.roundOff !== 0 &&
                                  ` ${e.breakdown.roundOff > 0 ? "+" : "−"} R/O ${inr(Math.abs(e.breakdown.roundOff))}`}
                                {" = "}
                                {inr(e.breakdown.finalPayable)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums" style={mono}>{e.debit ? inr(e.debit) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums text-success" style={mono}>{e.credit ? inr(e.credit) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium" style={mono}>{inr(e.balance)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>
            </TabsContent>
          </Tabs>
        </>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  Receipt {deleting.receiptNumber ?? ""} ({inr(deleting.amount)}) will be removed and the
                  payout balance recalculated. This cannot be undone.
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

      <DocumentViewerDialog doc={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}
