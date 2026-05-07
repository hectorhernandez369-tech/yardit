import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordType, recordId } = await req.json();
    if (!recordType || !recordId) {
      return Response.json({ error: 'recordType and recordId are required' }, { status: 400 });
    }

    return Response.json({ success: true, recordType, recordId });
  } catch (error) {
    console.error('syncPublicMapRecord error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});