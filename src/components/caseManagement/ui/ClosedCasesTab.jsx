import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function ClosedCasesTab({ user, searchResults, onOpenCase, refreshKey }) {
  const [cases, setCases] = useState([]);
  const [admins, setAdmins] = useState({});
  const [listings, setListings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [refreshKey]);

  const loadData = async () => {
    setLoading(true);
    const allCases = await base44.entities.Case.filter({ status: "closed" });
    setCases(allCases);

    const users = await base44.entities.User.list();
    const adminMap = {};
    users.forEach(u => { adminMap[u.id] = u; });
    setAdmins(adminMap);

    const allListings = await base44.entities.Listing.list();
    const listingMap = {};
    allListings.forEach(l => { listingMap[l.id] = l; });
    setListings(listingMap);
    setLoading(false);
  };

  const displayed = searchResults
    ? cases.filter(c => searchResults.some(sr => sr.id === c.id))
    : cases;

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="mt-4">
      {displayed.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No closed cases.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#E7D7B8] border-b-2 border-[#2C4F4E]">
                  <th className="text-left p-3">Acct #</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Admin</th>
                  <th className="text-left p-3">Disposition</th>
                  <th className="text-left p-3">Closed</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(c => {
                  const admin = admins[c.assigned_admin_id];
                  const listing = listings[c.listing_id];
                  return (
                    <tr key={c.id} className="border-b hover:bg-[#F3E6CF]/50 cursor-pointer" onClick={() => onOpenCase(c.id)}>
                      <td className="p-3 font-mono text-xs">{c.account_number}</td>
                      <td className="p-3 max-w-[200px] truncate">{listing?.title || "—"}</td>
                      <td className="p-3">{admin?.full_name || admin?.email || "—"}</td>
                      <td className="p-3"><Badge className="bg-green-100 text-green-800">{c.disposition || "—"}</Badge></td>
                      <td className="p-3 text-xs">{c.updated_date ? new Date(c.updated_date).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {displayed.map(c => {
              const admin = admins[c.assigned_admin_id];
              const listing = listings[c.listing_id];
              return (
                <div key={c.id} className="bg-white rounded-lg border p-3 space-y-1.5 cursor-pointer active:bg-gray-50" onClick={() => onOpenCase(c.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs break-all">{c.account_number}</span>
                    <Badge className="bg-green-100 text-green-800">{c.disposition || "—"}</Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{listing?.title || "—"}</p>
                  <p className="text-xs text-gray-500">{admin?.full_name || admin?.email || "—"} · {c.updated_date ? new Date(c.updated_date).toLocaleDateString() : "—"}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}