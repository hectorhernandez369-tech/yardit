import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function statusLabel(status = '') {
  const value = String(status || '');
  if (['pending_seller_approval', 'pending_owner_approval'].includes(value)) return 'Pending';
  if (['assisted_active_unclaimed', 'assisted_active_claim_pending'].includes(value)) return 'Accepted';
  if (value === 'claimed_active') return 'Claimed';
  if (value === 'assisted_declined') return 'Canceled';
  if (value === 'assisted_expired') return 'Expired';
  return value || 'Unknown';
}

async function getUnderlying(base44, kind, id) {
  if (!id) return null;
  const entity = kind === 'halloween' ? base44.asServiceRole.entities.Location : base44.asServiceRole.entities.Listing;
  const rows = await entity.filter({ id }).catch(() => []);
  return rows?.[0] || null;
}

function normalizeRow(record, kind, underlying) {
  const isHalloween = kind === 'halloween';
  const address = isHalloween
    ? (underlying?.address || [record.property_address, record.property_city, record.property_state, record.property_zip].filter(Boolean).join(', '))
    : (record.assisted_sale_formatted_address || [record.assisted_sale_address, record.assisted_sale_city, record.assisted_sale_state, record.assisted_sale_zip].filter(Boolean).join(', '));

  return {
    id: record.id,
    kind,
    assisted_status: record.assisted_status,
    status_label: statusLabel(record.assisted_status),
    created_date: record.created_date,
    updated_date: record.updated_date,
    admin_creator_id: record.admin_creator_id,
    admin_creator_email: record.admin_creator_email || '',
    underlying_id: isHalloween ? record.location_id : record.listing_id,
    title: underlying?.display_title || underlying?.title || (isHalloween ? 'Halloween Spot' : 'Assisted Yard Sale'),
    address,
    qr_scan_count: Number(record.qr_scan_count || 0),
    approval_url: record.approval_url || '',
    claimed_by_user_id: record.claimed_by_user_id || '',
    claimed_at: record.claimed_at || '',
    approved_at: record.owner_approved_at || record.seller_approved_at || '',
    declined_at: record.owner_declined_at || record.seller_declined_at || '',
    underlying_status: underlying?.status || '',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'list');

    if (action === 'list') {
      const [yardRows, halloweenRows] = await Promise.all([
        base44.asServiceRole.entities.AssistedListing.filter({ admin_creator_id: user.id }, '-created_date', 500).catch(() => []),
        base44.asServiceRole.entities.AssistedHalloweenSpot.filter({ admin_creator_id: user.id }, '-created_date', 500).catch(() => []),
      ]);

      const rows = [];
      for (const record of yardRows || []) {
        const underlying = await getUnderlying(base44, 'yard_sale', record.listing_id);
        rows.push(normalizeRow(record, 'yard_sale', underlying));
      }
      for (const record of halloweenRows || []) {
        const underlying = await getUnderlying(base44, 'halloween', record.location_id);
        rows.push(normalizeRow(record, 'halloween', underlying));
      }

      rows.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      return Response.json({ ok: true, rows });
    }

    const assistedId = String(body.assisted_id || '');
    const kind = body.kind === 'yard_sale' ? 'yard_sale' : 'halloween';
    if (!assistedId) return Response.json({ error: 'Missing assisted_id' }, { status: 400 });

    const entity = kind === 'halloween'
      ? base44.asServiceRole.entities.AssistedHalloweenSpot
      : base44.asServiceRole.entities.AssistedListing;
    const records = await entity.filter({ id: assistedId }).catch(() => []);
    const record = records?.[0];
    if (!record) return Response.json({ error: 'Assisted listing not found.' }, { status: 404 });
    if (String(record.admin_creator_id || '') !== String(user.id)) {
      return Response.json({ error: 'Only the creator can manage this assisted-listing history.' }, { status: 403 });
    }

    if (action === 'cancel') {
      if (record.assisted_status === 'claimed_active') {
        return Response.json({ error: 'This listing has already been claimed. Remove it from your assisted history instead of canceling the homeowner\'s listing.' }, { status: 409 });
      }

      const now = new Date().toISOString();
      if (kind === 'halloween') {
        if (record.location_id) {
          await base44.asServiceRole.entities.Location.update(record.location_id, { status: 'inactive' }).catch(() => {});
        }
        await entity.update(record.id, {
          assisted_status: 'assisted_declined',
          owner_declined_at: now,
          assisted_qr_token: `__cancelled__${record.id}`,
        });
      } else {
        if (record.listing_id) {
          await base44.asServiceRole.entities.Listing.update(record.listing_id, {
            status: 'cancelled',
            statusReason: 'Assisted listing canceled by creator',
          }).catch(() => {});
        }
        await entity.update(record.id, {
          assisted_status: 'assisted_declined',
          seller_declined_at: now,
          assisted_qr_token: `__cancelled__${record.id}`,
        });
      }

      return Response.json({ ok: true, status: 'assisted_declined' });
    }

    if (action === 'delete_history') {
      await entity.delete(record.id);
      return Response.json({ ok: true, deleted: true });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('manageAssistedHistory error:', error?.message || error);
    return Response.json({ error: error?.message || 'Assisted listing action failed.' }, { status: 500 });
  }
});
