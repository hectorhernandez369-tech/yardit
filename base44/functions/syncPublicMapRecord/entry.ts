import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RECORD_FIELDS = [
  'type', 'tier', 'event_tier', 'title', 'description', 'logo_url', 'icon_url', 'icon', 'event_icon',
  'latitude', 'longitude', 'lat', 'lng', 'display_address', 'start_datetime', 'end_datetime',
  'start_date', 'end_date', 'status', 'visibility', 'updated_at', 'vendor_pin_id', 'checkin_status',
  'checkin_end_time', 'pin_animation', 'animation_type', 'animation_enabled', 'animation', 'visibility_rules',
  'event_type', 'parent_event_id', 'child_event_count', 'floating_icon_enabled', 'marquee_enabled', 'child_events'
];

function preview(data) {
  const text = JSON.stringify(data || {});
  return text.length > 1800 ? text.slice(0, 1800) + '…' : text;
}

function buildRecord(sourceApp, sourceRecordId, payload) {
  const record = {
    source_app: sourceApp,
    source_record_id: sourceRecordId,
    raw_payload: payload,
    updated_at: new Date().toISOString(),
  };

  for (const field of RECORD_FIELDS) {
    if (payload[field] !== undefined) {
      record[field] = payload[field];
    }
  }

  if (record.lat === undefined && typeof record.latitude === 'number') record.lat = record.latitude;
  if (record.lng === undefined && typeof record.longitude === 'number') record.lng = record.longitude;
  if (record.latitude === undefined && typeof record.lat === 'number') record.latitude = record.lat;
  if (record.longitude === undefined && typeof record.lng === 'number') record.longitude = record.lng;

  return record;
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get('YARDIT_VENDOR_SYNC_SECRET');
  const providedSecret = req.headers.get('x-yardit-sync-secret');

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base44 = createClientFromRequest(req);
  let body = null;

  const writeLog = async ({ source_app, source_record_id, action, status, message, requestBody }) => {
    await base44.asServiceRole.entities.PublicMapSyncLog.create({
      source_app: source_app || '',
      source_record_id: source_record_id || '',
      action: action || '',
      status,
      message,
      payload_preview: preview(requestBody),
    });
  };

  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    body = await req.json();
    const { action, source_app, source_record_id, payload } = body;

    if (!['create', 'update', 'delete'].includes(action)) {
      throw new Error('Invalid action');
    }

    if (!source_app || !source_record_id) {
      throw new Error('source_app and source_record_id are required');
    }

    if ((action === 'create' || action === 'update') && (!payload || typeof payload !== 'object')) {
      throw new Error('payload is required for create/update');
    }

    const existing = await base44.asServiceRole.entities.PublicMapRecord.filter({ source_app, source_record_id }, '-created_date', 10);

    if (action === 'delete') {
      for (const record of existing) {
        await base44.asServiceRole.entities.PublicMapRecord.delete(record.id);
      }

      await writeLog({ source_app, source_record_id, action, status: 'success', message: 'Deleted public map record', requestBody: body });
      return Response.json({ success: true, action: 'delete', source_record_id });
    }

    const recordData = buildRecord(source_app, source_record_id, payload);
    let saved;
    let resultAction;

    if (existing.length > 0) {
      saved = await base44.asServiceRole.entities.PublicMapRecord.update(existing[0].id, recordData);
      resultAction = 'update';
    } else {
      saved = await base44.asServiceRole.entities.PublicMapRecord.create(recordData);
      resultAction = 'create';
    }

    await writeLog({ source_app, source_record_id, action: resultAction, status: 'success', message: 'Synced public map record', requestBody: body });

    return Response.json({
      success: true,
      action: resultAction,
      id: saved.id,
      source_record_id,
    });
  } catch (error) {
    console.error('syncPublicMapRecord error:', error.message);
    if (body) {
      await writeLog({
        source_app: body.source_app,
        source_record_id: body.source_record_id,
        action: body.action,
        status: 'failure',
        message: error.message,
        requestBody: body,
      });
    }
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
});