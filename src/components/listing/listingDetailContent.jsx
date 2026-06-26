import { formatListingTime } from "@/components/listing/listingDisplay.jsx";

const KEYWORD_GROUPS = [
  {
    label: "Furniture pieces",
    terms: ["furniture", "dresser", "table", "chair", "couch", "sofa", "desk", "bed", "nightstand", "bookshelf", "cabinet"]
  },
  {
    label: "Collectibles",
    terms: ["collectible", "collectibles", "vintage", "antique", "coins", "cards", "vinyl", "memorabilia"]
  },
  {
    label: "Household items",
    terms: ["household", "kitchen", "home decor", "decor", "appliance", "storage", "tools"]
  },
  {
    label: "Kids toys & bundles",
    terms: ["toy", "toys", "kids", "baby", "stroller", "games", "lego", "bundle"]
  },
  {
    label: "Clothes & accessories",
    terms: ["clothes", "clothing", "shoes", "bags", "accessories", "fashion"]
  },
  {
    label: "Electronics",
    terms: ["electronics", "tv", "speaker", "computer", "monitor", "gaming", "phone"]
  },
  {
    label: "Outdoor finds",
    terms: ["garden", "outdoor", "patio", "camping", "bike", "yard tools"]
  }
];

const SENTENCE_SPLIT_REGEX = /[\n•\-]+|(?<=[.!?])\s+/;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getHookLine(listing) {
  const description = normalizeText(listing?.event_description || listing?.description);
  const title = normalizeText(listing?.event_name || listing?.title);
  const category = normalizeText(listing?.event_category || listing?.category);
  const lower = `${title} ${description} ${category}`.toLowerCase();

  if (lower.includes("multi-family") || lower.includes("multifamily")) {
    return "🔥 Multi-family yard sale — everything priced to sell!";
  }
  if (lower.includes("collectible") || lower.includes("vintage") || lower.includes("antique")) {
    return "🔥 Rare finds and collectible gems worth the stop.";
  }
  if (lower.includes("furniture")) {
    return "🔥 Quality furniture and home finds ready to go.";
  }
  if (lower.includes("baby") || lower.includes("kids") || lower.includes("toy")) {
    return "🔥 Family-friendly deals with lots of kids items to browse.";
  }
  if (category) {
    return `🔥 ${titleCase(category)} deals worth showing up early for.`;
  }
  if (listing?.listingType === "event") {
    return "🔥 Fresh local finds, good deals, and plenty to explore.";
  }
  return "🔥 Worth the stop — great deals and plenty to browse.";
}

export function getFeaturedItems(listing) {
  const description = normalizeText(listing?.event_description || listing?.description);
  const categories = Array.isArray(listing?.categories) ? listing.categories.filter(Boolean) : [];
  const category = normalizeText(listing?.event_category || listing?.category);
  const baseText = `${description}. ${categories.join('. ')}. ${category}`.toLowerCase();

  const chips = [];

  KEYWORD_GROUPS.forEach((group) => {
    if (group.terms.some((term) => baseText.includes(term)) && !chips.includes(group.label)) {
      chips.push(group.label);
    }
  });

  const fragments = description
    .split(SENTENCE_SPLIT_REGEX)
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item) => item.length >= 10)
    .slice(0, 6);

  fragments.forEach((item) => {
    if (chips.length >= 4) return;
    const cleaned = item.replace(/^(we(\'re| are)? selling|selling|lots of|featuring)\s+/i, "");
    const compact = cleaned.length > 42 ? `${cleaned.slice(0, 39).trim()}…` : cleaned;
    if (compact && !chips.includes(compact)) {
      chips.push(compact);
    }
  });

  if (category && chips.length < 3) {
    chips.push(`${titleCase(category)} deals`);
  }

  if (chips.length < 4) {
    ["Budget-friendly prices", "More items in person", "Great local finds", "One-stop browse"].forEach((item) => {
      if (chips.length < 4 && !chips.includes(item)) chips.push(item);
    });
  }

  return chips.slice(0, 4);
}

export function getTrustSignal(listing) {
  const description = normalizeText(listing?.event_description || listing?.description).toLowerCase();
  if (description.includes("multi-family") || description.includes("multifamily")) {
    return "Multiple households means more variety in one stop.";
  }
  if (description.includes("new items") || description.includes("restock")) {
    return "New items may be added throughout the sale.";
  }
  if (description.includes("moving") || description.includes("estate")) {
    return "Expect a wide mix of household pieces and larger finds.";
  }
  return "Expect a solid mix of items and plenty to browse.";
}

export function getFormattedDescription(listing) {
  const raw = normalizeText(listing?.event_description || listing?.description);
  if (!raw) return [];

  const sentences = raw
    .split(SENTENCE_SPLIT_REGEX)
    .map((item) => normalizeText(item))
    .filter(Boolean);

  if (sentences.length === 0) return [];

  const first = sentences[0]
    .replace(/^we(\'re| are)?\s+selling\s+/i, "")
    .replace(/^we\s+have\s+/i, "")
    .replace(/^selling\s+/i, "")
    .replace(/^come\s+shop\s+/i, "")
    .trim();

  const lines = [first];
  for (let i = 1; i < sentences.length; i += 1) {
    lines.push(sentences[i]);
  }

  return lines
    .map((line, index) => {
      if (index === 0) {
        return line.charAt(0).toUpperCase() + line.slice(1);
      }
      return line;
    })
    .filter(Boolean);
}

export function getUrgencyText(listing) {
  const startValue = listing?.selectedRangeStartDate || listing?.startDateTime;
  const endValue = listing?.selectedRangeEndDate || listing?.endDateTime;
  const start = startValue ? new Date(String(startValue).includes("T") ? startValue : `${startValue}T00:00:00`) : null;
  const end = endValue ? new Date(String(endValue).includes("T") ? endValue : `${endValue}T00:00:00`) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { starts: "Plan your stop early", ends: "Limited-time listing" };

  const startDay = start.toLocaleDateString("en-US", { weekday: "long" });
  const startTime = formatListingTime(listing?.openTime || listing?.startDateTime);
  const endDay = end.toLocaleDateString("en-US", { weekday: "long" });

  return {
    starts: startTime ? `Starts ${startDay} at ${startTime}` : `Starts ${startDay}`,
    ends: `Ends ${endDay} — don’t miss it`
  };
}