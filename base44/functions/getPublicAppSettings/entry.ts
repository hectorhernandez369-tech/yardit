import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const settings = await base44.asServiceRole.entities.AppSetting.list();

    return Response.json({
      settings: settings.map((setting) => ({
        key: setting.key,
        value: setting.value,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});