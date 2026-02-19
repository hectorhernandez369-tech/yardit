import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logAdminEvent } from "../index";

export default function CaseReportInfo({ reports, user, caseId }) {
  const [expandedPhotos, setExpandedPhotos] = useState({});

  const handleViewPhoto = (reportId) => {
    logAdminEvent({ adminId: user.id, caseId, eventType: "viewed_photo", payload: { reportId }, page: "CaseManagement" });
    setExpandedPhotos(prev => ({ ...prev, [reportId]: !prev[reportId] }));
  };

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Report Information</CardTitle></CardHeader>
        <CardContent><p className="text-gray-500">No reports linked to this case.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Reports ({reports.length})</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {reports.map((r, i) => (
          <div key={r.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-orange-100 text-orange-800">{r.reason_code || r.reason}</Badge>
              <span className="text-xs text-gray-500">{new Date(r.created_date).toLocaleString()}</span>
            </div>
            <p className="text-sm font-medium">{r.reason_label || r.reason}</p>
            {r.details && <p className="text-xs text-gray-600">{r.details}</p>}
            {r.other_details && <p className="text-xs text-gray-600 italic">{r.other_details}</p>}
            <div className="text-xs text-gray-500">
              Reporter: <button
                onClick={() => {
                  logAdminEvent({ adminId: user.id, caseId, eventType: "viewed_contact_info", payload: { reporterUserId: r.reporterUserId }, page: "CaseManagement" });
                }}
                className="text-blue-600 underline"
              >{r.reporterUserId}</button>
            </div>
            {r.photo_urls?.length > 0 && (
              <div>
                <button onClick={() => handleViewPhoto(r.id)} className="text-xs text-blue-600 underline">
                  {expandedPhotos[r.id] ? "Hide" : "View"} evidence photos ({r.photo_urls.length})
                </button>
                {expandedPhotos[r.id] && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {r.photo_urls.map((url, j) => (
                      <img key={j} src={url} alt={`evidence-${j}`} className="w-24 h-24 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}