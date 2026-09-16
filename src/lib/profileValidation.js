const REAL_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;

const BLOCKED_NAME_TERMS = new Set([
  "kkk",
  "kukluxklan",
  "nazi",
  "whitepower",
  "heilhitler",
  "fuck",
  "shit",
  "bitch",
]);

function normalizeNameForModeration(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
}

export function getNameValidationError(value, label = "Name") {
  const name = String(value || "").trim();
  if (!name) return `${label} is required.`;
  if (name.length < 2 || name.length > 50) return `${label} must be between 2 and 50 characters.`;
  if (!REAL_NAME_PATTERN.test(name)) return `${label} may only contain letters, spaces, hyphens, and apostrophes.`;

  const normalized = normalizeNameForModeration(name);
  const words = normalized.split(/\s+/);
  const compact = words.join("");
  if (BLOCKED_NAME_TERMS.has(compact) || words.some((word) => BLOCKED_NAME_TERMS.has(word))) {
    return `${label} contains language that is not allowed.`;
  }

  return "";
}

export function getPhoneValidationError(value) {
  const phone = String(value || "").trim();
  if (!phone) return "Phone number is required.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "Enter a valid phone number with 10 to 15 digits.";
  return "";
}