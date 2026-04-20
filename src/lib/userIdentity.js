export function splitLegacyFullName(fullName) {
  const normalized = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!normalized) return { first_name: "", last_name: "" };

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

export function getUserDisplayName(user) {
  const first = String(user?.first_name || "").trim();
  const last = String(user?.last_name || "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || user?.email || "User";
}

export function getUserIdentityFields(user) {
  const first = String(user?.first_name || "").trim();
  const last = String(user?.last_name || "").trim();

  if (first || last) {
    return { first_name: first, last_name: last };
  }

  return splitLegacyFullName(user?.full_name || "");
}