export type InvoiceStatus = "draft" | "generated" | "paid" | "cancelled";
export type InvoiceDisplayStatus =
  | "draft"
  | "pending"
  | "due_today"
  | "overdue"
  | "paid"
  | "cancelled";

export type InvoiceStatusFilter =
  | "all"
  | "draft"
  | "pending"
  | "overdue"
  | "paid"
  | "cancelled";

export const PAYMENT_TERMS = [
  { label: "Immediate", creditDays: 0 },
  { label: "30 Days", creditDays: 30 },
  { label: "45 Days", creditDays: 45 },
  { label: "60 Days", creditDays: 60 },
] as const;

export const normalizeInvoiceStatus = (status?: string | null): InvoiceStatus => {
  if (status === "finalized" || status === "sent") return "generated";
  if (status === "canceled") return "cancelled";
  if (status === "generated" || status === "paid" || status === "cancelled") return status;
  return "draft";
};

const parseDateOnly = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? null
      : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const getInvoiceDisplayStatus = (invoice: {
  status?: string | null;
  display_status?: string | null;
  payment_due_date?: string | null;
}): InvoiceDisplayStatus => {
  if (invoice.display_status) {
    const displayStatus = invoice.display_status as InvoiceDisplayStatus;
    if (
      displayStatus === "draft" ||
      displayStatus === "pending" ||
      displayStatus === "due_today" ||
      displayStatus === "overdue" ||
      displayStatus === "paid" ||
      displayStatus === "cancelled"
    ) {
      return displayStatus;
    }
  }

  const status = normalizeInvoiceStatus(invoice.status);
  if (status !== "generated") return status;

  const dueDate = parseDateOnly(invoice.payment_due_date);
  if (!dueDate) return "pending";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dueDate.getTime() < today.getTime()) return "overdue";
  if (dueDate.getTime() === today.getTime()) return "due_today";
  return "pending";
};

export const invoiceDisplayStatusLabel: Record<InvoiceDisplayStatus, string> = {
  draft: "Draft",
  pending: "Pending Payment",
  due_today: "Due Today",
  overdue: "Overdue",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const invoiceStatusFilterOptions: Array<{
  key: InvoiceStatusFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending", label: "Pending" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
];

