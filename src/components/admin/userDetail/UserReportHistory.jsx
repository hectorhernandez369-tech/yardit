import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UserReportHistory({ user }) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["userReports", user.id],
    queryFn: async () => {
      const [allReports, userListings, allCases] = await Promise.all([
        base44.entities.Report.list("-created_date"),
        base44.entities.Listing.filter({ ownerUserId: user.id }),
        base44.entities.Case.list(),
      ]);

      const userListingIds = new Set(userListings.map((l) => l.id));

      // Reports filed BY this user
      const asReporter = allReports.filter((r) => r.reporterUserId === user.id);
      // Reports filed AGAINST this user's listings
      const asOwner = allReports.filter((r) => userListingIds.has(r.listingId) && r.reporterUserId !== user.id);

      // Map cases by listing for quick lookup
      const caseByListing = {};
      allCases.forEach((c) => { caseByListing[c.listing_id] = c; });

      return { asReporter, asOwner, caseByListing };
    },
    initialData: { asReporter: [], asOwner: [], caseByListing: {} },
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  const { asReporter, asOwner, caseByListing } = data;

  const ReportTable = ({ reports, label }) => {
    if (reports.length === 0) return <p className="text-sm text-gray-500 py-2">No reports {label}.</p>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2 px-2">Reason</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2">Created</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const linkedCase = caseByListing[r.listingId];
              return (
                <tr key={r.id} className="border-b hover:bg-gray-50/50">
                  <td className="py-2 px-2 text-xs max-w-[200px] truncate">{r.reason_label || r.reason || "—"}</td>
                  <td className="py-2 px-2">
                    <Badge className={r.resolved ? "bg-green-600" : "bg-orange-500"}>
                      {r.resolved ? "Resolved" : "Open"}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-xs">{r.created_date ? format(new Date(r.created_date), "MMM d, yyyy") : "—"}</td>
                  <td className="py-2 px-2">
                    {linkedCase ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => navigate(createPageUrl("AdminLite") + `?tab=cases&openCaseId=${linkedCase.id}`)}
                      >
                        <ExternalLink className="w-3 h-3" /> Case
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">No case</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Reports Filed by User ({asReporter.length})</h3>
        <ReportTable reports={asReporter} label="filed by this user" />
      </div>
      <div>
        <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Reports Against User's Listings ({asOwner.length})</h3>
        <ReportTable reports={asOwner} label="against this user's listings" />
      </div>
    </div>
  );
}