import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";
import { canAccessVendorSignup, isVendorPublicSignupEnabled } from "@/lib/vendorLaunchGate";
import VendorLaunchGate from "./VendorLaunchGate";
import { Loader2 } from "lucide-react";

/**
 * Wraps the public Vendor signup/setup routes so direct URL visits are checked
 * against the reversible launch gate. Blocked users see VendorLaunchGate.
 */
export default function VendorSignupGate({ children }) {
  const [user, setUser] = useState(null);
  const [vendorAccounts, setVendorAccounts] = useState([]);
  const [claimableAccounts, setClaimableAccounts] = useState([]);
  const [checking, setChecking] = useState(true);
  const [notAuthenticated, setNotAuthenticated] = useState(false);

  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["vendorLaunchGateSettings"],
    queryFn: async () => {
      const response = await base44.functions.invoke("getPublicAppSettings", {});
      return response?.data?.settings || [];
    },
    staleTime: 30000,
  });

  useEffect(() => {
    let mounted = true;
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) {
        if (mounted) {
          setNotAuthenticated(true);
          setChecking(false);
        }
        return;
      }
      try {
        const currentUser = await base44.auth.me();
        const [accounts, byEmail] = await Promise.all([
          getUserVendorAccounts(currentUser).catch(() => []),
          currentUser.email
            ? base44.entities.VendorAccount.filter({ owner_email: currentUser.email }).catch(() => [])
            : Promise.resolve([]),
        ]);
        if (!mounted) return;
        const claimable = byEmail.filter(
          (account) =>
            account.is_active !== false &&
            account.vendor_origin === "admin_auto_created" &&
            (!account.owner_user_id || account.owner_user_id === account.owner_email)
        );
        setUser(currentUser);
        setVendorAccounts(accounts);
        setClaimableAccounts(claimable);
      } finally {
        if (mounted) setChecking(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const publicEnabled = isVendorPublicSignupEnabled(settings);

  useEffect(() => {
    if (notAuthenticated && !loadingSettings && publicEnabled) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [notAuthenticated, loadingSettings, publicEnabled]);

  if (checking || loadingSettings) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" />
      </div>
    );
  }

  // Signed-out visitor while public signup is closed: show Coming Soon.
  if (notAuthenticated && !publicEnabled) {
    return <VendorLaunchGate />;
  }

  const allowed = canAccessVendorSignup({ user, settings, vendorAccounts, claimableAccounts });
  if (!allowed) return <VendorLaunchGate />;
  return <>{children}</>;
}