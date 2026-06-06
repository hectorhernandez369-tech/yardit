export const LISTING_PREVIEW_ON_MAP_KEY = "yardit_preview_listings_on_map";

export function getPreviewListingsOnMapPreference() {
  try {
    const saved = localStorage.getItem(LISTING_PREVIEW_ON_MAP_KEY);
    return saved === null ? true : saved !== "false";
  } catch (e) {
    return true;
  }
}

export function setPreviewListingsOnMapPreference(value) {
  try {
    localStorage.setItem(LISTING_PREVIEW_ON_MAP_KEY, value ? "true" : "false");
  } catch (e) {}
}