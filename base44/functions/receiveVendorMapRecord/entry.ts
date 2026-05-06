import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const jsonResponse = (body, status = 200) => Response.json(body, { status });

const getProvidedSecret = (req, body) => {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return req.headers.get('x-yardit-sync-secret') || body?.secret || '';
};

const pickPayload = (body) => body?.payload || body?.record || body?.data || null;
const pickSourceRecordId = (body, payload) => body?.source_record_id || body?.sourceRecordId || body?.external_id || body?.externalId || payload?.source_record_id || payload?.id;

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await req.json();
    const expectedSecret = Deno.env.get('YARDIT_VENDOR_SYNC_SECRET');
    const providedSecret = getProvidedSecret(req, body);

    if (!expectedSecret || providedSecret !== expectedSecret) {
      console.error('Vendor map sync rejected: invalid secret');
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const action = String(body?.action || '').toLowerCase();
    if (!['create', 'update', 'delete'].includes(action)) {
      return jsonResponse({ error: 'Invalid action. Use create, update, or delete.' }, 400);
    }

    const payload = pickPayload(body);
    const sourceApp = body?.source_app || body?.sourceApp || payload?.source_app || 'vendor_event_app';
    const sourceRecordId = pickSourceRecordId(body, payload);

    if (!sourceRecordId) {
      return jsonResponse({ error: 'Missing source_record_id' }, 400);
    }

    const base44 = createClientFromRequest(req);
    const existing = await base44.asServiceRole.entities.PublicMapRecord.filter({
      source_app: sourceApp,
      source_record_id: String(sourceRecordId),
    });

    if (action === 'delete') {
      if (existing[0]) {
        await base44.asServiceRole.entities.PublicMapRecord.delete(existing[0].id);
      }
      return jsonResponse({ success: true, action: 'delete', source_record_id: String(sourceRecordId) });
    }

    if (!payload || typeof payload !== 'object') {
      return jsonResponse({ error: 'Missing public map payload' }, 400);
    }

    const lat = Number(payload.lat ?? payload.latitude);
    const lng = Number(payload.lng ?? payload.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return jsonResponse({ error: 'Payload must include valid lat/lng coordinates' }, 400);
    }

    const recordData = {
      source_app: sourceApp,
      source_record_id: String(sourceRecordId),
      payload: { ...payload, lat, lng },
      status: 'active',
      last_synced_at: new Date().toISOString(),
    };

    let saved;
    if (existing[0]) {
      saved = await base44.asServiceRole.entities.PublicMapRecord.update(existing[0].id, recordData);
    } else {
      saved = await base44.asServiceRole.entities.PublicMapRecord.create(recordData);
    }

    return jsonResponse({ success: true, action, id: saved.id, source_record_id: String(sourceRecordId) });
  } catch (error) {
    console.error('Vendor map sync error:', error?.message || error);
    return jsonResponse({ error: error.message || 'Sync failed' }, 500);
  }
});