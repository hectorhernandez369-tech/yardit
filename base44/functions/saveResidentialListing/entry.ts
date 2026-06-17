import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DESCRIPTION_LIMITS = {
  yard_sale: 500,
  neighborhood_sale: 1000,
  event: 1000,
};

function getDescriptionLimit(listingType) {
  return DESCRIPTION_LIMITS[listingType] || null;
}

function getDescriptionValue(data = {}) {
  if (data.listingType === 'event') return data.event_description || data.description || '';
  return data.description || '';
}

function validateDescription(data = {}) {
  const limit = getDescriptionLimit(data.listingType);
  if (!limit) return { ok: true };
  const length = String(getDescriptionValue(data)).length;
  if (length > limit) {
    return { ok: false, error: `Description must be ${limit} characters or fewer.` };
  }
  return { ok: true };
}

function canManageListing(user, listing) {
  return listing.ownerUserId === user.id || ['admin', 'master', 'supervisor', 'super_master'].includes(user.role);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const action = payload.action || 'create';
    const data = payload.data || {};

    if (action === 'create') {
      const validation = validateDescription(data);
      if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });

      const ownerUserId = data.ownerUserId || user.id;
      if (ownerUserId !== user.id && !['admin', 'master', 'supervisor', 'super_master'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const created = await base44.asServiceRole.entities.Listing.create({ ...data, ownerUserId });
      return Response.json({ ok: true, listing: created });
    }

    if (action === 'update') {
      const listingId = payload.listing_id || payload.listingId;
      if (!listingId) return Response.json({ error: 'Missing listing_id' }, { status: 400 });

      const listings = await base44.asServiceRole.entities.Listing.filter({ id: listingId });
      const existing = listings?.[0];
      if (!existing) return Response.json({ error: 'Listing not found' }, { status: 404 });
      if (!canManageListing(user, existing)) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const nextData = { ...existing, ...data, listingType: data.listingType || existing.listingType };
      const validation = validateDescription(nextData);
      if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });

      const updated = await base44.asServiceRole.entities.Listing.update(listingId, data);
      return Response.json({ ok: true, listing: updated });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('saveResidentialListing error:', error?.message || error);
    return Response.json({ error: error?.message || 'Could not save listing' }, { status: 500 });
  }
});