import React from "react";
import { ArrowLeft, Download, FileText, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  buildReceiptNumber,
  downloadResidentialReceiptPdf,
  formatDate,
  formatMoney,
  getListingAddress,
  getListingDates,
  getListingTitle,
  getTransactionAmounts,
  getTransactionListingId,
} from "./residentialBillingUtils";

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 border-b border-slate-100 py-2 text-sm">
    <span className="font-medium text-slate-500">{label}</span>
    <span className="sm:text-right text-slate-900 break-all">{value || "Not available"}</span>
  </div>
);

export default function ResidentialReceiptDetail({ transaction, listing, onBack, onBackToListings }) {
  if (!transaction) return null;

  const { original, discount, finalAmount } = getTransactionAmounts(transaction);
  const receiptNumber = buildReceiptNumber(transaction);
  const listingId = listing?.id || getTransactionListingId(transaction) || "Needs Review";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Transactions
        </Button>
        <div className="flex gap-2">
          {onBackToListings && (
            <Button variant="outline" onClick={onBackToListings} className="flex-1 sm:flex-none">
              <ListChecks className="w-4 h-4" /> Back to My Listings
            </Button>
          )}
          <Button onClick={() => downloadResidentialReceiptPdf({ transaction, listing })} className="flex-1 sm:flex-none bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E]">
            <Download className="w-4 h-4" /> Download Receipt PDF
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-xl bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Residential Receipt
            <Badge variant="outline">{receiptNumber}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-bold text-[#2C4F4E] mb-3">Listing Details</h3>
            <DetailRow label="Title" value={getListingTitle(listing)} />
            <DetailRow label="Address / Location" value={getListingAddress(listing)} />
            <DetailRow label="Dates" value={getListingDates(listing)} />
            <DetailRow label="Tier" value={listing?.tier || "Not available"} />
            <DetailRow label="Status" value={listing?.status || "Needs Review"} />
            <DetailRow label="Listing ID" value={listingId} />
          </div>

          <div>
            <h3 className="font-bold text-[#2C4F4E] mb-3">Billing Details</h3>
            <DetailRow label="Transaction ID" value={transaction.stripe_payment_intent_id || transaction.stripe_checkout_session_id || transaction.id} />
            <DetailRow label="Receipt Number" value={receiptNumber} />
            <DetailRow label="Stripe Checkout Session ID" value={transaction.stripe_checkout_session_id} />
            <DetailRow label="Stripe Charge ID" value={transaction.stripe_charge_id} />
            <DetailRow label="Original Amount" value={formatMoney(original)} />
            <DetailRow label="Discount" value={formatMoney(discount)} />
            <DetailRow label="Promo Code" value={transaction.promo_code || "None"} />
            <DetailRow label="Final Amount Paid" value={formatMoney(finalAmount)} />
            <DetailRow label="Payment Status" value={transaction.status || transaction.payment_status} />
            <DetailRow label="Payment Date" value={formatDate(transaction.processed_at || transaction.received_at || transaction.created_date)} />
            <DetailRow label="Non-Refund Acknowledgement" value={transaction.non_refund_acknowledged ? `Acknowledged${transaction.non_refund_acknowledged_at ? ` on ${formatDate(transaction.non_refund_acknowledged_at)}` : ""}` : "Not acknowledged"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}