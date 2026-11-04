import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

const PREVIEW_EMAIL = 'hectorhernandez369@gmail.com';
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
    const key = String(item.user_id || item.user_email || '').trim().toLowerCase();
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
    if (String(user.email).trim().toLowerCase() !== PREVIEW_EMAIL) return fail('Christmas ratings are not yet available to the public.', 403);
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
    await base44.asServiceRole.entities.Location.update(locationId, {
      average_rating: average, ratings_count: count, holiday_score: sum,
    });
    return Response.json({ok: true, my_rating: rating, average_rating: average, ratings_count: count});
  } catch (e) {
    console.error('manageChristmasRating', e);
    return fail('Could not save Christmas rating.', 500);
  }
});
