import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { hashVendorPasscode, saveVendorPortalSession } from "@/lib/vendorPasscode";

export default function VendorPortalGate({ account, authorizedUser, user, onUnlock }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setChecking(true);
    const enteredHash = await hashVendorPasscode(passcode);
    setChecking(false);

    const isOwner = account.owner_user_id === user?.id || account.owner_user_id === user?.email;

    if (!isOwner && (!authorizedUser || authorizedUser.status !== "active")) {
      setError("Access denied. Your Yardit account is not authorized for this business.");
      return;
    }

    if (!account.vendor_dashboard_passcode_hash) {
      setError("This business has not created a Vendor Dashboard passcode yet.");
      return;
    }

    if (enteredHash !== account.vendor_dashboard_passcode_hash) {
      setError("Access denied. The passcode is incorrect.");
      return;
    }

    saveVendorPortalSession(account.id, user?.email);
    onUnlock();
  };

  return (
    <div className="min-h-screen bg-[#FBFAF7] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <Card className="w-full max-w-md rounded-3xl shadow-xl border-[#2C4F4E]/20 overflow-hidden bg-white">
        <CardContent className="p-5 sm:p-8 space-y-6">
          <div className="text-center space-y-3">
            {account.business_logo ? (
              <img src={account.business_logo} alt={account.business_name} className="mx-auto h-16 w-16 rounded-2xl object-cover border" />
            ) : (
              <div className="mx-auto h-16 w-16 rounded-2xl bg-[#5DADA5]/10 flex items-center justify-center"><Lock className="h-7 w-7 text-[#5DADA5]" /></div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#5DADA5]">Secure Vendor Portal</p>
              <h1 className="text-2xl font-bold text-[#2C4F4E]">{account.business_name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Enter the business passcode to access Vendor Dashboard tools.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="password" inputMode="numeric" placeholder="Vendor passcode" value={passcode} onChange={(event) => setPasscode(event.target.value)} className="h-12 text-center text-lg tracking-widest" />
            {error && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            <Button type="submit" disabled={checking || !passcode.trim()} className="w-full h-11 rounded-2xl bg-[#5DADA5] hover:bg-[#4A9B93]">
              <ShieldCheck className="h-4 w-4" /> {checking ? "Checking..." : "Enter Vendor Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}