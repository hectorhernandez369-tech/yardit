import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function OpenCasesTab({ user, searchResults, onOpenCase, refreshKey }) {
  const [cases, setCases] = useState([]);
  const [admins, setAdmins] = useState({});
  const [listings, setListings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [refreshKey]);

  const loadData = async () => {
    setLoading(true);
    const allCases = await base44.entities.Case.filter({ status: "open" });
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
        <p className="text-gray-500 text-center py-8">No open cases.</p>
      ) : (
        <div className="space-y-3">
          {displayed.map(c => {
            const admin = admins[c.assigned_admin_id];
            const listing = listings[c.listing_id];
            return (
              <div key={c.id} className="bg-white border border-[#2C4F4E]/20 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-[#F3E6CF]/50 space-y-2" onClick={() => onOpenCase(c.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded break-all">{c.account_number}</span>
                  <Badge className="bg-blue-100 text-blue-800">{c.status}</Badge>
                  <Badge className={c.case_priority === "high" ? "bg-red-100 text-red-800" : c.case_priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}>{c.case_priority}</Badge>
                </div>
                <div className="text-sm font-medium break-words">{listing?.title || "—"}</div>
                <div className="text-xs text-gray-500">Assigned: {admin?.full_name || admin?.email || "—"}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}