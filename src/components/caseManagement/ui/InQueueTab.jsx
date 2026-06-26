import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { assignCaseToSelf, assignCase, isSupervisor, logAdminEvent } from "../index";
import { toast } from "sonner";
import AssignDialog from "./AssignDialog";
import { useQueryClient } from "@tanstack/react-query";

export default function InQueueTab({ user, allAdminUsers, searchResults, onOpenCase, onRefresh, refreshKey }) {
  const queryClient = useQueryClient();
  const [cases, setCases] = useState([]);
  const [listings, setListings] = useState({});
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(null);

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    setLoading(true);
    const allCases = await base44.entities.Case.filter({ status: "in_queue" });
    setCases(allCases);

    const listingIds = [...new Set(allCases.map(c => c.listing_id).filter(Boolean))];
    if (listingIds.length > 0) {
      const listingResults = await Promise.all(
        listingIds.map(id => base44.entities.Listing.filter({ id }))
      );
      const map = {};
      listingResults.flat().forEach(l => { map[l.id] = l; });
      setListings(map);
    }

    if (listingIds.length > 0) {
      const reportResults = await Promise.all(
        listingIds.map(id => base44.entities.Report.filter({ listingId: id }))
      );
      const reportMap = {};
      reportResults.flat().forEach(r => {
        if (!reportMap[r.listingId]) reportMap[r.listingId] = [];
        reportMap[r.listingId].push(r);
      });
      setReports(reportMap);
    }
    setLoading(false);
  };

  const handleAssignSelf = async (caseItem) => {
    setAssigning(caseItem.id);
    logAdminEvent({ adminId: user.id, caseId: caseItem.id, eventType: "clicked_assign_self", page: "CaseManagement" });
    const res = await assignCaseToSelf(caseItem.id, user.id, user);
    if (res.success) {
      toast.success("Case assigned to you");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onRefresh();
    } else {
      toast.error(res.error);
    }
    setAssigning(null);
  };

  const handleAssignOther = async (caseItem, targetAdminId) => {
    setAssigning(caseItem.id);
    logAdminEvent({ adminId: user.id, caseId: caseItem.id, eventType: "clicked_assign_other", payload: { targetAdminId }, page: "CaseManagement" });
    const res = await assignCase(caseItem.id, user.id, targetAdminId, user);
    if (res.success) {
      toast.success("Case assigned");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onRefresh();
    } else {
      toast.error(res.error);
    }
    setAssigning(null);
    setShowAssignDialog(null);
  };

  const displayed = searchResults
    ? cases.filter(c => searchResults.some(sr => sr.id === c.id))
    : cases;

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  const priorityColors = { high: "bg-red-100 text-red-800", medium: "bg-yellow-100 text-yellow-800", low: "bg-blue-100 text-blue-800" };

  return (
    <div className="mt-4">
      <div className="mb-3 rounded-xl border-2 border-orange-300 bg-orange-50 p-3">
        <p className="text-sm font-bold text-orange-900">General Unassigned Queue</p>
        <p className="text-xs text-orange-700">These cases are not assigned to an admin yet. Claim one with “Assign Self” or assign it to another admin.</p>
      </div>
      {displayed.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No unassigned cases are waiting in the general queue.</p>
      ) : (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#E7D7B8] border-b-2 border-[#2C4F4E]">
                <th className="text-left p-3">Acct #</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Report Type</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-left p-3">Safety</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(c => {
                const listing = listings[c.listing_id];
                const caseReports = reports[c.listing_id] || [];
                const latestReport = caseReports[0];
                return (
                  <tr key={c.id} className="border-b hover:bg-[#F3E6CF]/50">
                    <td className="p-3 font-mono text-xs">{c.account_number}</td>
                    <td className="p-3 max-w-[200px] truncate">{listing?.title || "—"}</td>
                    <td className="p-3 text-xs">{latestReport?.reason_code || "—"}</td>
                    <td className="p-3 text-xs">{latestReport?.created_date ? new Date(latestReport.created_date).toLocaleDateString() : "—"}</td>
                    <td className="p-3"><Badge className={priorityColors[c.case_priority] || ""}>{c.case_priority}</Badge></td>
                    <td className="p-3">{c.safety_flag ? <Badge className="bg-red-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Safety</Badge> : "—"}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onOpenCase(c.id)}>View More Details</Button>
                        <Button size="sm" variant="outline" onClick={() => handleAssignSelf(c)} disabled={assigning === c.id}>
                          {assigning === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign Self"}
                        </Button>
                        {isSupervisor(user) && (
                          <Button size="sm" variant="outline" onClick={() => setShowAssignDialog(c)}>Assign</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Mobile card layout */}
      {displayed.length > 0 && (
        <div className="md:hidden space-y-3">
          {displayed.map(c => {
            const listing = listings[c.listing_id];
            const caseReports = reports[c.listing_id] || [];
            const latestReport = caseReports[0];
            return (
              <div key={c.id} className="bg-white rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs break-all">{c.account_number}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <Badge className={priorityColors[c.case_priority] || ""}>{c.case_priority}</Badge>
                    {c.safety_flag && <Badge className="bg-red-600 text-white text-[10px]">Safety</Badge>}
                  </div>
                </div>
                <p className="text-sm font-medium truncate">{listing?.title || "—"}</p>
                <p className="text-xs text-gray-500 truncate">{listing ? `${listing.addressText || ""}, ${listing.city || ""}` : ""}</p>
                <p className="text-xs text-gray-500">{latestReport?.reason_label || latestReport?.reason_code || "—"} · {latestReport?.created_date ? new Date(latestReport.created_date).toLocaleDateString() : "—"}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="ghost" className="w-full" onClick={() => onOpenCase(c.id)}>View More Details</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleAssignSelf(c)} disabled={assigning === c.id}>
                    {assigning === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign Self"}
                  </Button>
                  {isSupervisor(user) && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowAssignDialog(c)}>Assign</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showAssignDialog && (
        <AssignDialog
          caseItem={showAssignDialog}
          adminUsers={allAdminUsers}
          onAssign={(targetId) => handleAssignOther(showAssignDialog, targetId)}
          onClose={() => setShowAssignDialog(null)}
          loading={assigning === showAssignDialog?.id}
        />
      )}
    </div>
  );
}