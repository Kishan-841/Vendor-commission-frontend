"use client";

import type { SalesRecord } from "@/lib/types";
import { ZoneTypeBadge } from "@/components/status-badge";
import { inr, formatDate, formatDateTime } from "@/lib/format";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Every column of the uploaded sales row, grouped for reading — the table
// itself only shows the key ones.
export function SalesDetailSheet({
  record,
  onOpenChange,
}: {
  record: SalesRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!record} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {record && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                Bill {record.billNo ?? "—"}
                <ZoneTypeBadge type={record.salesType} />
              </SheetTitle>
              <SheetDescription>
                {record.billDate ? formatDateTime(record.billDate) : "No bill date"}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-6">
              <Section title="Customer">
                <Field label="User Name" value={record.userName} />
                <Field label="Name" value={record.customerName} />
                <Field label="Mobile No" value={record.mobileNo} />
                <Field label="Address" value={record.address} />
                <Field label="Pin Code" value={record.pinCode} />
                <Field label="Status" value={record.userCurrentStatus} />
              </Section>

              <Section title="Plan">
                <Field label="Plan Name" value={record.planName} />
                <Field label="Plan Amount" value={inr(record.planAmount)} mono />
                <Field
                  label="Expiry Date"
                  value={record.expiryDate ? formatDate(record.expiryDate) : null}
                />
                <Field label="Mode of Renew" value={record.modeOfRenew} />
                <Field label="Activation Type" value={record.activationType} />
              </Section>

              <Section title="Billing">
                <Field label="Bill No" value={record.billNo} />
                <Field label="Bill Amount" value={money(record.billAmount)} mono />
                <Field label="Actual Bill Amount" value={money(record.actualBillAmount)} mono />
                <Field label="Adjusted Amount" value={money(record.adjustedAmount)} mono />
                <Field label="Discount Amount" value={money(record.discountAmount)} mono />
                <Field label="Pending Amount" value={money(record.userPendingAmount)} mono />
                <Field label="SGST" value={money(record.sgst)} mono />
                <Field label="CGST" value={money(record.cgst)} mono />
                <Field label="Client GST" value={record.clientGst} />
                <Field label="Company GST No" value={record.companyGstNo} />
                <Field label="Transaction No" value={record.onlineTransactionNo} />
              </Section>

              <Section title="Location">
                <Field label="Zone" value={record.zoneName} />
                <Field label="Site" value={record.site} />
                <Field label="Building" value={record.buildingName} />
                <Field label="Operator" value={record.operatorName} />
                <Field label="Franchisee" value={record.franchiseeName} />
              </Section>

              <Section title="Other">
                <Field label="Sales Person" value={record.salesPerson} />
                <Field label="Remarks" value={record.remarks} />
                <Field label="Inquiry Remarks" value={record.inquiryRemarks} />
                {record.extra &&
                  Object.entries(record.extra).map(([k, v]) => (
                    <Field key={k} label={k} value={v == null ? null : String(v)} />
                  ))}
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const money = (v: string | null) => (v == null ? null : inr(v));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <Separator className="mb-3" />
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[15px]">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={mono ? "text-right font-mono tabular-nums" : "text-right break-words"}
        style={mono ? { fontFamily: "var(--font-geist-mono)" } : undefined}
      >
        {value == null || value === "" ? "—" : value}
      </dd>
    </div>
  );
}
