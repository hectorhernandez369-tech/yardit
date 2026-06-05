import React from "react";
import { Calendar, CheckCircle2, Download, Eye, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  buildReceiptNumber,
  downloadResidentialReceiptPdf,
  formatDate,
  formatMoney,
  getListingTitle,
  getTransactionAmounts,
  getTransactionListingId,
} from "./residentialBillingUtils";

export default function ResidentialTransactionCard({ transaction, listing, variant = "profile", onViewReceipt }) {
  const { original, discount, finalAmount } = getTransactionAmounts(transaction);
  const listingId = listing?.id || getTransactionListingId(transaction) || "Needs Review";
  const paymentDate = formatDate(transaction.processed_at || transaction.received_at || transaction.created_date);
  const status = transaction.status || transaction.payment_status || "received";

  return (
    <Card className="border-2 bg-white/90 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <button className="flex-1 text-left" onClick={onViewReceipt}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{getListingTitle(listing)}</h3>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" /> {status}
              </Badge>
              {!listing && <Badge className="bg-amber-100 text-amber-800">Needs Review</Badge>}
            </div>

            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden">
              <span className="truncate"><strong>Type:</strong> {listing?.listingType || "residential"}</span>
              <span className="truncate"><strong>Tier:</strong> {listing?.tier || "Not available"}</span>
              <span className="truncate"><strong>Status:</strong> {listing?.status || "Needs Review"}</span>
              <span className="truncate"><strong>Listing ID:</strong> {listingId}</span>
              <span className="flex items-center gap-1 truncate"><Calendar className="w-3 h-3 shrink-0" /> {paymentDate}</span>
              <span className="truncate"><strong>Receipt:</strong> {buildReceiptNumber(transaction)}</span>
              <span className="truncate"><strong>Promo:</strong> {transaction.promo_code || "None"}</span>
            </div>
          </button>

          <div className="lg:text-right shrink-0 space-y-1">
            <p className="text-xs text-slate-500">Final amount paid</p>
            <p className="text-2xl font-bold text-[#2C4F4E]">{formatMoney(finalAmount)}</p>
            {discount > 0 && <p className="text-xs text-green-700">Saved {formatMoney(discount)}</p>}
          </div>
        </div>

        <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2 overflow-hidden">
          <span className="truncate"><strong>Transaction ID:</strong> {transaction.stripe_payment_intent_id || transaction.stripe_checkout_session_id || transaction.id || "Not available"}</span>
          <span className="truncate"><strong>Stripe Checkout Session:</strong> {transaction.stripe_checkout_session_id || "Not available"}</span>
          <span className="truncate"><strong>Stripe Charge:</strong> {transaction.stripe_charge_id || "Not available"}</span>
          <span className="truncate"><strong>Refund Status:</strong> {transaction.refund_status || "none"}</span>
          <span className="truncate"><strong>Non-refund acknowledgement:</strong> {transaction.non_refund_acknowledged ? "Acknowledged" : "Not acknowledged"}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span>Original: <strong>{formatMoney(original)}</strong></span>
            <span>Discount: <strong>{formatMoney(discount)}</strong></span>
            <span>Final: <strong>{formatMoney(finalAmount)}</strong></span>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onViewReceipt}>
              {variant === "billing" ? <ReceiptText className="w-4 h-4" /> : <Eye className="w-4 h-4" />} <span className="hidden sm:inline">View Receipt</span>
            </Button>
            <Button size="sm" onClick={() => downloadResidentialReceiptPdf({ transaction, listing })} className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border border-[#2C4F4E]">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download Receipt</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}