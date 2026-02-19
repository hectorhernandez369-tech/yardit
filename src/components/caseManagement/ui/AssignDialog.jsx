import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AssignDialog({ caseItem, adminUsers, onAssign, onClose, loading }) {
  const [targetId, setTargetId] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Case: {caseItem.account_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue placeholder="Select admin..." /></SelectTrigger>
            <SelectContent>
              {adminUsers.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.full_name || a.email} ({a.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!targetId || loading} onClick={() => onAssign(targetId)}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}