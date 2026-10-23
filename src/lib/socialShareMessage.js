export function getShareTitle(item = {}) {
  return item.event_name || item.display_title || item.title || item.business_name || item.vendor_display_name || "this listing";
}

export function getShareMessage(item = {}) {
  const title = getShareTitle(item);
  const halloween = item.listingType === "halloween_spot" || item.type === "halloween_candy";
  return `Check out “${title}” on Yardit! ${halloween ? "Explore this Halloween spot and plan your spooky stop." : "See the details and plan your visit."}`;
}