import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PUSH_RADIUS_OPTIONS } from "@/lib/pushNotifications";

export default function VendorSubscriptionManager({ user }) {
  const queryClient = useQueryClient();
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["vendorPushSubscriptions", user?.id],
    queryFn: () => base44.entities.VendorNotificationSubscription.filter({ user_id: user.id }),
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendorPushSubscriptionVendors", subscriptions.map((s) => s.vendor_account_id).join(",")],
    queryFn: async () => {
      const rows = await Promise.all(subscriptions.map((sub) => base44.entities.VendorAccount.filter({ id: sub.vendor_account_id })));
      return rows.flat();
    },
    enabled: subscriptions.length > 0,
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VendorNotificationSubscription.update(id, { ...data, updated_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorPushSubscriptions"] }),
  });

  const vendorName = (id) => vendors.find((vendor) => vendor.id === id)?.business_name || "Vendor";
  const active = subscriptions.filter((sub) => sub.subscription_enabled !== false);

  if (!active.length) return <p className="text-sm text-slate-600">No vendor subscriptions yet. Use “Notify Me When Nearby” on a vendor page.</p>;

  return <div className="space-y-3">{active.map((sub) => (
    <div key={sub.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-semibold text-[#2C4F4E]">{vendorName(sub.vendor_account_id)}</p><p className="text-xs text-slate-500">Notify when within {sub.radius_miles || 2} miles</p></div>
      <div className="flex items-center gap-2">
        <select value={sub.radius_miles || 2} onChange={(e) => updateMutation.mutate({ id: sub.id, data: { radius_miles: Number(e.target.value) } })} className="rounded-lg border px-2 py-1 text-sm">
          {PUSH_RADIUS_OPTIONS.map((miles) => <option key={miles} value={miles}>{miles} mi</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: sub.id, data: { subscription_enabled: false } })}>Unsubscribe</Button>
      </div>
    </div>
  ))}</div>;
}