import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getAppBaseUrl(req, explicitBaseUrl = '') {
  const configured = String(Deno.env.get('APP_BASE_URL') || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(configured)) return configured;
  const explicit = String(explicitBaseUrl || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(explicit)) return explicit;
  const origin = req.headers.get('origin');
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '');
  return new URL(req.url).origin;
}

function buildQrImageUrl(approvalUrl, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(approvalUrl)}&ecc=M`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admins can regenerate
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { assisted_id, appBaseUrl: clientAppBaseUrl = '' } = payload;

    if (!assisted_id) {
      return Response.json({ error: 'assisted_id is required' }, { status: 400 });
    }

    // Fetch the record
    const records = await base44.asServiceRole.entities.AssistedListing.filter({ id: assisted_id });
    const assisted = records[0];

    if (!assisted) {
      return Response.json({ error: 'Assisted listing not found' }, { status: 404 });
    }

    // Do not regenerate for declined listings
    if (assisted.assisted_status === 'assisted_declined') {
      return Response.json({ error: 'Cannot regenerate QR for a declined listing' }, { status: 400 });
    }

    // Do not regenerate if already claimed
    if (assisted.assisted_status === 'claimed_active') {
      return Response.json({ error: 'Listing has already been claimed' }, { status: 400 });
    }

    const now = new Date();
    const newToken = generateToken();
    const newExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const appBaseUrl = getAppBaseUrl(req, clientAppBaseUrl);
    const approvalUrl = `${appBaseUrl}/assisted-listing?token=${newToken}`;
    const qrImageUrl = buildQrImageUrl(approvalUrl);

    const updated = await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
      assisted_qr_token: newToken,
      approval_url: approvalUrl,
      qr_image_url: qrImageUrl,
      assisted_qr_created_at: now.toISOString(),
      assisted_qr_expires_at: newExpiresAt,
      // Reset to pending if it was expired
      assisted_status: assisted.assisted_status === 'assisted_expired'
        ? 'pending_seller_approval'
        : assisted.assisted_status,
    });

    console.log(`[regenerateAssistedQR] Regenerated token for assisted listing ${assisted.id}`);

    return Response.json({ assisted: updated });
  } catch (error) {
    console.error('[regenerateAssistedQR] error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to regenerate QR' }, { status: 500 });
  }
});