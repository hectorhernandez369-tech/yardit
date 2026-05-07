import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Store } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VendorPublicPreview from "@/components/vendor/my-page/VendorPublicPreview";

export default function VendorPublicPage() {
  const accountId = new URLSearchParams(window.location.search).get("accountId");

  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ["publicVendorAccount", accountId],
    queryFn: async () => {
      const accounts = await base44.entities.VendorAccount.filter({ id: accountId });
      return accounts[0] || null;
    },
    enabled: !!accountId,
  });

  const { data: pins = [] } = useQuery({
    queryKey: ["publicVendorPins", account?.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: account.id }),
    enabled: !!account?.id,
    initialData: [],
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["publicVendorCheckIns", account?.id],
    queryFn: () => base44.entities.VendorPinCheckIn.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
    initialData: [],
  });

  const { data: updates = [], refetch: refetchUpdates } = useQuery({
    queryKey: ["publicVendorUpdates", account?.id],
    queryFn: () => base44.entities.VendorUpdate.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
    initialData: [],
  });

  if (loadingAccount) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <Store className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <h1 className="text-xl font-bold text-[#2C4F4E]">Vendor page not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-3 pb-24 sm:p-6">
      <VendorPublicPreview account={account} pins={pins} checkIns={checkIns} updates={updates} onRefresh={refetchUpdates} />
    </div>
  );
}