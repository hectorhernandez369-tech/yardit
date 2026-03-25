import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

/**
 * Reusable hook for guest-restricted actions.
 *
 * Usage:
 *   const { guardAction, GuestModalElement } = useGuestGuard();
 *   ...
 *   <Button onClick={() => guardAction(() => doRestrictedThing())}>Post Sale</Button>
 *   {GuestModalElement}
 */
export function useGuestGuard() {
  const [showModal, setShowModal] = useState(false);
  const { isAuthenticated, isGuest } = useAuth();

  const guardAction = (fn) => {
    if (isGuest || !isAuthenticated) {
      setShowModal(true);
      return;
    }
    if (fn) fn();
  };

  return {
    showModal,
    setShowModal,
    guardAction,
    isGuest,
  };
}