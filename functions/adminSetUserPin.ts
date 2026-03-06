import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    // We must check if the user has master role in AdminProfile
    const profiles = await base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile || profile.role_label !== 'master') {
      return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    const { target_employee_id, new_pin, current_admin_employee_id } = await req.json();

    if (!target_employee_id || !new_pin) {
      return Response.json({ ok: false, reason: "missing_fields" }, { status: 400 });
    }

    if (new_pin.length < 4) {
      return Response.json({ ok: false, reason: "pin_too_short" }, { status: 400 });
    }

    const accessKeys = await base44.asServiceRole.entities.AdminAccessKey.filter({ employee_id: target_employee_id });
    const accessKey = accessKeys.length > 0 ? accessKeys[0] : null;

    if (!accessKey) {
      return Response.json({ ok: false, reason: "invalid_employee" }, { status: 404 });
    }

    // Hash new pin
    const salt = await bcrypt.genSalt(10);
    const new_pin_hash = await bcrypt.hash(new_pin, salt);

    await base44.asServiceRole.entities.AdminAccessKey.update(accessKey.id, {
      pin_hash: new_pin_hash,
      failed_attempts: 0,
      locked_until: null
    });

    await base44.asServiceRole.entities.AdminAuditLog.create({
      user_id: user.id,
      admin_employee_id: current_admin_employee_id || profile.employee_id || "",
      action_type: "admin_pin_reset_by_master",
      target_type: "admin",
      target_id: target_employee_id,
      success: true,
      metadata: JSON.stringify({})
    });

    return Response.json({ ok: true });

  } catch (error) {
    console.error("adminSetUserPin error:", error);
    return Response.json({ ok: false, reason: "internal_error", error: error.message }, { status: 500 });
  }
});