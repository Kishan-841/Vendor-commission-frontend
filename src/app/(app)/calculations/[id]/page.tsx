"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Check, X, FileText, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCalculation,
  useApprovalHistory,
  useWorkflowAction,
  useDeleteCalculation,
} from "@/hooks/use-calculations";
import { useGenerateBill } from "@/hooks/use-bills";
import { useRole } from "@/components/app-shell";
import { CalcStatusBadge, ZoneTypeBadge } from "@/components/status-badge";
import { ApiError } from "@/lib/api";
import { inr, pct, formatMonth, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CalculationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "ADMIN";

  const { data: calc, isLoading } = useCalculation(id);
  const { data: history } = useApprovalHistory(id);
  const workflow = useWorkflowAction();
  const del = useDeleteCalculation();
  const genBill = useGenerateBill();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState("");

  if (isLoading || !calc) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  // Final payable is stored rounded to the whole rupee; the adjustment vs the
  // paise-precise components is the "Round off" line. round2 kills fp noise.
  const roundOff =
    Math.round(
      (Number(calc.finalPayable) -
        (Number(calc.grossCommission) +
          Number(calc.fixedPayAmount ?? 0) +
          Number(calc.gstAmount) -
          Number(calc.tdsAmount))) *
        100,
    ) / 100;

  const act = (action: "submit" | "approve" | "reject", note?: string) =>
    workflow.mutate(
      { id: calc.id, action, remarks: note },
      {
        onSuccess: () => {
          toast.success(`Calculation ${action}${action === "submit" ? "ted" : "d"}`);
          setRejectOpen(false);
          setRemarks("");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Action failed"),
      },
    );

  const onGenerateBill = () =>
    genBill.mutate(calc.id, {
      onSuccess: (bill) => {
        toast.success(`Bill ${bill.billNumber} generated`);
        router.push(`/bills`);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to generate bill"),
    });

  const onDelete = () =>
    del.mutate(calc.id, {
      onSuccess: () => {
        toast.success("Calculation deleted");
        router.push("/calculations");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed"),
    });

  return (
    <div className="space-y-6">
      <Link href="/calculations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to calculations
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{calc.vendor?.vendorName}</h1>
            <CalcStatusBadge status={calc.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatMonth(calc.month)}
            {calc.billingPeriod ? ` · ${calc.billingPeriod}` : ""}
          </p>
        </div>

        {/* Workflow actions */}
        <div className="flex flex-wrap items-center gap-2">
          {(calc.status === "DRAFT" || calc.status === "REJECTED") && isAdmin && (
            <Button onClick={() => act("submit")} disabled={workflow.isPending}>
              <Send className="h-4 w-4" /> Submit for approval
            </Button>
          )}
          {calc.status === "SUBMITTED" && (
            <>
              <Button onClick={() => act("approve")} disabled={workflow.isPending}>
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={workflow.isPending}>
                <X className="h-4 w-4" /> Reject
              </Button>
            </>
          )}
          {calc.status === "APPROVED" && !calc.bill && (
            <Button onClick={onGenerateBill} disabled={genBill.isPending}>
              <FileText className="h-4 w-4" /> Generate bill
            </Button>
          )}
          {calc.bill && (
            <Button variant="outline" asChild>
              <Link href="/bills"><FileText className="h-4 w-4" /> View bill {calc.bill.billNumber}</Link>
            </Button>
          )}
          {calc.status === "DRAFT" && isAdmin && (
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete draft">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Waterfall summary */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Commission summary</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <Row label="Total sales" value={inr(calc.totalSales)} />
            <Row label={`AGR ${calc.agrApplicable ? `(${pct(calc.agrPercentage)})` : ""}`} value={"- " + inr(calc.agrAmount)} muted />
            <Separator className="my-1" />
            <Row label="Sales after AGR" value={inr(calc.salesAfterAgr)} />
            <div className="py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Comm %</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calc.breakdowns?.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.zoneName}</TableCell>
                      <TableCell>{b.zoneType ? <ZoneTypeBadge type={b.zoneType} /> : "—"}</TableCell>
                      <TableCell className="text-right">{pct(b.commissionPercentage)}</TableCell>
                      <TableCell className="text-right font-mono text-[15px] tabular-nums" style={{ fontFamily: "var(--font-geist-mono)" }}>{inr(b.baseAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-[15px] tabular-nums" style={{ fontFamily: "var(--font-geist-mono)" }}>{inr(b.commissionAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Row label="Gross commission" value={inr(calc.grossCommission)} bold />
            {/* Fixed pay joins the base before taxes; GST/TDS are computed on
                gross + fixed pay, so it reads above them. Negative = deduction. */}
            {Number(calc.fixedPayAmount) !== 0 && (
              <Row
                label="Fixed vendor pay"
                value={(Number(calc.fixedPayAmount) > 0 ? "+ " : "- ") + inr(Math.abs(Number(calc.fixedPayAmount)))}
                muted
              />
            )}
            <Row label={`GST (${pct(calc.gstPercentage)})`} value={"+ " + inr(calc.gstAmount)} muted />
            <Row label={`TDS (${pct(calc.tdsPercentage)})`} value={"- " + inr(calc.tdsAmount)} muted />
            {/* Final payable is rounded to the whole rupee — surface the
                adjustment so the rows above sum exactly to the final. */}
            {roundOff !== 0 && (
              <Row
                label="Round off"
                value={(roundOff > 0 ? "+ " : "- ") + inr(Math.abs(roundOff))}
                muted
              />
            )}
            <Separator className="my-1" />
            <Row label="Final payable" value={inr(calc.finalPayable)} highlight />
          </CardContent>
        </Card>

        {/* Approval trail */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Approval trail</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(history?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No workflow activity yet.</p>
            )}
            {history?.map((a) => (
              <div key={a.id} className="border-l-2 border-border pl-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalcStatusBadge status={a.action} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {a.actor?.name} · {formatDateTime(a.createdAt)}
                </div>
                {a.remarks && <p className="mt-1 text-sm leading-relaxed">{a.remarks}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject calculation</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">A reason is required and recorded in the audit trail.</p>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for rejection…" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => remarks.trim() ? act("reject", remarks) : toast.error("Enter a reason")}
              disabled={workflow.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${highlight ? "py-1.5" : "py-1"}`}>
      <span
        className={
          highlight
            ? "text-base font-medium text-foreground"
            : muted
              ? "text-[15px] text-muted-foreground"
              : "text-[15px] text-foreground"
        }
      >
        {label}
      </span>
      <span
        className={
          highlight
            ? "text-2xl font-semibold text-primary font-mono tabular-nums"
            : bold
              ? "text-[15px] font-semibold font-mono tabular-nums"
              : muted
                ? "text-[15px] text-muted-foreground font-mono tabular-nums"
                : "text-[15px] font-mono tabular-nums"
        }
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        {value}
      </span>
    </div>
  );
}
