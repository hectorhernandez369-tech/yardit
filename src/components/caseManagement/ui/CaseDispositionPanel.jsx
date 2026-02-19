import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { setDisposition, submitCase, logAdminEvent } from "../index";
import { toast } from "sonner";

export default function CaseDispositionPanel({ caseData, user, allAdminUsers, isAssigned, onRefresh }) {
  const [disposition, setDispositionVal] = useState(caseData.disposition || "");
  const [submitComment, setSubmitComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSetDisposition = async (val) => {
    setDispositionVal(val);
    if (!isAssigned) return;
    setSaving(true);
    const res = await setDisposition(caseData.id, user.id, val, user);
    if (res.success) {
      toast.success("Disposition set");
      onRefresh();
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!submitComment.trim()) {
      toast.error("Comment is required to submit");
      return;
    }
    setSubmitting(true);
    logAdminEvent({ adminId: user.id, caseId: caseData.id, eventType: "clicked_submit", page: "CaseManagement" });
    const res = await submitCase(caseData.id, user.id, submitComment.trim(), user, allAdminUsers);
    if (res.success) {
      toast.success("Case submitted for review");
      onRefresh();
    } else {
      toast.error(res.error);
    }
    setSubmitting(false);
  };

  const isLocked = caseData.disposition_locked;

  return (
    <Card className={isAssigned ? "border-2 border-blue-300" : ""}>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex flex-wrap items-center gap-2">
          Disposition & Submit
          {!isAssigned && <Badge variant="outline" className="text-xs">Read-only</Badge>}
          {isLocked && <Badge className="bg-gray-200 text-gray-600">Locked</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Disposition</label>
          {isAssigned && !isLocked ? (
            <Select value={disposition} onValueChange={handleSetDisposition} disabled={saving}>
              <SelectTrigger>
                <SelectValue placeholder="Select disposition..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sustained">Sustained</SelectItem>
                <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
                <SelectItem value="disproven">Disproven</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className="bg-purple-100 text-purple-800">{caseData.disposition || "Not set"}</Badge>
          )}
        </div>

        {isAssigned && !isLocked && (
          <div className="space-y-2 pt-2 border-t">
            <label className="text-sm font-medium block">Submission Comment *</label>
            <Textarea placeholder="Required comment for submission..." value={submitComment} onChange={e => setSubmitComment(e.target.value)} rows={3} />
            <Button disabled={!disposition || !submitComment.trim() || submitting} onClick={handleSubmit} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Submit Case for Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}