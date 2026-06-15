import { base44 } from "@/api/base44Client";

/**
 * Validate a residential promo code.
 * Returns { valid, reason, promoCode, discountPercent, discountAmount, finalAmount, discountBucket }
 */
export async function validateResidentialPromoCode({ code, user, listingLocation, selectedTier, listingPrice, listingLat, listingLng, selectedRangeStartDate, startDateTime }) {
  if (!code || !code.trim()) {
    return { valid: false, reason: "Please enter a promo code." };
  }

  const normalizedCode = code.trim().toUpperCase();

  if (!selectedTier || selectedTier === "free") {
    return { valid: false, reason: "Promo codes do not apply to free listings." };
  }

  if (!listingPrice || listingPrice <= 0) {
    return { valid: false, reason: "No payment required for this listing." };
  }

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

  const tiers = promoCode.applies_to_tiers || [];
  if (tiers.length > 0 && !tiers.includes(selectedTier)) {
    return { valid: false, reason: `This promo code does not apply to the ${selectedTier} tier.` };
  }

  // Legacy address coverage check
  const coverageValid = checkCoverage(promoCode, listingLocation);
  if (!coverageValid) {
    return { valid: false, reason: "This promo code is not available in your listing's location." };
  }

  // New geo limit check
  const geoCheck = checkGeoLimit(promoCode, { ...listingLocation, lat: listingLat, lng: listingLng });
  if (!geoCheck.valid) {
    return { valid: false, reason: "This promo code is not available in your area." };
  }

  if (promoCode.max_total_uses != null && promoCode.total_used_count >= promoCode.max_total_uses) {
    return { valid: false, reason: "This promo code has reached its maximum number of uses." };
  }

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

  const discountAmount = Math.min(Math.round((listingPrice * discountPercent) / 100), listingPrice);
  const finalAmount = Math.max(0, listingPrice - discountAmount);
  const earlyVisibility = buildEarlyVisibilityResult(promoCode, selectedRangeStartDate || startDateTime?.slice?.(0, 10), normalizedCode);

  return {
    valid: true,
    reason: `Promo applied: ${discountPercent}% off`,
    promoCode,
    discountPercent,
    discountAmount,
    finalAmount,
    discountBucket,
    earlyVisibility,
  };
}

function shiftYmd(ymd, dayDelta) {
  const [year, month, day] = String(ymd || "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function buildEarlyVisibilityResult(promoCode, listingStartDate, normalizedCode) {
  const days = Math.max(0, Number(promoCode?.early_visibility_days || 0));
  if (promoCode?.early_visibility_enabled !== true || days <= 0 || !listingStartDate) {
    return {
      enabled: false,
      days: 0,
      visibility_start_date: "",
      promo_code: "",
    };
  }

  const startDate = String(listingStartDate).slice(0, 10);
  let visibilityStartDate = shiftYmd(startDate, -days);
  if (visibilityStartDate > startDate) visibilityStartDate = startDate;

  return {
    enabled: true,
    days,
    visibility_start_date: visibilityStartDate,
    promo_code: promoCode?.code || normalizedCode,
  };
}

// ── Geo limit check (city_zip or radius) ─────────────────────────────────────

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkGeoLimit(promoCode, loc) {
  if (!promoCode.geographic_limit_enabled) return { valid: true };
  const geoType = promoCode.geographic_limit_type || "none";
  if (geoType === "none") return { valid: true };

  if (geoType === "city_zip") {
    const norm = (s) => String(s || "").trim().toLowerCase();
    const cities = (promoCode.eligible_cities || []).map(norm);
    const zips = (promoCode.eligible_zips || []).map(norm);
    const locCity = norm(loc.city);
    const locTown = norm(loc.town);
    const locZip = norm(loc.zip);
    const cityMatch = cities.length === 0 || cities.includes(locCity) || cities.includes(locTown);
    const zipMatch = zips.length === 0 || zips.includes(locZip);
    if (cities.length > 0 && zips.length > 0) {
      if (!cityMatch && !zipMatch) return { valid: false };
    } else if (cities.length > 0 && !cityMatch) return { valid: false };
    else if (zips.length > 0 && !zipMatch) return { valid: false };
    return { valid: true };
  }

  if (geoType === "radius") {
    if (!promoCode.geo_center_lat || !promoCode.geo_center_lng || !promoCode.geo_radius_miles) return { valid: true };
    if (!loc.lat || !loc.lng) return { valid: true };
    const dist = haversineDistance(promoCode.geo_center_lat, promoCode.geo_center_lng, loc.lat, loc.lng);
    if (dist > promoCode.geo_radius_miles) return { valid: false };
    return { valid: true };
  }

  return { valid: true };
}

// ── Legacy address coverage ───────────────────────────────────────────────────

function checkCoverage(promoCode, listingLocation) {
  const type = promoCode.coverage_type || "nationwide";

  if (type === "nationwide") return true;

  if (!listingLocation) return false;

  const loc = listingLocation;

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