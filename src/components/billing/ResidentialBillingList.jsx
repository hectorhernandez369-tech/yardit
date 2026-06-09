import React, { useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ResidentialReceiptDetail from "./ResidentialReceiptDetail";
import ResidentialTransactionCard from "./ResidentialTransactionCard";
import { getDisplayResidentialTransactions, getTransactionAmounts } from "./residentialBillingUtils";

export default function ResidentialBillingList({ transactions = [], listings = [], isLoading, emptyMessage, variant = "profile", onBackToListings, collapsibleTransactions = false }) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const listingsById = useMemo(() => new Map(listings.map((listing) => [listing.id, listing])), [listings]);
  const displayTransactions = useMemo(() => getDisplayResidentialTransactions(transactions), [transactions]);

  const getListingForTransaction = (transaction) => {
    const directId = transaction.listing_id || transaction.residential_listing_id || transaction.related_listing_id || transaction.product_id || transaction.sale_listing_id || transaction.yardit_record_id || transaction.location_id;
    if (directId && listingsById.has(directId)) return listingsById.get(directId);
    return listings.find((listing) => listing.stripe_checkout_session_id === transaction.stripe_checkout_session_id || listing.stripe_payment_intent_id === transaction.stripe_payment_intent_id) || null;
  };

  const selectedListing = selectedTransaction ? getListingForTransaction(selectedTransaction) : null;
  const totalPaid = displayTransactions.reduce((sum, tx) => sum + getTransactionAmounts(tx).finalAmount, 0);

  if (selectedTransaction) {
    return (
      <ResidentialReceiptDetail
        transaction={selectedTransaction}
        listing={selectedListing}
        onBack={() => setSelectedTransaction(null)}
        onBackToListings={onBackToListings}
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </CardContent>
      </Card>
    );
  }

  const TransactionHistoryCard = (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> Listing Transaction History
          <span className="text-sm font-normal text-gray-500">({displayTransactions.length} total)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayTransactions.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No listing payments yet</h3>
            <p className="text-gray-500">{emptyMessage || "Listing payment history will appear here after checkout."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTransactions.map((transaction) => (
              <ResidentialTransactionCard
                key={transaction.id || transaction.stripe_checkout_session_id}
                transaction={transaction}
                listing={getListingForTransaction(transaction)}
                variant={variant}
                onViewReceipt={() => setSelectedTransaction(transaction)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Listing Billing Total</p>
            <p className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-2">{displayTransactions.length} transaction{displayTransactions.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {collapsibleTransactions ? (
        <details className="group rounded-3xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-4 py-3 font-semibold text-slate-800">
            <span>Transaction History</span>
            <span className="text-sm text-slate-500 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="px-4 pb-4 pt-2">{TransactionHistoryCard}</div>
        </details>
      ) : (
        TransactionHistoryCard
      )}
    </div>
  );
}