import { useState } from "react";
import { isGuestMode } from "@/lib/guestMode";

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

  const guardAction = (fn) => {
    if (isGuestMode()) {
      setShowModal(true);
      return;
    }
    if (fn) fn();
  };

  return {
    showModal,
    setShowModal,
    guardAction,
    isGuest: isGuestMode(),
  };
}