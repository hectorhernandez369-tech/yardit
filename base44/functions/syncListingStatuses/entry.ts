import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// LOCKED FREE LISTING POLICY — do not change without owner permission.
// Applies only to standalone residential yard_sale listings with tier="free".
// Free listings run Friday 05:00 through Sunday 22:00 in the listing timezone.
function pad2(value) {
  return String(value).padStart(2, '0');
}

function getZonedParts(date, timeZoneId) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timeZoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function addDaysYMD(ymd, deltaDays) {
  const [year, month, day] = String(ymd).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function getTimeZoneOffsetMinutes(date, timeZoneId) {
  const parts = getZonedParts(date, timeZoneId);
  const asUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtcMs - date.getTime()) / 60000);
}

function zonedDateTimeToUtcDate(ymd, timeStr, timeZoneId) {
  const [year, month, day] = String(ymd).split('-').map(Number);
  const [hour, minute, second] = String(timeStr).split(':').map(Number);
  const wallTimeAsUtcMs = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0);
  let guess = new Date(wallTimeAsUtcMs);
  for (let i = 0; i < 2; i += 1) {
    guess = new Date(wallTimeAsUtcMs - getTimeZoneOffsetMinutes(guess, timeZoneId) * 60000);
  }
  return guess;
}

function computeLockedFreeWindow(createdAt, timeZoneId) {
  const tz = timeZoneId || 'America/Los_Angeles';
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt || Date.now());
  const local = getZonedParts(created, tz);
  const localYMD = `${local.year}-${pad2(local.month)}-${pad2(local.day)}`;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = weekdayMap[local.weekday];
  const daysSinceFriday = dow >= 5 ? dow - 5 : dow + 2;
  const currentFridayYMD = addDaysYMD(localYMD, -daysSinceFriday);
  const currentSundayYMD = addDaysYMD(currentFridayYMD, 2);
  const currentFridayStart = zonedDateTimeToUtcDate(currentFridayYMD, '05:00:00', tz);
  const currentSundayEnd = zonedDateTimeToUtcDate(currentSundayYMD, '22:00:00', tz);
  const createdInsideWindow = created >= currentFridayStart && created <= currentSundayEnd;
  const targetFridayYMD = created > currentSundayEnd ? addDaysYMD(currentFridayYMD, 7) : currentFridayYMD;
  const targetSundayYMD = addDaysYMD(targetFridayYMD, 2);

  return {
    startDateTime: createdInsideWindow ? created : zonedDateTimeToUtcDate(targetFridayYMD, '05:00:00', tz),
    endDateTime: zonedDateTimeToUtcDate(targetSundayYMD, '22:00:00', tz),
    startYMD: targetFridayYMD,
    endYMD: targetSundayYMD,
    activeDates: [targetFridayYMD, addDaysYMD(targetFridayYMD, 1), targetSundayYMD],
  };
}

function normalizeJoinStatus(value) {
  return String(value || 'none').toLowerCase();
}

function isStandaloneFreeYardSale(listing) {
  return listing?.listingType === 'yard_sale' && listing?.tier === 'free' && !listing?.neighborhood_sale_id && normalizeJoinStatus(listing?.neighborhood_join_status) === 'none';
}

function statusForWindow(now, start, end) {
  if (now < start) return 'scheduled';
  if (now >= start && now <= end) return 'active';
  return 'expired';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    let listings = [];
    try {
      listings = await base44.asServiceRole.entities.Listing.list('-created_date', 500);
    } catch (e) {
      console.error('Error fetching listings', e);
      return Response.json({ error: e.message }, { status: 500 });
    }

    console.log(`[syncListingStatuses] Processing ${listings.length} listings at ${now.toISOString()}`);

    const updates = [];
    const skipped = [];

    for (const listing of listings) {
      const currentStatus = listing?.status;

      if (listing.listingType === 'neighborhood_sale') {
        skipped.push({ id: listing.id, reason: 'neighborhood_sale' });
        continue;
      }

      if (['canceled', 'cancelled', 'closed', 'completed', 'suspended', 'under_review', 'hidden'].includes(currentStatus)) {
        skipped.push({ id: listing.id, reason: `terminal_status:${currentStatus}` });
        continue;
      }

      if (isStandaloneFreeYardSale(listing)) {
        const tz = listing.timeZoneId || 'America/Los_Angeles';
        const freeWindow = computeLockedFreeWindow(listing.created_date || listing.startDateTime || now, tz);
        const nextStatus = statusForWindow(now, freeWindow.startDateTime, freeWindow.endDateTime);
        const patch = {
          status: nextStatus,
          activation_status: nextStatus === 'active' ? 'active' : 'pending',
          startDateTime: freeWindow.startDateTime.toISOString(),
          endDateTime: freeWindow.endDateTime.toISOString(),
          selectedRangeStartDate: freeWindow.startYMD,
          selectedRangeEndDate: freeWindow.endYMD,
          earlyVisibilityDays: 0,
          earlyVisibilityDates: [],
          activeDates: freeWindow.activeDates,
          category: listing.category || 'Miscellaneous',
          timeZoneId: tz,
        };

        const needsPatch = currentStatus !== patch.status ||
          listing.activation_status !== patch.activation_status ||
          listing.startDateTime !== patch.startDateTime ||
          listing.endDateTime !== patch.endDateTime ||
          listing.selectedRangeStartDate !== patch.selectedRangeStartDate ||
          listing.selectedRangeEndDate !== patch.selectedRangeEndDate;

        if (needsPatch) {
          try {
            await base44.asServiceRole.entities.Listing.update(listing.id, patch);
            updates.push({ id: listing.id, listingNumber: listing.listingNumber, old: currentStatus, new: nextStatus, policy: 'locked_free_weekend' });
            console.log(`[syncListingStatuses] Locked free policy updated ${listing.listingNumber || listing.id}: ${currentStatus} → ${nextStatus}`);
          } catch (e) {
            console.error(`[syncListingStatuses] Failed to update free listing ${listing.id}:`, e.message);
          }
        }
        continue;
      }

      const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
      const end = listing?.endDateTime ? new Date(listing.endDateTime) : null;

      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        skipped.push({ id: listing.id, reason: 'invalid_dates' });
        continue;
      }

      const nextStatus = statusForWindow(now, start, end);
      if (nextStatus !== currentStatus) {
        try {
          await base44.asServiceRole.entities.Listing.update(listing.id, {
            status: nextStatus,
            category: listing.category || 'Miscellaneous',
            timeZoneId: listing.timeZoneId || 'America/Los_Angeles',
          });
          updates.push({ id: listing.id, listingNumber: listing.listingNumber, old: currentStatus, new: nextStatus });
          console.log(`[syncListingStatuses] Updated ${listing.listingNumber || listing.id}: ${currentStatus} → ${nextStatus}`);
        } catch (e) {
          console.error(`[syncListingStatuses] Failed to update ${listing.id}:`, e.message);
        }
      }
    }

    console.log(`[syncListingStatuses] Done. Updated: ${updates.length}, Skipped: ${skipped.length}`);
    return Response.json({ success: true, updated_count: updates.length, updates, skipped_count: skipped.length });
  } catch (error) {
    console.error('[syncListingStatuses] Fatal error:', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});