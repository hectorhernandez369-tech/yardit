/**
 * VendorPortalGate — passcode flow removed.
 * Access is now controlled entirely by account ownership and authorized user email.
 * This component is kept for compatibility but renders nothing and calls onUnlock immediately.
 */
import { useEffect } from "react";

export default function VendorPortalGate({ onUnlock }) {
  useEffect(() => {
    onUnlock?.();
  }, []);
  return null;
}