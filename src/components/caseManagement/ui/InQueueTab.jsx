import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { assignCaseToSelf, assignCase, isSupervisor, logAdminEvent } from "../index";
import { toast } from "sonner";
import AssignDialog from "./AssignDialog";

export default function InQueueTab({ user, allAdminUsers, searchResults, onOpenCase, onRefresh, refreshKey }) {
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
      const allListings = await base44.entities.Listing.list();
      const map = {};
      allListings.forEach(l => { map[l.id] = l; });
      setListings(map);
    }

    const allReports = await base44.entities.Report.list();
    const reportMap = {};
    allReports.forEach(r => {
      if (!reportMap[r.listingId]) reportMap[r.listingId] = [];
      reportMap[r.listingId].push(r);
    });
    setReports(reportMap);
    setLoading(false);
  };

  const handleAssignSelf = async (caseItem) => {
    setAssigning(caseItem.id);
    logAdminEvent({ adminId: user.id, caseId: caseItem.id, eventType: "clicked_assign_self", page: "CaseManagement" });
    const res = await assignCaseToSelf(caseItem.id, user.id, user);
    if (res.success) {
      toast.success("Case assigned to you");
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
      {displayed.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No cases in queue.</p>
      ) : (
        <div className="space-y-3">
          {displayed.map(c => {
            const listing = listings[c.listing_id];
            const caseReports = reports[c.listing_id] || [];
            const latestReport = caseReports[0];
            return (
              <div key={c.id} className="bg-white border border-[#2C4F4E]/20 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded break-all">{c.account_number}</span>
                  <Badge className={priorityColors[c.case_priority] || ""}>{c.case_priority}</Badge>
                  {c.safety_flag && <Badge className="bg-red-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Safety</Badge>}
                </div>
                <div className="text-sm font-medium break-words">{listing?.title || "—"}</div>
                <div className="text-xs text-gray-500 break-words">{listing ? `${listing.addressText || ""}, ${listing.city || ""}` : "—"}</div>
                {latestReport && (
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">{latestReport.reason_code}</span> · {latestReport.reason_label || latestReport.reason || "—"} · {latestReport.created_date ? new Date(latestReport.created_date).toLocaleDateString() : "—"}
                  </div>
                )}
                <div className="text-xs text-gray-400 break-all">ID: {c.listing_id?.slice(0, 12)}...</div>
                <div className="flex gap-2 flex-wrap pt-1">
                  <Button size="sm" variant="outline" onClick={() => handleAssignSelf(c)} disabled={assigning === c.id} className="text-xs">
                    {assigning === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign Self"}
                  </Button>
                  {isSupervisor(user) && (
                    <Button size="sm" variant="outline" onClick={() => setShowAssignDialog(c)} className="text-xs">Assign</Button>
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