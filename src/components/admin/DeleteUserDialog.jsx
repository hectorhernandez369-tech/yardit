import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logUserActivity } from "@/lib/logUserActivity";
import { getAdminSession } from "./AdminLoginModal";

export default function DeleteUserDialog({ open, onClose, user, adminUser, onDeleted }) {
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setEmployeeId("");
    setPin("");
    setNotes("");
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleDelete = async () => {
    if (!user?.id) return;
    const adminSession = getAdminSession();
    if (!adminSession) {
      toast.error("Admin session expired.");
      return;
    }
    if (!employeeId.trim() || !pin.trim()) {
      toast.error("Enter Employee ID and PIN.");
      return;
    }
    if (employeeId.trim() !== adminSession.employee_id) {
      toast.error("Employee ID must match your active admin session.");
      return;
    }
    if (!notes.trim()) {
      toast.error("Notes are required before deleting a user.");
      return;
    }

    setLoading(true);
    try {
      const verifyResponse = await base44.functions.invoke("adminVerifyPin", {
        employee_id: employeeId.trim(),
        pin: pin.trim(),
      });

      if (verifyResponse.data?.user_id && verifyResponse.data.user_id !== adminSession.user_id) {
        toast.error("PIN verification did not match your admin session.");
        setLoading(false);
        return;
      }

      if (!verifyResponse.data?.ok) {
        toast.error("Invalid Employee ID or PIN.");
        setLoading(false);
        return;
      }

      await base44.entities.User.delete(user.id);

      if (adminUser?.id) {
        await base44.entities.AdminAction.create({
          admin_id: adminUser.id,
          action_type: "user_deleted",
          old_value: JSON.stringify({
            user_id: user.id,
            email: user.email || "",
            full_name: user.full_name || "",
            role: user.role || "user",
          }),
          new_value: "",
          comment: notes.trim(),
          page: window.location.pathname,
        }).catch(() => null);

        await logUserActivity({
          user_id: adminUser.id,
          event_type: "user_deleted",
          event_label: "User Deleted",
          target_type: "user",
          target_id: user.id,
          source_page: window.location.pathname,
          details_json: {
            deleted_user_email: user.email || "",
            deleted_user_name: user.full_name || "",
            admin_employee_id: employeeId.trim(),
            notes: notes.trim(),
          },
        }).catch(() => null);
      }

      toast.success("User deleted.");
      resetState();
      onDeleted?.(user.id);
      onClose();
    } catch (error) {
      console.error("Delete user failed:", error);
      toast.error("Failed to delete user.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" /> Delete User
          </DialogTitle>
          <DialogDescription>
            This permanently deletes {user?.email || "this user"}. Enter Admin PIN and notes to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Employee ID</label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Enter Employee ID" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Admin PIN</label>
            <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter Admin PIN" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this user being deleted?" className="min-h-[110px]" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}