import { getNeighborhoodApprovedHomesCount, normalizeNeighborhoodJoinStatus } from "./neighborhoodSaleState";

export const NEIGHBORHOOD_MIN_HOMES = 5;
export const NEIGHBORHOOD_MAX_HOMES = 25;
export const NEIGHBORHOOD_BASE_PRICE = 19.99;
export const NEIGHBORHOOD_PRICE_PER_HOME = 2;

export function calculateNeighborhoodSalePrice(approvedHomes) {
  const homes = Math.max(0, Math.min(NEIGHBORHOOD_MAX_HOMES, Number(approvedHomes) || 0));
  if (homes < NEIGHBORHOOD_MIN_HOMES) return 0;
  return NEIGHBORHOOD_BASE_PRICE + homes * NEIGHBORHOOD_PRICE_PER_HOME;
}

export function getNeighborhoodTotalDue(totalHomes) {
  return calculateNeighborhoodSalePrice(totalHomes);
}

export function getNeighborhoodPricingSummary(requests = [], amountAlreadyPaid = 0) {
  const activeRequests = (requests || []).filter((request) => request?.removed_by_eo !== true);
  const approvedRequests = activeRequests.filter((request) => normalizeNeighborhoodJoinStatus(request.status) === "approved");
  const approvedCount = approvedRequests.length;
  const visibleHomeCount = Math.min(NEIGHBORHOOD_MAX_HOMES, getNeighborhoodApprovedHomesCount(activeRequests));
  const totalApprovedHomes = visibleHomeCount;
  const amountPaid = Number(amountAlreadyPaid || 0);
  const totalDue = calculateNeighborhoodSalePrice(totalApprovedHomes);
  const additionalDue = Math.max(0, Number((totalDue - amountPaid).toFixed(2)));

  return {
    approvedCount,
    pendingPaymentCount: 0,
    visibleHomeCount,
    totalApprovedHomes,
    amountPaid,
    totalDue,
    additionalDue,
    homesNeeded: Math.max(0, NEIGHBORHOOD_MIN_HOMES - totalApprovedHomes),
    readyForPayment: totalApprovedHomes >= NEIGHBORHOOD_MIN_HOMES,
    atCap: totalDue >= NEIGHBORHOOD_PRICE_CAP,
  };
}