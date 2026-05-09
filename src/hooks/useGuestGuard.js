import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const DEFAULT_MODAL_PROPS = {
  title: "Create a Free Account",
  description: "Create a free account to continue your hunt.",
  detail: "Sign up to post listings, join neighborhood sales, save your hunt, and more.",
  buttonText: "Log In / Sign Up",
};

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
  const [modalProps, setModalProps] = useState(DEFAULT_MODAL_PROPS);
  const { isAuthenticated, isGuest } = useAuth();

  const closeModal = () => {
    setShowModal(false);
    setModalProps(DEFAULT_MODAL_PROPS);
  };

  const guardAction = (fn, options = {}) => {
    const { allowGuest = false, modal = DEFAULT_MODAL_PROPS, returnTo = "" } = options;

    if (isGuest && allowGuest) {
      if (fn) fn();
      return;
    }

    if (isGuest || !isAuthenticated) {
      if (returnTo) {
        sessionStorage.setItem("yardit_pending_trust_action", JSON.stringify({ returnTo, createdAt: Date.now() }));
      }
      setModalProps({ ...DEFAULT_MODAL_PROPS, ...modal, returnTo });
      setShowModal(true);
      return;
    }

    if (fn) fn();
  };

  return {
    showModal,
    setShowModal: closeModal,
    guardAction,
    isGuest,
    modalProps,
  };
}