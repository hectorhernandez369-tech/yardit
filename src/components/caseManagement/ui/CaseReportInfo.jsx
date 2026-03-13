import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { logAdminEvent } from "../index";

function getReporterLabel(report, reportUsers) {
  const reporter = reportUsers?.[report.reporterUserId];
  return reporter?.full_name || reporter?.email || report.reporterUserId || "Unknown reporter";
}

function getReportStatus(report) {
  return report?.resolved ? "Resolved" : "Open";
}

export default function CaseReportInfo({ reports, reportUsers, comments, actions, user, caseId }) {
  const [expandedPhotos, setExpandedPhotos] = useState({});
  const [selectedHistoryReportId, setSelectedHistoryReportId] = useState(null);

  const handleViewPhoto = (reportId) => {
    logAdminEvent({ adminId: user.id, caseId, eventType: "viewed_photo", payload: { reportId }, page: "CaseManagement" });
    setExpandedPhotos((prev) => ({ ...prev, [reportId]: !prev[reportId] }));
  };

  const sortedReports = useMemo(
    () => [...(reports || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
    [reports]
  );

  if (!sortedReports.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Report Information</CardTitle></CardHeader>
        <CardContent><p className="text-gray-500">No reports linked to this case.</p></CardContent>
      </Card>
    );
  }

  const activeReport = sortedReports[0];
  const historyReports = sortedReports.slice(1);
  const selectedHistoryReport = historyReports.find((report) => report.id === selectedHistoryReportId) || null;

  if (selectedHistoryReport) {
    const reportTime = new Date(selectedHistoryReport.created_date).getTime();
    const relatedComments = (comments || []).filter((comment) => new Date(comment.created_date).getTime() >= reportTime);
    const relatedActions = (actions || []).filter((action) => new Date(action.created_date).getTime() >= reportTime);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Historical Report Details</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSelectedHistoryReportId(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge className="bg-orange-100 text-orange-800">{selectedHistoryReport.reason_code || selectedHistoryReport.reason}</Badge>
              <span className="text-xs text-gray-500">{new Date(selectedHistoryReport.created_date).toLocaleString()}</span>
            </div>
            <p className="text-sm font-medium">{selectedHistoryReport.reason_label || selectedHistoryReport.reason}</p>
            {selectedHistoryReport.details && <p className="text-xs text-gray-600">{selectedHistoryReport.details}</p>}
            {selectedHistoryReport.other_details && <p className="text-xs text-gray-600 italic">{selectedHistoryReport.other_details}</p>}
            <div className="grid gap-1 text-xs text-gray-500">
              <p>Reporter: {getReporterLabel(selectedHistoryReport, reportUsers)}</p>
              <p>Status: {getReportStatus(selectedHistoryReport)}</p>
              {selectedHistoryReport.resolvedAt && <p>Resolved: {new Date(selectedHistoryReport.resolvedAt).toLocaleString()}</p>}
              {selectedHistoryReport.resolvedByUserId && <p>Resolved By: {selectedHistoryReport.resolvedByUserId}</p>}
            </div>
            {selectedHistoryReport.photo_urls?.length > 0 && (
              <div>
                <button onClick={() => handleViewPhoto(selectedHistoryReport.id)} className="text-xs text-blue-600 underline">
                  {expandedPhotos[selectedHistoryReport.id] ? "Hide" : "View"} evidence photos ({selectedHistoryReport.photo_urls.length})
                </button>
                {expandedPhotos[selectedHistoryReport.id] && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedHistoryReport.photo_urls.map((url, index) => (
                      <img key={index} src={url} alt={`history-evidence-${index}`} className="w-24 h-24 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <h4 className="font-medium text-sm">Admin Comments / Notes</h4>
            {relatedComments.length === 0 ? (
              <p className="text-xs text-gray-500">No admin comments after this report.</p>
            ) : (
              relatedComments.map((comment) => (
                <div key={comment.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-gray-500">
                    <span>{comment.comment_type}</span>
                    <span>{new Date(comment.created_date).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.comment_text}</p>
                </div>
              ))
            )}
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <h4 className="font-medium text-sm">Timestamps / History</h4>
            {relatedActions.length === 0 ? (
              <p className="text-xs text-gray-500">No admin history after this report.</p>
            ) : (
              relatedActions.map((action) => (
                <div key={action.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-gray-500">
                    <span>{action.action_type}</span>
                    <span>{new Date(action.created_date).toLocaleString()}</span>
                  </div>
                  {action.comment && <p className="text-sm text-gray-700">{action.comment}</p>}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Current Report</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-orange-100 text-orange-800">{activeReport.reason_code || activeReport.reason}</Badge>
              <span className="text-xs text-gray-500">{new Date(activeReport.created_date).toLocaleString()}</span>
            </div>
            <p className="text-sm font-medium">{activeReport.reason_label || activeReport.reason}</p>
            {activeReport.details && <p className="text-xs text-gray-600">{activeReport.details}</p>}
            {activeReport.other_details && <p className="text-xs text-gray-600 italic">{activeReport.other_details}</p>}
            <div className="grid gap-1 text-xs text-gray-500">
              <p>Reporter: {getReporterLabel(activeReport, reportUsers)}</p>
              <p>Status: {getReportStatus(activeReport)}</p>
            </div>
            {activeReport.photo_urls?.length > 0 && (
              <div>
                <button onClick={() => handleViewPhoto(activeReport.id)} className="text-xs text-blue-600 underline">
                  {expandedPhotos[activeReport.id] ? "Hide" : "View"} evidence photos ({activeReport.photo_urls.length})
                </button>
                {expandedPhotos[activeReport.id] && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {activeReport.photo_urls.map((url, index) => (
                      <img key={index} src={url} alt={`active-evidence-${index}`} className="w-24 h-24 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Report History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {historyReports.length === 0 ? (
            <p className="text-sm text-gray-500">No prior reports for this listing.</p>
          ) : (
            historyReports.map((report) => (
              <div key={report.id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1 text-sm min-w-0">
                  <p className="font-medium">{report.reason_label || report.reason}</p>
                  <p className="text-xs text-gray-500">Date: {new Date(report.created_date).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Status: {getReportStatus(report)}</p>
                  <p className="text-xs text-gray-500 break-all">Reporter: {getReporterLabel(report, reportUsers)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedHistoryReportId(report.id)}>
                  View Report
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}