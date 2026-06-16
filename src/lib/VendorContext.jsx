import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";

const VendorContext = createContext(null);

export function VendorProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [vendorAccounts, setVendorAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const canCheckVendorAccess = isAuthenticated && !!user?.id && !!user?.email;

  const refreshVendorAccess = useCallback(async () => {
    if (!canCheckVendorAccess) {
      setVendorAccounts([]);
      setError(null);
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const accounts = await getUserVendorAccounts(user);
      setVendorAccounts(accounts);
      return accounts;
    } catch (lookupError) {
      console.error("Vendor access lookup failed", lookupError);
      setError(lookupError);
      setVendorAccounts([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [canCheckVendorAccess, user?.id, user?.email]);

  useEffect(() => {
    if (isLoadingAuth) return;
    refreshVendorAccess();
  }, [isLoadingAuth, refreshVendorAccess]);

  useEffect(() => {
    if (!canCheckVendorAccess) return;

    const unsubscribeVendorAccounts = base44.entities.VendorAccount.subscribe(() => {
      refreshVendorAccess();
    });
    const unsubscribeAuthorizedUsers = base44.entities.VendorAuthorizedUser.subscribe(() => {
      refreshVendorAccess();
    });

    return () => {
      unsubscribeVendorAccounts?.();
      unsubscribeAuthorizedUsers?.();
    };
  }, [canCheckVendorAccess, refreshVendorAccess]);

  const value = useMemo(() => ({
    isLoading,
    error,
    vendorAccounts,
    hasVendorAccess: vendorAccounts.length > 0,
    refreshVendorAccess,
  }), [isLoading, error, vendorAccounts, refreshVendorAccess]);

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
}

export function useVendorAccess() {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error("useVendorAccess must be used within a VendorProvider");
  }
  return context;
}