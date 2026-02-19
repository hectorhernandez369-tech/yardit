import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, ArrowLeft, UserPlus } from "lucide-react";
import { approveCase, sendBackCase, reassignSubmittedCase, logAdminEvent } from "../index";
import { toast } from "sonner";

export default function CaseSupervisorActions({ caseData, user, allAdminUsers, onRefresh }) {
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState("");
  const [reassignTarget, setReassignTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    logAdminEvent({ adminId: user.id, caseId: caseData.id, eventType: "clicked_approve", page: "CaseManagement" });
    const res = await approveCase(caseData.id, user.id, notes.trim() || null, user);
    if (res.success) {
      toast.success("Case approved and closed");
      onRefresh();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleSendBack = async () => {
    if (!notes.trim()) { toast.error("Notes are required"); return; }
    setLoading(true);
    logAdminEvent({ adminId: user.id, caseId: caseData.id, eventType: "clicked_send_back", page: "CaseManagement" });
    const res = await sendBackCase(caseData.id, user.id, notes.trim(), user);
    if (res.success) {
      toast.success("Case sent back");
      onRefresh();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleReassign = async () => {
    if (!reassignTarget) { toast.error("Select an admin"); return; }
    setLoading(true);
    logAdminEvent({ adminId: user.id, caseId: caseData.id, eventType: "clicked_reassign", payload: { newAdminId: reassignTarget }, page: "CaseManagement" });
    const res = await reassignSubmittedCase(caseData.id, user.id, reassignTarget, notes.trim() || null, user);
    if (res.success) {
      toast.success("Case reassigned");
      onRefresh();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  return (
    <Card className="border-2 border-purple-300">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Supervisor Actions
          <Badge className="bg-purple-100 text-purple-800">Disposition: {caseData.disposition || "—"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!action && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setAction("approve")} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button onClick={() => setAction("send_back")} variant="outline" className="border-orange-400 text-orange-700">
              <ArrowLeft className="w-4 h-4 mr-1" /> Send Back
            </Button>
            <Button onClick={() => setAction("reassign")} variant="outline" className="border-indigo-400 text-indigo-700">
              <UserPlus className="w-4 h-4 mr-1" /> Reassign
            </Button>
          </div>
        )}

        {action && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Badge>{action === "approve" ? "Approving" : action === "send_back" ? "Sending Back" : "Reassigning"}</Badge>
              <button onClick={() => { setAction(null); setNotes(""); setReassignTarget(""); }} className="text-xs text-gray-500 underline">Cancel</button>
            </div>

            {action === "reassign" && (
              <Select value={reassignTarget} onValueChange={setReassignTarget}>
                <SelectTrigger><SelectValue placeholder="Select admin..." /></SelectTrigger>
                <SelectContent>
                  {allAdminUsers.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name || a.email} ({a.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Textarea
              placeholder={action === "send_back" ? "Notes (required)..." : "Optional notes..."}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />

            <Button
              disabled={loading || (action === "send_back" && !notes.trim()) || (action === "reassign" && !reassignTarget)}
              onClick={action === "approve" ? handleApprove : action === "send_back" ? handleSendBack : handleReassign}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700 w-full" : "w-full"}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {action === "approve" ? "Confirm Approve" : action === "send_back" ? "Confirm Send Back" : "Confirm Reassign"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}