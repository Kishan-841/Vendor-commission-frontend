// Shared types mirroring the backend API. Money/percent fields arrive as
// strings (Prisma Decimal serialization) — use Number()/formatters to display.

export type Role = "ADMIN" | "FINANCE";
export type Status = "ACTIVE" | "INACTIVE";
export type CalculationStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type ZoneType = "NEW" | "RENEWAL";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface BankDetails {
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branch?: string | null;
}

export interface Vendor {
  id: string;
  companyName?: string | null;
  vendorName: string;
  address?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  panNumber?: string | null;
  gstNumber?: string | null;
  agrApplicable: boolean;
  agrPercentage: string;
  tdsPercentage: string;
  fixedPayEnabled: boolean;
  fixedPayAmount?: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
  bankDetails?: BankDetails | null;
  zoneAssignments?: VendorZoneAssignment[];
}

export interface Zone {
  id: string;
  name: string;
  zoneData: Record<string, string | number | null>;
  createdAt: string;
}

// A vendor's assignment of a master zone under a type, with its commission %.
export interface VendorZoneAssignment {
  id?: string;
  zoneId: string;
  zoneType: ZoneType;
  commissionPercentage: string; // Decimal serialized as string
  zone?: Zone;
}

export interface ZoneUpload {
  id: string;
  fileName: string;
  rowCount: number;
  columns?: string[] | null;
  createdAt: string;
  _count?: { zones: number };
}

export interface ZoneBreakdown {
  id: string;
  zoneId?: string | null;
  zoneName: string;
  zoneType?: ZoneType | null;
  commissionPercentage: string;
  baseAmount: string;
  commissionAmount: string;
}

export interface Approval {
  id: string;
  action: "SUBMITTED" | "APPROVED" | "REJECTED";
  remarks?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; email: string; role: Role } | null;
}

export interface Calculation {
  id: string;
  vendorId: string;
  month: string;
  billingPeriod?: string | null;
  totalSales: string;
  agrApplicable: boolean;
  agrPercentage: string;
  gstPercentage: string;
  tdsPercentage: string;
  agrAmount: string;
  salesAfterAgr: string;
  grossCommission: string;
  gstAmount: string;
  tdsAmount: string;
  fixedPayAmount: string;
  finalPayable: string;
  status: CalculationStatus;
  createdAt: string;
  updatedAt: string;
  vendor?: { id: string; vendorName: string; companyName?: string | null; gstNumber?: string | null };
  breakdowns?: ZoneBreakdown[];
  approvals?: Approval[];
  bill?: { id: string; billNumber: string } | null;
  _count?: { breakdowns: number };
}

export interface BillItem {
  id: string;
  description: string;
  commissionPercentage?: string | null;
  baseAmount?: string | null;
  amount: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  calculationId: string;
  vendorId: string;
  billingMonth: string;
  grossCommission: string;
  gstAmount: string;
  tdsAmount: string;
  fixedPayAmount: string;
  finalPayable: string;
  pdfPath?: string | null;
  generatedAt: string;
  vendor?: { id: string; vendorName: string };
  items?: BillItem[];
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

// ---------------------------------------------------------------------------
// Vendor payouts
// ---------------------------------------------------------------------------

export type PayoutStatus = "PENDING" | "PARTIAL" | "PAID";
export type PaymentMode = "BANK_TRANSFER" | "UPI" | "CHEQUE" | "CASH" | "OTHER";

export interface VendorPayoutSummary {
  vendorId: string;
  vendorName: string;
  companyName: string | null;
  vendorStatus: Status;
  calculationCount: number;
  totalCommission: number;
  totalPaid: number;
  totalPending: number;
  paymentStatus: PayoutStatus;
  lastPaymentDate: string | null;
}

export interface PayoutPayment {
  id: string;
  calculationId: string;
  paidAmount: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  paymentReference: string | null;
  notes: string | null;
  paidBy: { name: string } | null;
  createdAt: string;
}

// Approved calculation + its payments, as returned by the vendor detail.
export interface PayoutCalculation extends Calculation {
  paymentStatus: PayoutStatus;
  paidAmount: string;
  bill: { id: string; billNumber: string } | null;
  payments: PayoutPayment[];
}

export interface VendorPayoutDetail {
  vendor: {
    id: string;
    vendorName: string;
    companyName: string | null;
    status: Status;
    email: string | null;
    mobileNumber: string | null;
  };
  summary: {
    totalCommission: number;
    totalPaid: number;
    totalPending: number;
    paymentStatus: PayoutStatus;
    calculationCount: number;
    paymentCount: number;
    lastPaymentDate: string | null;
  };
  calculations: PayoutCalculation[];
}

export interface RecordPaymentInput {
  paidAmount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  paymentReference?: string;
  notes?: string;
}

// Vendor payout ledger (Receipt Entry + Ledger page).
export interface LedgerPayout {
  calculationId: string;
  month: string;
  billNumber: string | null;
  finalPayable: number;
  paidAmount: number;
  outstanding: number;
  zones: string[];
}

export interface LedgerReceipt {
  id: string;
  calculationId: string;
  month: string;
  receiptNumber: string | null;
  paymentDate: string;
  paymentMode: PaymentMode;
  paymentReference: string | null;
  amount: number;
  notes: string | null;
  createdBy: string | null;
  hasAttachment: boolean;
  zones: string[];
}

export interface LedgerEntry {
  date: string;
  transactionType: "Payout Generated" | "Receipt";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface VendorLedger {
  vendor: {
    id: string;
    vendorName: string;
    companyName: string | null;
    status: Status;
    email: string | null;
    mobileNumber: string | null;
  };
  summary: {
    totalPayout: number;
    totalReceived: number;
    outstanding: number;
    receiptCount: number;
  };
  payouts: LedgerPayout[];
  receipts: LedgerReceipt[];
  ledger: LedgerEntry[];
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardStats {
  availableMonths: string[];
  selectedMonth: string | null;
  cards: {
    vendors: { total: number; active: number; inactive: number };
    zones: number;
    pendingApprovals: number;
    bills: { total: number; amount: number };
    commission: { total: number; paid: number; outstanding: number; approvedCount: number };
  };
  paymentStatusDistribution: { status: PayoutStatus; count: number }[];
  monthly: { month: string; sales: number; commission: number; paid: number; outstanding: number }[];
  zonePerformance: { zoneName: string; sales: number; commission: number }[];
  recentPayments: {
    paymentId: string;
    vendorId: string;
    vendorName: string;
    month: string;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
  }[];
  pendingPayouts: {
    calculationId: string;
    vendorId: string;
    vendorName: string;
    month: string;
    outstanding: number;
    daysPending: number;
  }[];
  topVendors: { vendorId: string; vendorName: string; sales: number; commission: number; paid: number }[];
}

// Zone-wise commission report (per month).
export interface ZoneCommissionRow {
  zone: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  commissionPercentage: number;
  commissionAmount: number;
}

export interface ZoneCommissionReport {
  month: string;
  rows: ZoneCommissionRow[];
  summary: {
    totalZones: number;
    totalSales: number;
    totalCommission: number;
    totalOrders: number;
    averageCommissionPercentage: number;
  };
}

// One structured row of an uploaded monthly sales sheet (Sales Summary).
// Decimals arrive as strings; unrecognized sheet columns land in `extra`.
export interface SalesRecord {
  id: string;
  uploadId: string;
  salesType: ZoneType;
  zoneName: string;
  planAmount: string;
  userName: string | null;
  customerName: string | null;
  pinCode: string | null;
  salesPerson: string | null;
  address: string | null;
  mobileNo: string | null;
  expiryDate: string | null;
  modeOfRenew: string | null;
  billNo: string | null;
  activationType: string | null;
  billDate: string | null;
  clientGst: string | null;
  companyGstNo: string | null;
  sgst: string | null;
  cgst: string | null;
  billAmount: string | null;
  adjustedAmount: string | null;
  actualBillAmount: string | null;
  discountAmount: string | null;
  userPendingAmount: string | null;
  site: string | null;
  buildingName: string | null;
  operatorName: string | null;
  franchiseeName: string | null;
  userCurrentStatus: string | null;
  onlineTransactionNo: string | null;
  inquiryRemarks: string | null;
  remarks: string | null;
  planName: string | null;
  extra: Record<string, string | number | null> | null;
}

export interface SalesMonth {
  month: string; // YYYY-MM
  rowCount: number;
}

// Upload history row (Tab 1).
export interface SalesUpload {
  id: string;
  month: string;
  salesType: ZoneType | null;
  fileName: string;
  rowCount: number;
  locked: boolean;
  status: string;
  version: number;
  uploadedBy: string | null;
  uploadedAt: string;
  hasFile: boolean;
}

export interface UploadResult {
  uploadId: string;
  month: string;
  salesType: ZoneType;
  fileName: string;
  rowCount: number;
  version: number;
  replaced: boolean;
  unmatchedZoneNames: string[];
}

// Active vendor option for the calculation dropdown (Tab 2).
export interface VendorForMonth {
  id: string;
  vendorName: string;
  companyName: string | null;
  alreadyCalculated: boolean;
}

export interface VendorCalcResult {
  vendorId: string;
  vendorName: string;
  calculationId: string;
  month: string;
  totalSales: number;
  grossCommission: number;
  finalPayable: number;
  matchedZones: number;
}

export interface BulkGenerateResult {
  month: string;
  created: { vendorId: string; vendorName: string; calculationId: string; finalPayable: number }[];
  skippedExisting: string[];
  vendorsWithoutMatchingZones: number;
  unmatchedZoneNames: string[];
}

export interface SalesFilterOptions {
  zones: string[];
  operators: string[];
  sites: string[];
  statuses: string[];
  renewModes: string[];
}

// Filters is a `type` (not interface) so it's assignable to the api client's
// query param Record.
export type SalesListFilters = {
  month: string;
  search?: string;
  salesType?: ZoneType | "";
  zone?: string;
  operator?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

// ---------------------------------------------------------------------------
// System logs (audit trail)
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  user: { name: string; email: string } | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LogFilterOptions {
  actions: string[];
  entityTypes: string[];
  users: { id: string; name: string }[];
}
