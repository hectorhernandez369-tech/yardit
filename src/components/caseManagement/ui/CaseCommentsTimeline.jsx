import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { addCaseComment } from "../index";
import { toast } from "sonner";

export default function CaseCommentsTimeline({ comments, user, caseData, allAdminUsers, onRefresh, isClosed }) {
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const adminMap = {};
  allAdminUsers.forEach(a => { adminMap[a.id] = a; });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const commentType = user.role === "supervisor" || user.role === "master" ? "supervisor_note" : "admin_note";
    const res = await addCaseComment(caseData.id, user.id, newComment.trim(), commentType, user);
    if (res.success) {
      toast.success("Comment added");
      setNewComment("");
      onRefresh();
    } else {
      toast.error(res.error);
    }
    setSubmitting(false);
  };

  const typeColors = {
    admin_note: "bg-blue-100 text-blue-700",
    supervisor_note: "bg-purple-100 text-purple-700",
    system_note: "bg-gray-100 text-gray-700",
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Comments ({comments.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
        {comments.map(c => {
          const admin = adminMap[c.admin_id];
          return (
            <div key={c.id} className="border rounded-lg p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-medium break-all">{admin?.full_name || admin?.email || c.admin_id}</span>
                <Badge className={typeColors[c.comment_type] || "bg-gray-100"}>{c.comment_type}</Badge>
                <span className="text-xs text-gray-400 sm:ml-auto">{new Date(c.created_date).toLocaleString()}</span>
              </div>
              <p className="text-sm">{c.comment_text}</p>
            </div>
          );
        })}

        {!isClosed && (
          <div className="pt-3 border-t space-y-2">
            <Textarea placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} />
            <Button size="sm" disabled={!newComment.trim() || submitting} onClick={handleAddComment}>
              {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Add Comment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}