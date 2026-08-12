"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPinned,
  CheckSquare,
  FileText,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { PageHeader } from "@/components/page-header";
import { PayoutStatusBadge } from "@/components/payouts/payout-status-badge";
import {
  ChartCard,
  MonthlyTrendChart,
  ZonePerformanceChart,
  PaymentStatusDonut,
} from "@/components/dashboard/charts";
import { inr, formatDate, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mono = { fontFamily: "var(--font-geist-mono)" } as const;
const ALL = "__all__";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  href: string;
  tone?: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full gap-2 py-4 transition-colors hover:border-primary/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <Icon className="h-4.5 w-4.5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-5">
          <div className={cn("text-2xl font-semibold tabular-nums tracking-tight", tone)} style={mono}>
            {value}
          </div>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

// Small dashboard table shell: title + rows (or an empty message).
function TableCard({
  title,
  empty,
  children,
  count,
}: {
  title: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/40 px-5 py-3.5">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {count === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="divide-y divide-border">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const [months, setMonths] = useState<6 | 12>(6);
  const [month, setMonth] = useState(ALL);
  const stats = useDashboardStats(months, month === ALL ? undefined : month);
  const d = stats.data;
  // Available months come from the response; keep them stable across refetches.
  const availableMonths = d?.availableMonths ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Vendors, payouts, bills and approvals — the whole business at a glance."
      >
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            <SelectItem value={ALL}>All months</SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonth(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {([6, 12] as const).map((m) => (
            <Button
              key={m}
              variant={months === m ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setMonths(m)}
            >
              {m}m
            </Button>
          ))}
        </div>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Vendors"
          value={d?.cards.vendors.total ?? "—"}
          sub={d ? `${d.cards.vendors.active} active · ${d.cards.vendors.inactive} inactive` : undefined}
          icon={Building2}
          href="/vendors"
        />
        <StatCard label="Zones" value={d?.cards.zones ?? "—"} icon={MapPinned} href="/zones" />
        <StatCard
          label="Pending Approvals"
          value={d?.cards.pendingApprovals ?? "—"}
          icon={CheckSquare}
          href="/approvals"
        />
        <StatCard
          label="Bills"
          value={d?.cards.bills.total ?? "—"}
          sub={d ? `${inr(d.cards.bills.amount)} billed` : undefined}
          icon={FileText}
          href="/bills"
        />
        <StatCard
          label="Paid Amount"
          value={d ? inr(d.cards.commission.paid) : "—"}
          sub={d ? `of ${inr(d.cards.commission.total)} approved` : undefined}
          icon={Wallet}
          href="/payouts"
          tone="text-success"
        />
        <StatCard
          label="Outstanding"
          value={d ? inr(d.cards.commission.outstanding) : "—"}
          sub={d ? `${d.cards.commission.approvedCount} approved calc(s)` : undefined}
          icon={AlertCircle}
          href="/payouts"
          tone={d && d.cards.commission.outstanding > 0 ? "text-warning" : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly sales, commission & payouts">
          <MonthlyTrendChart data={d?.monthly ?? []} />
        </ChartCard>
        <ChartCard title="Payment status">
          <PaymentStatusDonut data={d?.paymentStatusDistribution ?? []} />
        </ChartCard>
      </div>
      <ChartCard title="Zone performance (approved commissions)">
        <ZonePerformanceChart data={d?.zonePerformance ?? []} />
      </ChartCard>

      {/* Tables */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TableCard
          title="Recent payments"
          empty="No payments recorded yet."
          count={d?.recentPayments.length ?? 0}
        >
          {d?.recentPayments.map((p) => (
            <Link
              key={p.paymentId}
              href={`/payouts/${p.vendorId}`}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/50"
            >
              <div className="min-w-0 leading-tight">
                <div className="truncate font-medium">{p.vendorName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatMonth(p.month)} · {formatDate(p.paymentDate)}
                </div>
              </div>
              <span className="shrink-0 tabular-nums text-success" style={mono}>
                {inr(p.amount)}
              </span>
            </Link>
          ))}
        </TableCard>

        <TableCard
          title="Pending payouts"
          empty="Nothing outstanding — all approved commissions are paid."
          count={d?.pendingPayouts.length ?? 0}
        >
          {d?.pendingPayouts.map((p) => (
            <Link
              key={p.calculationId}
              href={`/payouts/${p.vendorId}`}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/50"
            >
              <div className="min-w-0 leading-tight">
                <div className="truncate font-medium">{p.vendorName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatMonth(p.month)} · {p.daysPending} day(s) pending
                </div>
              </div>
              <span className="shrink-0 tabular-nums text-warning" style={mono}>
                {inr(p.outstanding)}
              </span>
            </Link>
          ))}
        </TableCard>

        <TableCard
          title="Top vendors by commission"
          empty="No approved commissions yet."
          count={d?.topVendors.length ?? 0}
        >
          {d?.topVendors.map((v, i) => (
            <Link
              key={v.vendorId}
              href={`/payouts/${v.vendorId}`}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 leading-tight">
                  <div className="truncate font-medium">{v.vendorName}</div>
                  <div className="text-xs text-muted-foreground">Sales {inr(v.sales)}</div>
                </div>
              </div>
              <div className="shrink-0 text-right leading-tight">
                <div className="tabular-nums" style={mono}>
                  {inr(v.commission)}
                </div>
                <PayoutStatusBadge
                  status={v.paid >= v.commission ? "PAID" : v.paid > 0 ? "PARTIAL" : "PENDING"}
                />
              </div>
            </Link>
          ))}
        </TableCard>
      </div>
    </div>
  );
}
