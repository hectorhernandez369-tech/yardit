function normalizeType(listing = {}) {
  return String(
    listing.listingType ||
    listing.listing_type ||
    listing.type ||
    ""
  ).trim().toLowerCase();
}

function isHalloweenListing(listing = {}) {
  const type = normalizeType(listing);
  return type === "halloween_spot" ||
    type === "halloween_candy" ||
    String(listing.category || "").toLowerCase() === "halloween";
}

function isHolidayListing(listing = {}) {
  const type = normalizeType(listing);
  const category = String(listing.category || "").toLowerCase();
  return type.includes("holiday") ||
    category.includes("holiday") ||
    category.includes("christmas");
}

export function getYarditShareCopy(listing = {}, listingUrl = "") {
  const type = normalizeType(listing);
  const title = listing.event_name || listing.display_title || listing.title || "Yardit listing";

  let opener = "📍 Check this out on Yardit!";
  let detailLine = "See the details, location, and more here:";

  if (isHalloweenListing(listing)) {
    opener = "🎃 Check out this Halloween spot on Yardit!";
    detailLine = "See the location, times, and details here:";
  } else if (isHolidayListing(listing)) {
    opener = "✨ Check out this holiday spot on Yardit!";
    detailLine = "See the location, times, and details here:";
  } else if (type === "yard_sale") {
    opener = "🏷️ Check out this yard sale on Yardit!";
  } else if (type === "neighborhood_sale") {
    opener = "🏘️ Check out this neighborhood sale on Yardit!";
  } else if (type === "event") {
    opener = "📅 Check out this local event on Yardit!";
    detailLine = "See the event details, location, and more here:";
  }

  const message = [opener, title, detailLine].filter(Boolean).join("\n");
  const fullText = [message, listingUrl].filter(Boolean).join("\n");

  return {
    title,
    message,
    fullText,
  };
}
