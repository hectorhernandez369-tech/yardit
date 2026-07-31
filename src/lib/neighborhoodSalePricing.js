import { getNeighborhoodApprovedHomesCount, normalizeNeighborhoodJoinStatus } from "./neighborhoodSaleState";

export const NEIGHBORHOOD_MIN_HOMES = 5;
export const NEIGHBORHOOD_MAX_HOMES = 25;
export const NEIGHBORHOOD_FLAT_PRICE = 49.99;

export function calculateNeighborhoodSalePrice(approvedHomes) {
  const homes = Math.max(0, Math.min(NEIGHBORHOOD_MAX_HOMES, Number(approvedHomes) || 0));
  return homes >= NEIGHBORHOOD_MIN_HOMES ? NEIGHBORHOOD_FLAT_PRICE : 0;
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
  const additionalDue = totalApprovedHomes >= NEIGHBORHOOD_MIN_HOMES
    ? Math.max(0, Number((totalDue - amountPaid).toFixed(2)))
    : 0;

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
    atCap: false,
  };
}