import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function UserPromotionHistory({ user }) {
  const { data: promotions, isLoading } = useQuery({
    queryKey: ["userPromotions", user.id],
    queryFn: async () => {
      const all = await base44.entities.PromotionLog.filter({ user_id: user.id }, "-created_date");
      // Fetch admin details
      const enriched = await Promise.all(all.map(async (p) => {
        let adminEmail = p.admin_id;
        try {
           const adminUsers = await base44.entities.User.filter({ id: p.admin_id });
           if (adminUsers.length > 0) adminEmail = adminUsers[0].email;
        } catch(e) {}
        return { ...p, adminEmail };
      }));
      return enriched;
    },
    initialData: [],
  });

  if (isLoading) return <div className="p-4 text-sm text-gray-500 text-center">Loading promotions...</div>;

  if (promotions.length === 0) return <p className="text-sm text-gray-500 py-4 text-center">No promotions found.</p>;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Promotion History ({promotions.length})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">Promotion</th>
              <th className="py-2 px-2">Scope</th>
              <th className="py-2 px-2">Reason</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50/50">
                <td className="py-2 px-2 text-xs">{p.created_date ? format(new Date(p.created_date), "MMM d, yyyy") : "—"}</td>
                <td className="py-2 px-2">
                  <div className="font-medium text-xs">{p.promotion_type}</div>
                  {p.promotion_value && <div className="text-xs text-slate-500">{p.promotion_value}</div>}
                </td>
                <td className="py-2 px-2 capitalize text-xs">{p.scope}</td>
                <td className="py-2 px-2 text-xs">{p.reason}</td>
                <td className="py-2 px-2">
                  <Badge variant="outline" className={
                    p.status === "active" ? "text-green-600 border-green-200" :
                    p.status === "revoked" ? "text-red-600 border-red-200" : "text-gray-500"
                  }>
                    {p.status}
                  </Badge>
                </td>
                <td className="py-2 px-2 text-xs break-all max-w-[120px]">{p.adminEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}