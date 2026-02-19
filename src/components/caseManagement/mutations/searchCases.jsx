import { base44 } from "@/api/base44Client";

/**
 * searchCases(query)
 * 
 * Searches cases by account_number or listing_id.
 * For address/phone search, the UI must join against the Listing entity
 * since those fields live on Listing, not Case.
 * 
 * Returns { success: true, results: Case[] }
 */
export async function searchCases(query) {
  if (!query || !query.trim()) {
    return { success: false, error: "Search query is required" };
  }

  const trimmed = query.trim();

  // Search by account_number
  const byAccount = await base44.entities.Case.filter({ account_number: trimmed });

  // Search by listing_id
  const byListing = await base44.entities.Case.filter({ listing_id: trimmed });

  // Deduplicate by id
  const seen = new Set();
  const results = [];
  for (const c of [...byAccount, ...byListing]) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      results.push(c);
    }
  }

  return { success: true, results };
}

/**
 * NOTE: Address and phone search requires joining against the Listing entity.
 * The UI layer should:
 * 1. Search Listing by addressText/city/zip containing the query
 * 2. Collect matching listing IDs
 * 3. Filter Cases by those listing_ids
 * This cannot be done in a single Case query since address lives on Listing.
 */