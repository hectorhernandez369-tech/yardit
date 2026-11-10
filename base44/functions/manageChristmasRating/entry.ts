import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

const PREVIEW_EMAIL = 'hectorhernandez369@gmail.com';
const MAX_DISTANCE_FEET = 150;
const MAX_ACCURACY_METERS = 45;
const MAX_LOCATION_AGE_MS = 30000;
const POINTS: Record<number, number> = {1: 0, 2: 0, 3: 1, 4: 3, 5: 5};
function distanceFeet(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180, a = (lat2-lat1)*rad, b = (lng2-lng1)*rad;
  const h = Math.sin(a/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(b/2)**2;
  return 20902231*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
function getLocationError(body: any, listing: any) {
  const lat = body?.geo?.latitude, lng = body?.geo?.longitude;
  const accuracy = body?.geo?.accuracy_meters, sampledAt = body?.geo?.sampled_at;
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
    !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
    typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0) {
    return 'Enable precise location to rate this display.';
  }
  if (accuracy > MAX_ACCURACY_METERS) return 'Your location is not accurate enough yet. Move outdoors and try again.';
  const age = Date.now()-Number(sampledAt);
  if (!Number.isFinite(age) || age < -5000 || age > MAX_LOCATION_AGE_MS)
    return 'Location expired. Please retry your rating.';
  if (!Number.isFinite(Number(listing.latitude)) || !Number.isFinite(Number(listing.longitude)) ||
      distanceFeet(lat,lng,Number(listing.latitude),Number(listing.longitude)) > MAX_DISTANCE_FEET)
    return 'You must be within 150 feet of this display to rate it.';
  return null;
}
function fail(message: string, code = 400) { return Response.json({error: message}, {status: code}); }
function currentSeason(date = new Date()) {
  return date.getUTCMonth() === 0 ? date.getUTCFullYear() - 1 : date.getUTCFullYear();
}
function inSeason(date = new Date()) {
  const month = date.getUTCMonth();
  return month === 10 || month === 11 || (month === 0 && date.getUTCDate() <= 2);
}
function scoreValue(v: unknown) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
function uniqueVotes(records: any[]) {
  const byUser = new Map<string, any>();
  for (const item of [...records].sort((a, b) =>
    String(a.created_date || '').localeCompare(String(b.created_date || '')))) {
    const key = String(item.user_email || item.user_id || '').trim().toLowerCase();
    if (!key || scoreValue(item.rating_value) === null) continue;
    byUser.set(key, item);
  }
  return [...byUser.values()];
}

Deno.serve(async req => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id || !user?.email) return fail('Sign in to rate Christmas displays.', 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'read');
    const locationId = String(body.location_id || '');
    const year = currentSeason();
    if (!locationId) return fail('Missing display ID.');
    const rows = await base44.asServiceRole.entities.Location.filter({id: locationId, type: 'holiday_lights'});
    const location = rows?.[0];
    if (!location) return fail('Christmas display not found.', 404);
    const service = base44.asServiceRole.entities.LightRating;
    const existing = await service.filter({listing_id: locationId, season_year: year});
    const myEmail = String(user.email).trim().toLowerCase();
    const mine = (existing || []).filter((r: any) =>
      String(r.user_id || '') === String(user.id) ||
      String(r.user_email || '').trim().toLowerCase() === myEmail);
    if (action === 'read') {
      const chosen = mine.sort((a: any, b: any) => String(b.updated_date || b.created_date || '').localeCompare(String(a.updated_date || a.created_date || '')))[0];
      return Response.json({ok: true, my_rating: chosen ? scoreValue(chosen.rating_value) : null,
        average_rating: Number(location.average_rating || 0), ratings_count: Number(location.ratings_count || 0)});
    }
    if (action !== 'rate') return fail('Unknown rating action.');
    if (!inSeason() || location.status !== 'active' || location.display_active !== true)
      return fail('Ratings are available only for active displays during Christmas season.', 403);
    const rating = scoreValue(body.rating);
    if (rating === null) return fail('Choose one to five stars.');
    // Preview admin may test remotely. Other users must provide a fresh, accurate
    // device location. GPS readings from browsers are not tamper-proof.
    if (myEmail !== PREVIEW_EMAIL) {
      const error = getLocationError(body, location);
      if (error) return fail(error, 403);
    }
    // One record per signed-in person and listing within the season. Editing never adds a vote.
    const original = mine[0];
    if (original) {
      await service.update(original.id, {rating_value: rating, user_id: user.id, user_email: myEmail});
      for (const duplicate of mine.slice(1)) await service.delete(duplicate.id);
    } else {
      await service.create({listing_id: locationId, user_id: user.id, user_email: myEmail,
        rating_value: rating, season_year: year});
    }
    // Re-read to guard against duplicate legacy records or closely spaced submissions.
    const refreshed = await service.filter({listing_id: locationId, season_year: year});
    const votes = uniqueVotes(refreshed || []);
    const sum = votes.reduce((n: number, vote: any) => n + Number(vote.rating_value), 0);
    const count = votes.length;
    const average = count ? sum / count : 0;
    const points = votes.reduce((n: number, vote: any) => n + POINTS[Number(vote.rating_value)], 0);
    const fiveStarVotes = votes.filter((vote: any) => Number(vote.rating_value) === 5).length;
    await base44.asServiceRole.entities.Location.update(locationId, {
      average_rating: average, ratings_count: count, holiday_score: sum,
      christmas_points: points, five_star_votes: fiveStarVotes,
    });
    return Response.json({ok: true, my_rating: rating, average_rating: average, ratings_count: count,
      christmas_points: points, five_star_votes: fiveStarVotes});
  } catch (e) {
    console.error('manageChristmasRating', e);
    return fail('Could not save Christmas rating.', 500);
  }
});
