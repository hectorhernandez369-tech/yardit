import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

function withinDays(dateString, days) {
  const createdAt = new Date(dateString || 0).getTime();
  if (!createdAt) return false;
  return Date.now() - createdAt <= days * 24 * 60 * 60 * 1000;
}

export default function UserTrustSafetySummary({ user }) {
  const { data, isLoading } = useQuery({
    queryKey: ["userTrustSafetySummary", user.id],
    queryFn: async () => {
      const [reports, cases] = await Promise.all([
        base44.entities.Report.list("-created_date"),
        base44.entities.Case.list(),
      ]);

      const userReports = reports.filter((report) => report.reporterUserId === user.id);
      const caseByListingId = Object.fromEntries(cases.map((item) => [item.listing_id, item]));

      return userReports.map((report) => ({
        ...report,
        linkedCase: caseByListingId[report.listingId] || null,
      }));
    },
    initialData: [],
  });

  const summary = useMemo(() => {
    const repeatedTargets = Object.values(
      data.reduce((acc, report) => {
        const key = report.listingId || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).filter((count) => count > 1).length;

    const dismissedReports = data.filter((report) => report.linkedCase?.disposition === "disproven").length;
    const actionedReports = data.filter((report) => {
      if (report.linkedCase?.disposition && report.linkedCase?.disposition !== "disproven") return true;
      return report.resolved === true && report.linkedCase?.disposition !== "disproven";
    }).length;

    const reports24h = data.filter((report) => withinDays(report.created_date, 1)).length;
    const reports7d = data.filter((report) => withinDays(report.created_date, 7)).length;
    const reports30d = data.filter((report) => withinDays(report.created_date, 30)).length;

    return {
      totalReports: data.length,
      reports24h,
      reports7d,
      reports30d,
      dismissedReports,
      actionedReports,
      repeatedTargets,
      highFrequency: reports24h >= 5 || reports7d >= 10 || reports30d >= 20,
    };
  }, [data]);

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span>Trust &amp; Safety Snapshot</span>
          {summary.highFrequency && <Badge className="bg-red-600 text-white">High-frequency reporting</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border p-3"><p className="text-gray-500 text-xs">Total Reports</p><p className="font-semibold">{summary.totalReports}</p></div>
          <div className="rounded-md border p-3"><p className="text-gray-500 text-xs">Last 24 Hours</p><p className="font-semibold">{summary.reports24h}</p></div>
          <div className="rounded-md border p-3"><p className="text-gray-500 text-xs">Last 7 Days</p><p className="font-semibold">{summary.reports7d}</p></div>
          <div className="rounded-md border p-3"><p className="text-gray-500 text-xs">Last 30 Days</p><p className="font-semibold">{summary.reports30d}</p></div>
          <div className="rounded-md border p-3"><p className="text-gray-500 text-xs">Dismissed</p><p className="font-semibold">{summary.dismissedReports}</p></div>
          <div className="rounded-md border p-3"><p className="text-gray-500 text-xs">Actioned</p><p className="font-semibold">{summary.actionedReports}</p></div>
          <div className="rounded-md border p-3 sm:col-span-2"><p className="text-gray-500 text-xs">Repeated Same Target</p><p className="font-semibold">{summary.repeatedTargets}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}