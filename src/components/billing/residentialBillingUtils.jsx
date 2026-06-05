import { format } from "date-fns";
import { jsPDF } from "jspdf";

export const RESIDENTIAL_TRANSACTION_TYPES = new Set(["listing_payment", "listing_upgrade"]);

export const centsToDollars = (value) => Number(value || 0) / 100;

export const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

export const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return format(date, "MMM d, yyyy h:mm a");
};

export const getTransactionListingId = (tx) => (
  tx?.listing_id ||
  tx?.residential_listing_id ||
  tx?.related_listing_id ||
  tx?.product_id ||
  tx?.yardit_record_id ||
  tx?.location_id ||
  ""
);

export const isResidentialTransaction = (tx) => RESIDENTIAL_TRANSACTION_TYPES.has(tx?.transaction_type || "");

export const getTransactionAmounts = (tx) => {
  const original = centsToDollars(tx?.original_amount_cents ?? tx?.amount_cents);
  const discount = centsToDollars(tx?.discount_amount_cents);
  const finalAmount = centsToDollars(tx?.final_amount_cents ?? tx?.amount_cents);
  return { original, discount, finalAmount };
};

export const getListingTitle = (listing) => listing?.title || listing?.event_name || "Residential Listing";

export const getListingAddress = (listing) => (
  listing?.display_address ||
  listing?.addressText ||
  [listing?.city, listing?.state, listing?.zip].filter(Boolean).join(", ") ||
  "Not available"
);

export const getListingDates = (listing) => {
  const start = listing?.startDateTime || listing?.start_datetime;
  const end = listing?.endDateTime || listing?.end_datetime;
  if (!start && !end) return "Not available";
  return `${formatDate(start)}${end ? ` – ${formatDate(end)}` : ""}`;
};

export const buildReceiptNumber = (tx) => tx?.receipt_number || `YARDIT-${String(tx?.id || tx?.stripe_checkout_session_id || "receipt").slice(-8).toUpperCase()}`;

export const downloadResidentialReceiptPdf = ({ transaction, listing }) => {
  const doc = new jsPDF();
  const { original, discount, finalAmount } = getTransactionAmounts(transaction);
  const receiptNumber = buildReceiptNumber(transaction);
  const lines = [
    ["Receipt", receiptNumber],
    ["Listing", getListingTitle(listing)],
    ["Listing ID", listing?.id || getTransactionListingId(transaction) || "Needs Review"],
    ["Address", getListingAddress(listing)],
    ["Dates", getListingDates(listing)],
    ["Tier", listing?.tier || transaction?.pending_payment_tier || "Not available"],
    ["Status", listing?.status || "Needs Review"],
    ["Transaction ID", transaction?.stripe_payment_intent_id || transaction?.stripe_checkout_session_id || transaction?.id || "Not available"],
    ["Stripe Checkout Session", transaction?.stripe_checkout_session_id || "Not available"],
    ["Stripe Charge", transaction?.stripe_charge_id || "Not available"],
    ["Payment Status", transaction?.status || transaction?.payment_status || "Not available"],
    ["Payment Date", formatDate(transaction?.processed_at || transaction?.received_at || transaction?.created_date)],
    ["Promo Code", transaction?.promo_code || "None"],
    ["Original Amount", formatMoney(original)],
    ["Discount", formatMoney(discount)],
    ["Final Amount Paid", formatMoney(finalAmount)],
    ["Non-Refund Acknowledged", transaction?.non_refund_acknowledged ? "Yes" : "No"],
  ];

  doc.setFontSize(20);
  doc.text("Yardit Residential Receipt", 20, 20);
  doc.setFontSize(10);
  doc.text(`Generated ${formatDate(new Date().toISOString())}`, 20, 28);

  let y = 42;
  lines.forEach(([label, value]) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 20, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(String(value || "Not available"), 120);
    doc.text(wrapped, 70, y);
    y += Math.max(8, wrapped.length * 6);
  });

  doc.save(`${receiptNumber}.pdf`);
};