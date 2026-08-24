import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REGISTRY_VERSION = '2026-06-24';
const SKIP_STATUSES = new Set(['draft', 'payment_pending', 'pending_payment', 'canceled', 'cancelled', 'expired', 'hidden', 'suspended', 'closed', 'completed', 'removed', 'deleted']);
const OPEN_WINDOW_MINUTES = 10;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getZonedParts(date, timeZoneId) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timeZoneId || 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).map((part) => [part.type, part.value]));

  const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute || 0),
  };
}

function timeToMinutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getListingTitle(listing) {
  return listing.title || listing.event_name || listing.listingNumber || 'your listing';
}

function isEarlyEnded(listing) {
  const reason = String(listing.statusReason || listing.status_reason || '').toLowerCase();
  return reason.includes('ended early') || reason.includes('canceled by owner') || reason.includes('cancelled by owner') || reason.includes('owner_cancelled') || reason.includes('seller ended');
}

function isActiveDate(listing, localYmd, timeZoneId) {
  if (Array.isArray(listing.activeDates) && listing.activeDates.length) {
    return listing.activeDates.includes(localYmd);
  }

  if (listing.selectedRangeStartDate && listing.selectedRangeEndDate) {
    return localYmd >= listing.selectedRangeStartDate && localYmd <= listing.selectedRangeEndDate;
  }

  if (listing.startDateTime && listing.endDateTime) {
    const startYmd = getZonedParts(new Date(listing.startDateTime), timeZoneId).ymd;
    const endYmd = getZonedParts(new Date(listing.endDateTime), timeZoneId).ymd;
    return localYmd >= startYmd && localYmd <= endYmd;
  }

  return false;
}

function shouldNotifyListingOpen(listing, now) {
  if (!listing?.id || listing.listingType !== 'yard_sale') return { ok: false, reason: 'not_residential_yard_sale' };
  if (!listing.ownerUserId) return { ok: false, reason: 'missing_owner' };

  const status = String(listing.status || '').toLowerCase();
  if (SKIP_STATUSES.has(status)) return { ok: false, reason: `skipped_status:${status}` };
  if (isEarlyEnded(listing)) return { ok: false, reason: 'ended_early' };

  const openMinutes = timeToMinutes(listing.openTime);
  if (openMinutes === null) return { ok: false, reason: 'missing_open_time' };

  const tz = listing.timeZoneId || 'America/Los_Angeles';
  const local = getZonedParts(now, tz);
  if (!isActiveDate(listing, local.ymd, tz)) return { ok: false, reason: 'not_active_date' };

  const minutesSinceOpen = local.minutes - openMinutes;
  if (minutesSinceOpen < 0) return { ok: false, reason: 'before_open_time' };
  if (minutesSinceOpen > OPEN_WINDOW_MINUTES) return { ok: false, reason: 'outside_open_window' };

  return { ok: true, localDate: local.ymd, openTime: listing.openTime, timeZoneId: tz };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try {
      payload = await req.json();
    } catch (_error) {
      payload = {};
    }

    const dryRun = payload?.dry_run === true;
    const now = payload?.now ? new Date(payload.now) : new Date();
    const listings = await base44.asServiceRole.entities.Listing.list('-updated_date', 500);

    const created = [];
    const skipped = [];

    for (const listing of listings) {
      const decision = shouldNotifyListingOpen(listing, now);
      if (!decision.ok) {
        skipped.push({ id: listing.id, reason: decision.reason });
        continue;
      }

      const dedupeKey = `listing_open_${listing.ownerUserId}_${listing.id}_${decision.localDate}`;
      const existing = await base44.asServiceRole.entities.Notification.filter({ dedupe_key: dedupeKey });
      if (existing.length) {
        skipped.push({ id: listing.id, reason: 'already_notified', dedupe_key: dedupeKey });
        continue;
      }

      const notification = {
        userId: listing.ownerUserId,
        user_id: listing.ownerUserId,
        type: 'listing_open',
        title: 'Your listing is open',
        message: `Your Yardit listing "${getListingTitle(listing)}" is scheduled to be open now.`,
        read: false,
        is_read: false,
        recipient: 'listing owner',
        trigger: 'Seller-selected open time on an active listing date',
        delivery_methods: ['push', 'bell'],
        deep_link: `/ListingDetail?id=${listing.id}`,
        dedupe_key: dedupeKey,
        registry_status: 'active',
        registry_version: REGISTRY_VERSION,
        related_entity_type: 'listing',
        related_entity_id: listing.id,
        metadata: {
          dedupe_key: dedupeKey,
          listing_id: listing.id,
          listing_number: listing.listingNumber || '',
          active_date: decision.localDate,
          open_time: decision.openTime,
          time_zone_id: decision.timeZoneId,
          url: `/ListingDetail?id=${listing.id}`,
        },
      };

      let delivery = null;
      if (!dryRun) {
        const response = await base44.asServiceRole.functions.invoke('deliverNotificationPush', notification);
        delivery = response?.data || response || null;
      }
      created.push({ listing_id: listing.id, owner_user_id: listing.ownerUserId, dedupe_key: dedupeKey, dry_run: dryRun, delivery });
    }

    return Response.json({ success: true, dry_run: dryRun, created_count: created.length, created, skipped_count: skipped.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});