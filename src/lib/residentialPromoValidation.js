import { base44 } from "@/api/base44Client";

/**
 * Validate a residential promo code.
 * Returns { valid, reason, promoCode, discountPercent, discountAmount, finalAmount, discountBucket }
 */
export async function validateResidentialPromoCode({ code, user, listingLocation, selectedTier, listingPrice }) {
  if (!code || !code.trim()) {
    return { valid: false, reason: "Please enter a promo code." };
  }

  const normalizedCode = code.trim().toUpperCase();

  // Free tier cannot receive a cash discount
  if (!selectedTier || selectedTier === "free") {
    return { valid: false, reason: "Promo codes do not apply to free listings." };
  }

  if (!listingPrice || listingPrice <= 0) {
    return { valid: false, reason: "No payment required for this listing." };
  }

  // Fetch all active promo codes and find by code (case-insensitive stored uppercase)
  let promoCodes;
  try {
    promoCodes = await base44.entities.ResidentialPromoCode.filter({ code: normalizedCode });
  } catch {
    return { valid: false, reason: "Error looking up promo code. Please try again." };
  }

  const promoCode = promoCodes?.[0];

  if (!promoCode) {
    return { valid: false, reason: "Promo code not found." };
  }

  if (promoCode.status !== "active") {
    const label = promoCode.status === "paused" ? "paused" : promoCode.status === "expired" ? "expired" : "inactive";
    return { valid: false, reason: `This promo code is ${label} and cannot be used.` };
  }

  const now = new Date();

  if (promoCode.starts_at && new Date(promoCode.starts_at) > now) {
    return { valid: false, reason: "This promo code is not yet active." };
  }

  if (promoCode.expires_at && new Date(promoCode.expires_at) < now) {
    return { valid: false, reason: "This promo code has expired." };
  }

  // Tier eligibility
  const tiers = promoCode.applies_to_tiers || [];
  if (tiers.length > 0 && !tiers.includes(selectedTier)) {
    return { valid: false, reason: `This promo code does not apply to the ${selectedTier} tier.` };
  }

  // Coverage check
  const coverageValid = checkCoverage(promoCode, listingLocation);
  if (!coverageValid) {
    return { valid: false, reason: "This promo code is not available in your listing's location." };
  }

  // Total uses check
  if (promoCode.max_total_uses != null && promoCode.total_used_count >= promoCode.max_total_uses) {
    return { valid: false, reason: "This promo code has reached its maximum number of uses." };
  }

  // Per-user limit check
  if (user?.id) {
    let userRedemptions;
    try {
      userRedemptions = await base44.entities.ResidentialPromoRedemption.filter({
        promo_code_id: promoCode.id,
        user_id: user.id,
        status: "completed",
      });
    } catch {
      userRedemptions = [];
    }
    const perLimit = promoCode.per_user_limit ?? 1;
    if ((userRedemptions?.length || 0) >= perLimit) {
      return { valid: false, reason: "You have already used this promo code." };
    }
  }

  // Determine discount bucket
  let discountPercent;
  let discountBucket;

  if (
    promoCode.early_discount_enabled &&
    promoCode.early_discount_limit > 0 &&
    (promoCode.early_discount_used_count || 0) < promoCode.early_discount_limit
  ) {
    discountPercent = promoCode.early_discount_percent || 0;
    discountBucket = "early";
  } else {
    discountPercent = promoCode.default_discount_percent || 0;
    discountBucket = "default";
  }

  // Calculate amounts — round to cents
  const discountAmount = Math.min(Math.round((listingPrice * discountPercent) / 100), listingPrice);
  const finalAmount = Math.max(0, listingPrice - discountAmount);

  return {
    valid: true,
    reason: `Promo applied: ${discountPercent}% off`,
    promoCode,
    discountPercent,
    discountAmount,
    finalAmount,
    discountBucket,
  };
}

function checkCoverage(promoCode, listingLocation) {
  const type = promoCode.coverage_type || "nationwide";

  if (type === "nationwide") return true;

  if (!listingLocation) return false;

  const loc = listingLocation;

  // Custom coverage_rules object
  if (type === "custom" && promoCode.coverage_rules) {
    const rules = promoCode.coverage_rules;
    if (rules.states?.length && !rules.states.some((s) => matches(s, loc.state))) return false;
    if (rules.counties?.length && !rules.counties.some((c) => matches(c, loc.county))) return false;
    if (rules.cities?.length && !rules.cities.some((c) => matches(c, loc.city) || matches(c, loc.town))) return false;
    if (rules.zips?.length && !rules.zips.some((z) => matches(z, loc.zip))) return false;
    return true;
  }

  if (type === "state") return matches(promoCode.coverage_state, loc.state);
  if (type === "county") {
    return matches(promoCode.coverage_state, loc.state) && matches(promoCode.coverage_county, loc.county);
  }
  if (type === "city" || type === "town") {
    return (
      matches(promoCode.coverage_state, loc.state) &&
      (matches(promoCode.coverage_city, loc.city) || matches(promoCode.coverage_town, loc.city) || matches(promoCode.coverage_city, loc.town))
    );
  }
  if (type === "zip") return matches(promoCode.coverage_zip, loc.zip);

  return true;
}

function matches(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}