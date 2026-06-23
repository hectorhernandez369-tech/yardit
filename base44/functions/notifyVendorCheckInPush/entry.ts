import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function milesBetween(lat1, lon1, lat2, lon2) {
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function userLatLng(user) {
  const data = user.data || {};
  const lat = user.primary_latitude ?? user.address_lat ?? data.primary_latitude ?? data.address_lat;
  const lng = user.primary_longitude ?? user.address_lng ?? data.primary_longitude ?? data.address_lng;
  const verified = user.primary_address_verified === true || user.address_verified === true || user.address_confirmation_status === 'confirmed' || data.primary_address_verified === true || data.address_verified === true || data.address_confirmation_status === 'confirmed';
  return verified && typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
}
function isPublicCheckIn(checkIn) {
  const now = Date.now();
  return checkIn.status === 'live' && new Date(checkIn.checkin_start_time).getTime() <= now && new Date(checkIn.checkin_end_time).getTime() > now;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const checkIn = payload.data || payload.checkIn || payload;
    if (!checkIn?.id || !isPublicCheckIn(checkIn)) return Response.json({ skipped: true });
    const vendorRows = await base44.asServiceRole.entities.VendorAccount.filter({ id: checkIn.vendor_account_id });
    const vendor = vendorRows[0] || {};
    const users = await base44.asServiceRole.entities.User.list();
    let created = 0;

    const globalPrefs = await base44.asServiceRole.entities.NotificationPreference.filter({ vendor_near_me_push_enabled: true });
    const vendorSubs = await base44.asServiceRole.entities.VendorNotificationSubscription.filter({ vendor_account_id: checkIn.vendor_account_id, subscription_enabled: true });
    const targets = [...vendorSubs.map((s) => ({ user_id: s.user_id, radius: s.radius_miles || 2, mode: 'vendor_subscription', sub: s })), ...globalPrefs.map((p) => ({ user_id: p.user_id, radius: p.vendor_near_me_radius_miles || 2, mode: 'vendor_near_me' }))];
    const seenUsers = new Set();

    for (const target of targets) {
      if (seenUsers.has(target.user_id)) continue;
      seenUsers.add(target.user_id);
      if (!target.user_id || target.user_id === vendor.owner_user_id) continue;
      const user = users.find((u) => u.id === target.user_id);
      if (user?.email && user.email === vendor.owner_email) continue;
      const coords = userLatLng(user || {});
      if (!coords) continue;
      const distance = milesBetween(coords.lat, coords.lng, checkIn.checkin_latitude, checkIn.checkin_longitude);
      if (distance > target.radius) continue;
      const dedupeKey = `${target.mode}_${target.user_id}_${checkIn.vendor_account_id}_${checkIn.id}`;
      const existing = await base44.asServiceRole.entities.PushNotificationDeliveryLog.filter({ dedupe_key: dedupeKey });
      if (existing.length) continue;
      await base44.asServiceRole.entities.Notification.create({ userId: target.user_id, user_id: target.user_id, title: `${vendor.business_name || 'A vendor'} just checked in`, message: `${vendor.business_name || 'A vendor'} just checked in ${distance.toFixed(1)} miles from you.`, type: target.mode, related_entity_type: 'vendor_checkin', related_entity_id: checkIn.id, metadata: { dedupe_key: dedupeKey, vendor_account_id: checkIn.vendor_account_id, checkin_id: checkIn.id }, read: false, is_read: false });
      if (target.sub?.id) await base44.asServiceRole.entities.VendorNotificationSubscription.update(target.sub.id, { last_notified_checkin_id: checkIn.id, last_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      created++;
    }
    return Response.json({ success: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});