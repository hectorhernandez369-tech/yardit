import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function TransferOwnershipCard({ account, user, canTransfer, onRefresh }) {
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const normalizedEmail = newOwnerEmail.trim().toLowerCase();

  const openTransferDialog = () => {
    if (!canTransfer) return toast.error("Only the business owner can transfer ownership.");
    if (!normalizedEmail || !normalizedEmail.includes("@")) return toast.error("Enter the new owner's email first.");
    if (normalizedEmail === account.owner_email?.toLowerCase()) return toast.error("That email is already the owner.");
    setShowConfirmDialog(true);
  };

  const confirmTransfer = async () => {
    setTransferring(true);
    await base44.entities.VendorAccount.update(account.id, {
      owner_email: normalizedEmail,
      owner_user_id: normalizedEmail,
      ownership_transferred_at: new Date().toISOString(),
      ownership_transferred_by: user?.id,
    });
    setTransferring(false);
    setShowConfirmDialog(false);
    setNewOwnerEmail("");
    toast.success("Ownership transferred");
    onRefresh?.();
  };

  return (
    <>
      <Card className="rounded-2xl overflow-hidden bg-white shadow-sm">
        <CardHeader className="p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Transfer Ownership</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(!expanded)} className="rounded-full">
              {expanded ? "Collapse" : "Open"}
            </Button>
          </div>
        </CardHeader>
        {expanded && (
          <CardContent className="space-y-2.5 p-3 pt-0 sm:p-5 sm:pt-0">
             <p className="text-sm text-slate-600">Move this business account to a different Yardit user dashboard.</p>
             <Input placeholder="New owner email" value={newOwnerEmail} onChange={(e) => setNewOwnerEmail(e.target.value)} disabled={!canTransfer} />
             <Button onClick={openTransferDialog} disabled={!canTransfer} variant="outline" className="w-full border-amber-300 text-amber-800 hover:bg-amber-50">
               Transfer Ownership
             </Button>
             {!canTransfer && <p className="text-xs text-muted-foreground">Only the business owner can transfer this account.</p>}
           </CardContent>
        )}
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Confirm Ownership Transfer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">Transfer <strong>{account.business_name}</strong> to <strong>{normalizedEmail}</strong>?</p>
            <p className="text-xs text-slate-500">After confirming, this account will show in the new owner's Vendor Dashboard.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={confirmTransfer} disabled={transferring} className="flex-1 bg-amber-600 hover:bg-amber-700">
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}