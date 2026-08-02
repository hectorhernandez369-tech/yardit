const NEIGHBORHOOD_MAX_HOMES = 25;
const JOINABLE_STATES = new Set(['pending_activation', 'activated', 'coming_soon', 'scheduled', 'upcoming']);
const BLOCKED_STATES = new Set(['activated_locked', 'active', 'expired', 'canceled', 'cancelled', 'downgraded', 'removed', 'deleted', 'rejected', 'closed']);

export function deriveNeighborhoodEventState(sale, nowInput = new Date()) {
  if (!sale || sale.listingType !== 'neighborhood_sale') return null;
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const start = sale.startDateTime ? new Date(sale.startDateTime) : null;
  const end = sale.endDateTime ? new Date(sale.endDateTime) : null;
  const status = String(sale.status || '').toLowerCase();
  const explicit = String(sale.event_state || '').toLowerCase();
  const isLocked = Number(sale.pricePaid || 0) > 0 || sale.payment_intent_status === 'captured';

  if (BLOCKED_STATES.has(explicit) || ['cancelled', 'canceled', 'deleted', 'removed', 'rejected', 'closed'].includes(status)) {
    if (explicit === 'coming_soon' && status !== 'active') return 'coming_soon';
    return explicit || status;
  }
  if (end && !Number.isNaN(end.getTime()) && now > end) return 'expired';
  if (status === 'ready_for_payment') return 'pending_activation';
  if (['collecting_participants', 'payment_pending', 'scheduled', 'upcoming'].includes(status)) return status === 'scheduled' || status === 'upcoming' ? status : 'pending_activation';
  if (explicit === 'coming_soon') return 'coming_soon';
  if (explicit === 'activated') return 'activated';
  if (status === 'active' || explicit === 'active' || explicit === 'activated_locked') {
    if (start && !Number.isNaN(start.getTime()) && now < start) return isLocked ? 'activated' : 'activated';
    return 'active';
  }
  return explicit || 'pending_activation';
}

export function getNeighborhoodParticipantLockDeadline(sale) {
  if (!sale?.startDateTime) return null;
  const startsAt = new Date(sale.startDateTime);
  if (Number.isNaN(startsAt.getTime())) return null;
  return new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
}

export function isNeighborhoodOpenToParticipants(sale, nowInput = new Date(), approvedHomeCount = 0) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const state = deriveNeighborhoodEventState(sale, now);
  if (!JOINABLE_STATES.has(state)) return false;
  if (Number(approvedHomeCount || 0) >= NEIGHBORHOOD_MAX_HOMES) return false;

  const lockAt = getNeighborhoodParticipantLockDeadline(sale);
  if (lockAt && now >= lockAt) return false;

  const startsAt = sale?.startDateTime ? new Date(sale.startDateTime) : null;
  if (startsAt && !Number.isNaN(startsAt.getTime()) && now >= startsAt) return false;

  return true;
}