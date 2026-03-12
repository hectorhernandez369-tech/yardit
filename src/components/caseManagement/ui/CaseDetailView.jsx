import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, AlertTriangle, Flag, UserCircle } from "lucide-react";
import { isSupervisor, logAdminEvent } from "../index";
import CaseListingInfo from "./CaseListingInfo";
import CaseReportInfo from "./CaseReportInfo";
import CasePersonInfo from "./CasePersonInfo";
import CaseCommentsTimeline from "./CaseCommentsTimeline";
import CaseAuditTimeline from "./CaseAuditTimeline";
import CaseDispositionPanel from "./CaseDispositionPanel";
import CaseSupervisorActions from "./CaseSupervisorActions";

export default function CaseDetailView({ caseId, user, allAdminUsers, onClose, onRefresh, activeTab }) {
  const [caseData, setCaseData] = useState(null);
  const [listing, setListing] = useState(null);
  const [reports, setReports] = useState([]);
  const [comments, setComments] = useState([]);
  const [actions, setActions] = useState([]);
  const [reporterUser, setReporterUser] = useState(null);
  const [ownerUser, setOwnerUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [caseId]);

  const loadAll = async () => {
    setLoading(true);
    const cases = await base44.entities.Case.filter({ id: caseId });
    const c = cases[0];
    setCaseData(c);

    if (c?.listing_id) {
      const listings = await base44.entities.Listing.filter({ id: c.listing_id });
      const foundListing = listings[0] || null;
      setListing(foundListing);

      const allReports = await base44.entities.Report.filter({ listingId: c.listing_id });
      setReports(allReports);

      // Fetch reporter user from first report
      const firstReporter = allReports[0]?.reporterUserId;
      if (firstReporter) {
        try {
          const users = await base44.entities.User.filter({ id: firstReporter });
          setReporterUser(users[0] || null);
        } catch { setReporterUser(null); }
      }

      // Fetch listing owner user
      if (foundListing?.ownerUserId) {
        try {
          const owners = await base44.entities.User.filter({ id: foundListing.ownerUserId });
          setOwnerUser(owners[0] || null);
        } catch { setOwnerUser(null); }
      }
    }

    const allComments = await base44.entities.CaseComment.filter({ case_id: caseId });
    setComments(allComments.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));

    const allActions = await base44.entities.AdminAction.filter({ case_id: caseId });
    setActions(allActions.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));

    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  if (!caseData) return <div className="p-8 text-center text-red-500">Case not found</div>;

  const isAssigned = caseData.assigned_admin_id === user.id;
  const isSup = isSupervisor(user);
  const isClosed = caseData.status === "closed";

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={onClose}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <h2 className="text-lg sm:text-2xl font-bold break-all">Case: {caseData.account_number}</h2>
          <div className="flex flex-wrap gap-1.5">
            <Badge className={caseData.status === "assigned" ? "bg-amber-100 text-amber-800" : caseData.status === "open" ? "bg-blue-100 text-blue-800" : caseData.status === "submitted" ? "bg-purple-100 text-purple-800" : caseData.status === "closed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {caseData.status}
            </Badge>
            {caseData.safety_flag && <Badge className="bg-red-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Safety</Badge>}
            <Badge className={caseData.case_priority === "high" ? "bg-red-100 text-red-800" : caseData.case_priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}>
              {caseData.case_priority} priority
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CaseListingInfo listing={listing} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CasePersonInfo
                title="Reported By"
                icon={Flag}
                person={reporterUser}
                accountNumber={caseData.account_number}
                fallbackLabel="Unknown reporter"
              />
              <CasePersonInfo
                title="Listing Owner"
                icon={UserCircle}
                person={ownerUser}
                fallbackLabel="Owner info unavailable"
              />
            </div>
            <CaseReportInfo reports={reports} user={user} caseId={caseId} />
          </div>

          <div className="space-y-6">
            {caseData.status === "open" && (
              <CaseDispositionPanel caseData={caseData} user={user} allAdminUsers={allAdminUsers} isAssigned={isAssigned} onRefresh={() => { loadAll(); onRefresh(); }} />
            )}

            {caseData.status === "submitted" && isSup && (
              <CaseSupervisorActions caseData={caseData} user={user} allAdminUsers={allAdminUsers} onRefresh={() => { loadAll(); onRefresh(); }} />
            )}

            <CaseCommentsTimeline comments={comments} user={user} caseData={caseData} allAdminUsers={allAdminUsers} onRefresh={loadAll} isClosed={isClosed} />
            <CaseAuditTimeline actions={actions} allAdminUsers={allAdminUsers} />
          </div>
        </div>
      </div>
    </div>
  );
}