export const RESIDENTIAL_DESCRIPTION_LIMITS = {
  yard_sale: 500,
  neighborhood_sale: 1000,
  event: 1000,
};

export function getResidentialDescriptionLimit(listingType) {
  return RESIDENTIAL_DESCRIPTION_LIMITS[listingType] || null;
}

export function getResidentialDescriptionValue(data = {}) {
  if (data.listingType === "event") return data.event_description || data.description || "";
  return data.description || "";
}

export function getResidentialDescriptionLimitError(data = {}) {
  const limit = getResidentialDescriptionLimit(data.listingType);
  if (!limit) return "";

  const value = getResidentialDescriptionValue(data);
  return String(value).length > limit
    ? `Description must be ${limit} characters or fewer.`
    : "";
}

export function limitText(value, limit) {
  const text = String(value || "");
  return limit ? text.slice(0, limit) : text;
}