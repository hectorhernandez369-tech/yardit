import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentHistory({ payments, locations, isLoading }) {
  const getLocationTitle = (locationId) => {
    const location = locations.find((loc) => loc.id === locationId);
    return location?.title || "Unknown Location";
  };

  const getTotalSpent = () => {
    return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-green-600">
                ${getTotalSpent().toFixed(2)}
              </p>
            </div>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <CreditCard className="w-4 h-4" />
              {payments.length} transaction{payments.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {locations.length} location{locations.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Transaction History
            <span className="text-sm font-normal text-gray-500">
              ({payments.length} total)
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No payments yet</h3>
              <p className="text-gray-500">
                Your payment history will appear here after you create a paid listing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <Card key={payment.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{getLocationTitle(payment.location_id)}</h3>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-300"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {payment.status === "completed" ? "Completed" : payment.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(payment.created_date), "MMM d, yyyy")}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {payment.plan === "5_day" ? "5-Day Plan" : "Monthly Plan"}
                          </Badge>
                          <span className="text-gray-400">•</span>
                          <span>{payment.duration_days} days</span>
                        </div>

                        {payment.transaction_id && (
                          <p className="text-xs text-gray-400 mt-2 font-mono">
                            Transaction: {payment.transaction_id}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ${payment.amount?.toFixed(2)}
                        </p>
                        {payment.payment_method && (
                          <p className="text-xs text-gray-500 mt-1">
                            {payment.payment_method}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Breakdown */}
      {payments.length > 0 && (
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base">Plan Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">5-Day Plans</p>
                <p className="text-2xl font-bold text-orange-600">
                  {payments.filter((p) => p.plan === "5_day").length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  $
                  {payments
                    .filter((p) => p.plan === "5_day")
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toFixed(2)}{" "}
                  total
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Monthly Plans</p>
                <p className="text-2xl font-bold text-purple-600">
                  {payments.filter((p) => p.plan === "monthly").length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  $
                  {payments
                    .filter((p) => p.plan === "monthly")
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toFixed(2)}{" "}
                  total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}