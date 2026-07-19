export function resolvePublicContactVisibility({
  accountVisibility = "hide",
  eventVisibility = "inherit",
} = {}) {
  const normalizedEventVisibility = String(
    eventVisibility || "inherit"
  ).toLowerCase();

  if (normalizedEventVisibility === "show") {
    return true;
  }

  if (normalizedEventVisibility === "hide") {
    return false;
  }

  return String(accountVisibility || "hide").toLowerCase() === "show";
}

export function getPublicContactInfo({
  account,
  event,
} = {}) {
  const canShow = resolvePublicContactVisibility({
    accountVisibility: account?.public_contact_visibility,
    eventVisibility: event?.public_contact_visibility,
  });

  if (!canShow) {
    return {
      visible: false,
      phone: "",
      email: "",
      website: "",
    };
  }

  return {
    visible: true,
    phone:
      account?.public_phone ||
      account?.business_phone ||
      account?.phone ||
      "",
    email:
      account?.public_email ||
      account?.business_email ||
      account?.email ||
      "",
    website:
      account?.website ||
      account?.business_website ||
      "",
  };
}