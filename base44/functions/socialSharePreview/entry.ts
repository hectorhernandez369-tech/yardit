import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APP_ORIGIN = 'https://yardit.app';
const PUBLIC_LISTING_STATUSES = new Set(['active', 'scheduled', 'coming_soon', 'activated', 'activated_locked']);
const HIDDEN_LISTING_STATUSES = new Set(['draft', 'hidden', 'under_review', 'suspended', 'completed', 'expired', 'closed', 'cancelled', 'canceled', 'deleted', 'removed', 'payment_pending', 'pending_payment']);

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cleanText(value = '', max = 220) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function firstImage(...values) {
  for (const value of values.flat()) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
  }
  return `${APP_ORIGIN}/yardit-notification-icon-192.png`;
}

function htmlResponse({ title, description, image, canonicalUrl, destinationUrl }) {
  const safeTitle = esc(cleanText(title, 100) || 'Yardit');
  const safeDescription = esc(cleanText(description, 220) || 'Find local sales, events, and more on Yardit.');
  const safeImage = esc(image);
  const safeCanonical = esc(canonicalUrl);
  const safeDestination = esc(destinationUrl);

  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <link rel="canonical" href="${safeCanonical}">
  <meta property="og:site_name" content="Yardit">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:url" content="${safeCanonical}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  <meta http-equiv="refresh" content="0;url=${safeDestination}">
</head>
<body>
  <p>Opening <a href="${safeDestination}">Yardit</a>…</p>
  <script>location.replace(${JSON.stringify(destinationUrl)});</script>
</body>
</html>`, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function notFound() {
  return new Response('Listing not available', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

function listingIsPublic(listing) {
  if (!listing || HIDDEN_LISTING_STATUSES.has(String(listing.status || '').toLowerCase())) return false;
  return PUBLIC_LISTING_STATUSES.has(String(listing.status || '').toLowerCase()) ||
    listing.activation_status === 'active' ||
    ['active', 'coming_soon'].includes(listing.event_state);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'listing';
    const id = url.searchParams.get('id') || '';

    if (!/^[a-f0-9]{24}$/i.test(id)) return notFound();

    if (type === 'listing') {
      const rows = await base44.asServiceRole.entities.Listing.filter({ id }, '-created_date', 1);
      const listing = rows[0];
      if (!listingIsPublic(listing)) return notFound();

      const title = listing.event_name || listing.title || 'Yardit Listing';
      const description = listing.event_description || listing.description || `Check out this listing on Yardit.`;
      const image = firstImage(listing.event_flyer_url, listing.marquee_flyer_url, listing.event_photos || [], listing.photoUrls || []);
      const canonicalUrl = `${APP_ORIGIN}/functions/socialSharePreview?type=listing&id=${encodeURIComponent(id)}`;
      const destinationUrl = `${APP_ORIGIN}/ListingDetail?id=${encodeURIComponent(id)}`;
      return htmlResponse({ title, description, image, canonicalUrl, destinationUrl });
    }

    if (type === 'halloween') {
      const rows = await base44.asServiceRole.entities.Location.filter({ id, type: 'halloween_candy' }, '-created_date', 1);
      const spot = rows[0];
      if (!spot || spot.status !== 'active') return notFound();

      const title = spot.display_title || spot.title || 'Halloween Spot on Yardit';
      const description = spot.description || 'Check out this spooky stop on Yardit.';
      const image = firstImage(spot.custom_icon_url, spot.photos || []);
      const canonicalUrl = `${APP_ORIGIN}/functions/socialSharePreview?type=halloween&id=${encodeURIComponent(id)}`;
      const destinationUrl = `${APP_ORIGIN}/HalloweenSpotDetail?id=${encodeURIComponent(id)}`;
      return htmlResponse({ title, description, image, canonicalUrl, destinationUrl });
    }

    if (type === 'vendor_event') {
      const rows = await base44.asServiceRole.entities.VendorEvent.filter({ id }, '-created_date', 1);
      const event = rows[0];
      const publicStatus = ['published', 'active'].includes(event?.status) || ['coming_soon', 'active'].includes(event?.visibility_status);
      if (!event || !publicStatus) return notFound();

      const title = event.title || 'Yardit Event';
      const description = event.description || 'Check out this local event on Yardit.';
      const image = firstImage(event.flyer_url, event.logo, event.organizer_logo, event.photos || []);
      const canonicalUrl = `${APP_ORIGIN}/functions/socialSharePreview?type=vendor_event&id=${encodeURIComponent(id)}`;
      const destinationUrl = `${APP_ORIGIN}/VendorEventDetail?id=${encodeURIComponent(id)}`;
      return htmlResponse({ title, description, image, canonicalUrl, destinationUrl });
    }

    return notFound();
  } catch (error) {
    console.error('socialSharePreview failed', error);
    return new Response('Unable to build share preview', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
}
