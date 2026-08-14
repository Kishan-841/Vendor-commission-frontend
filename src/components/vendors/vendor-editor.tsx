"use client";

/* Hallmark · component: vendor-editor (page-scope form) · genre: modern-minimal · tone: refined-editorial
 * theme: preserved (Geist + OKLCH blue) + Instrument Serif display register · figures: Geist Mono tabular
 * states: default · hover · focus-visible · active · disabled · loading · error
 * Hallmark · pre-emit critique: P5 H5 E4 S4 R5 V4
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useSaveVendor } from "@/hooks/use-vendors";
import { ApiError } from "@/lib/api";
import { inr } from "@/lib/format";
import type { Vendor } from "@/lib/types";
import { ZoneAssignment, type AssignmentInput } from "./zone-assignment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z
  .object({
    companyName: z.string().optional(),
    vendorName: z.string().min(1, "Vendor name is required"),
    address: z.string().optional(),
    mobileNumber: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    panNumber: z.string().optional(),
    gstNumber: z.string().optional(),
    agrApplicable: z.boolean(),
    agrPercentage: z.coerce.number().min(0).max(100),
    tdsPercentage: z.coerce.number().min(0).max(100),
    fixedPayEnabled: z.boolean(),
    fixedPayAmount: z.coerce.number(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    bankName: z.string().optional(),
    accountHolder: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    branch: z.string().optional(),
  })
  .refine((v) => !v.agrApplicable || v.agrPercentage > 0, {
    message: "AGR % must be greater than 0",
    path: ["agrPercentage"],
  })
  // Non-zero (negative allowed = a deduction); zero means turn the toggle off.
  .refine((v) => !v.fixedPayEnabled || v.fixedPayAmount !== 0, {
    message: "Fixed pay amount is required",
    path: ["fixedPayAmount"],
  });

type FormValues = z.infer<typeof schema>;

function toDefaults(vendor?: Vendor | null): FormValues {
  return {
    companyName: vendor?.companyName ?? "",
    vendorName: vendor?.vendorName ?? "",
    address: vendor?.address ?? "",
    mobileNumber: vendor?.mobileNumber ?? "",
    email: vendor?.email ?? "",
    panNumber: vendor?.panNumber ?? "",
    gstNumber: vendor?.gstNumber ?? "",
    agrApplicable: vendor?.agrApplicable ?? false,
    agrPercentage: vendor ? Number(vendor.agrPercentage) : 0,
    tdsPercentage: vendor ? Number(vendor.tdsPercentage) : 0,
    fixedPayEnabled: vendor?.fixedPayEnabled ?? false,
    fixedPayAmount: vendor?.fixedPayAmount ? Number(vendor.fixedPayAmount) : 0,
    status: vendor?.status ?? "ACTIVE",
    bankName: vendor?.bankDetails?.bankName ?? "",
    accountHolder: vendor?.bankDetails?.accountHolder ?? "",
    accountNumber: vendor?.bankDetails?.accountNumber ?? "",
    ifscCode: vendor?.bankDetails?.ifscCode ?? "",
    branch: vendor?.bankDetails?.branch ?? "",
  };
}

const toAssignments = (v?: Vendor | null): AssignmentInput[] =>
  v?.zoneAssignments?.map((a) => ({
    zoneId: a.zoneId,
    zoneType: a.zoneType,
    commissionPercentage: String(a.commissionPercentage),
  })) ?? [];

export function VendorEditor({ vendor }: { vendor?: Vendor | null }) {
  const router = useRouter();
  const save = useSaveVendor();
  const isEdit = !!vendor;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: toDefaults(vendor),
  });

  const [assignments, setAssignments] = useState<AssignmentInput[]>(toAssignments(vendor));

  // Re-sync when the (async-loaded) vendor arrives on the edit route.
  useEffect(() => {
    reset(toDefaults(vendor));
    setAssignments(toAssignments(vendor));
  }, [vendor, reset]);

  const agrApplicable = watch("agrApplicable");
  const fixedPayEnabled = watch("fixedPayEnabled");
  const fixedPayAmount = watch("fixedPayAmount");

  const onSubmit = (values: FormValues) => {
    const { bankName, accountHolder, accountNumber, ifscCode, branch, ...rest } = values;
    const bankDetails = { bankName, accountHolder, accountNumber, ifscCode, branch };
    const hasBank = Object.values(bankDetails).some((v) => v && v.trim() !== "");
    const payload: Record<string, unknown> = {
      ...rest,
      email: rest.email || undefined,
      zoneAssignments: assignments.map((a) => ({
        zoneId: a.zoneId,
        zoneType: a.zoneType,
        commissionPercentage: Number(a.commissionPercentage) || 0,
      })),
      ...(hasBank ? { bankDetails } : {}),
    };
    save.mutate(
      { id: vendor?.id, data: payload },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Vendor updated" : "Vendor created");
          router.push("/vendors");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to save vendor"),
      },
    );
  };

  return (
    // Fill the main area (h-full = 100% of <main>, which the app shell locks to
    // the viewport). Clean flex column — no negative margins — so nothing can
    // leak into the document scroll. Only the body scrolls; the footer is pinned.
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Vendors
          </Link>
          <div className="mt-4">
            <h1
              className="text-[2rem] leading-[1.1] tracking-tight"
              style={{ fontFamily: "var(--font-editorial)" }}
            >
              {isEdit ? vendor!.vendorName : "New vendor"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit
                ? "Update details, tax setup, and zone assignments."
                : "Add a vendor and its commission setup."}
            </p>
          </div>

          {/* Contained panel — one dedicated surface, sections divided by hairlines */}
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">

      {/* Identity */}
      <FormSection
        title="Identity"
        description="Who the vendor is and how to reach them."
      >
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
          <Field label="Vendor name" error={errors.vendorName?.message} className="sm:col-span-2">
            <Input placeholder="e.g. ABC Vendor" {...register("vendorName")} />
          </Field>
          <Field label="Company name" error={errors.companyName?.message}>
            <Input placeholder="e.g. ABC Broadband Pvt Ltd (optional)" {...register("companyName")} />
          </Field>
          <Field label="Status">
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "ACTIVE" | "INACTIVE")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mobile number">
            <Input placeholder="e.g. 9876543210" {...register("mobileNumber")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="e.g. accounts@abcbroadband.com" {...register("email")} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input placeholder="Street, area, city, PIN" {...register("address")} />
          </Field>
        </div>
      </FormSection>

      {/* Tax & compliance */}
      <FormSection
        title="Tax & compliance"
        description="PAN and GST identifiers, plus the AGR and TDS rates applied to every commission."
      >
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
          <Field label="PAN number"><Input placeholder="e.g. ABCDE1234F" {...register("panNumber")} /></Field>
          <Field label="GST number (optional)"><Input placeholder="e.g. 27ABCDE1234F1Z5" {...register("gstNumber")} /></Field>
          <ToggleRow
            className="sm:col-span-2"
            title="AGR applicable"
            description="Adjusted Gross Revenue is deducted from sales before commission."
            checked={agrApplicable}
            onChange={(v) => setValue("agrApplicable", v)}
          />
          <Field label="AGR %" error={errors.agrPercentage?.message}>
            <Input
              type="number" step="0.01" placeholder="e.g. 8" disabled={!agrApplicable}
              className="tabular-nums" {...register("agrPercentage")}
            />
          </Field>
          <Field label="TDS %" error={errors.tdsPercentage?.message}>
            <Input type="number" step="0.01" placeholder="e.g. 2" className="tabular-nums" {...register("tdsPercentage")} />
          </Field>
        </div>
      </FormSection>

      {/* Vendor pay */}
      <FormSection
        title="Vendor pay"
        description="An optional flat amount paid on top of the performance-based commission each month."
      >
        <div className="space-y-5">
          <ToggleRow
            title="Fixed Vendor Pay"
            description="Adds (or deducts, if negative) a flat monthly amount to the calculated payable."
            checked={fixedPayEnabled}
            onChange={(v) => setValue("fixedPayEnabled", v)}
          />
          {fixedPayEnabled && (
            <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
              <Field label="Fixed pay amount (₹)" error={errors.fixedPayAmount?.message}>
                <Input
                  type="number" step="0.01" placeholder="e.g. 25000 or -5000"
                  className="tabular-nums" {...register("fixedPayAmount")}
                />
              </Field>
              {Number(fixedPayAmount) !== 0 && !Number.isNaN(Number(fixedPayAmount)) && (
                <div className="flex items-end">
                  <p className="text-sm text-muted-foreground">
                    {Number(fixedPayAmount) > 0 ? "Adds " : "Deducts "}
                    <span className="font-medium text-foreground tabular-nums" style={{ fontFamily: "var(--font-geist-mono)" }}>
                      {inr(Math.abs(Number(fixedPayAmount)))}
                    </span>{" "}
                    {Number(fixedPayAmount) > 0 ? "to" : "from"} every payout.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </FormSection>

      {/* Banking */}
      <FormSection
        title="Banking"
        description="Where payouts are sent. Optional — you can add these later."
      >
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
          <Field label="Bank name"><Input placeholder="e.g. HDFC Bank" {...register("bankName")} /></Field>
          <Field label="Account holder"><Input placeholder="e.g. ABC Broadband Pvt Ltd" {...register("accountHolder")} /></Field>
          <Field label="Account number"><Input className="tabular-nums" placeholder="e.g. 50100123456789" {...register("accountNumber")} /></Field>
          <Field label="IFSC code"><Input placeholder="e.g. HDFC0001234" {...register("ifscCode")} /></Field>
          <Field label="Branch" className="sm:col-span-2"><Input placeholder="e.g. Pune — Hadapsar" {...register("branch")} /></Field>
        </div>
      </FormSection>

      {/* Zones */}
      <FormSection
        title="Zones"
        description="The New and Renewal zones this vendor operates in, each with its commission %."
      >
            <ZoneAssignment value={assignments} onChange={setAssignments} />
          </FormSection>
          </div>
          {/* /Contained panel */}
        </div>
      </div>
      {/* /Scrollable body */}

      {/* Pinned action bar — opaque, always visible at the bottom of the area */}
      <div className="shrink-0 border-t border-border bg-background py-3.5">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.push("/vendors")}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create vendor"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ── Sectioned settings layout: description left, controls right ─────────── */
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-x-8 gap-y-3 px-5 py-6 sm:px-7 md:grid-cols-[minmax(0,13rem)_1fr]">
      <div>
        <h2 className="text-sm font-medium tracking-tight">{title}</h2>
        <p className="mt-1 max-w-[24ch] text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  className,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3", className)}>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}
