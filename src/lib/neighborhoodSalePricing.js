export const NEIGHBORHOOD_MIN_HOMES = 5;
export const NEIGHBORHOOD_MAX_HOMES = 25;
export const NEIGHBORHOOD_BASE_PRICE = 10;
export const NEIGHBORHOOD_PRICE_PER_HOME = 2;
export const NEIGHBORHOOD_PRICE_CAP = 50;

export function getNeighborhoodTotalDue(totalHomes) {
  const homes = Math.max(0, Math.min(NEIGHBORHOOD_MAX_HOMES, Number(totalHomes) || 0));
  return homes >= NEIGHBORHOOD_MIN_HOMES
    ? Math.min(NEIGHBORHOOD_PRICE_CAP, NEIGHBORHOOD_BASE_PRICE + homes * NEIGHBORHOOD_PRICE_PER_HOME)
    : 0;
}

export function getNeighborhoodPricingSummary(requests = [], amountAlreadyPaid = 0) {
  const activeRequests = (requests || []).filter((request) => request?.removed_by_eo !== true);
  const approvedCount = activeRequests.filter((request) => request.status === "approved").length;
  const pendingPaymentCount = activeRequests.filter((request) => request.status === "approved_pending_payment").length;

  const visibleHomeCount = Math.min(NEIGHBORHOOD_MAX_HOMES, 1 + approvedCount);
  const totalApprovedHomes = Math.min(NEIGHBORHOOD_MAX_HOMES, 1 + approvedCount + pendingPaymentCount);
  const amountPaid = Number(amountAlreadyPaid || 0);
  const totalDue = getNeighborhoodTotalDue(totalApprovedHomes);
  const additionalDue = Math.max(0, Number((totalDue - amountPaid).toFixed(2)));

  return {
    approvedCount,
    pendingPaymentCount,
    visibleHomeCount,
    totalApprovedHomes,
    amountPaid,
    totalDue,
    additionalDue,
    readyForPayment: totalApprovedHomes >= NEIGHBORHOOD_MIN_HOMES,
    atCap: totalDue >= NEIGHBORHOOD_PRICE_CAP,
  };
}