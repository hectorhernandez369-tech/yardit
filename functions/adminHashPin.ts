import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can hash PINs (used during Create Admin)
    if (!['admin', 'admin_lite', 'supervisor', 'master'].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { pin } = await req.json();

    if (!pin || pin.length < 4) {
      return Response.json({ error: "PIN must be at least 4 characters" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(pin, salt);

    return Response.json({ pin_hash: hash });

  } catch (error) {
    console.error("adminHashPin error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});