import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    const { employee_id, current_pin, new_pin } = await req.json();

    if (!employee_id || !current_pin || !new_pin) {
      return Response.json({ ok: false, reason: "missing_fields" }, { status: 400 });
    }
    
    if (new_pin.length < 4) {
      return Response.json({ ok: false, reason: "pin_too_short" }, { status: 400 });
    }

    const accessKeys = await base44.asServiceRole.entities.AdminAccessKey.filter({ employee_id });
    const accessKey = accessKeys.length > 0 ? accessKeys[0] : null;

    if (!accessKey) {
      return Response.json({ ok: false, reason: "invalid_employee" }, { status: 404 });
    }

    // Check if locked
    if (accessKey.locked_until) {
      const lockedUntil = new Date(accessKey.locked_until);
      if (lockedUntil > new Date()) {
        return Response.json({ ok: false, reason: "locked", locked_until: accessKey.locked_until }, { status: 403 });
      }
    }

    // Verify current PIN
    const pinMatch = await bcrypt.compare(current_pin, accessKey.pin_hash);

    if (!pinMatch) {
      const newFailed = (accessKey.failed_attempts || 0) + 1;
      const updatePayload = { failed_attempts: newFailed };
      let isNowLocked = false;

      if (newFailed >= 5) {
        const lockExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        updatePayload.locked_until = lockExpiry;
        updatePayload.failed_attempts = 0;
        isNowLocked = true;
      }

      await base44.asServiceRole.entities.AdminAccessKey.update(accessKey.id, updatePayload);

      await base44.asServiceRole.entities.AdminAuditLog.create({
        user_id: user.id,
        admin_employee_id: employee_id,
        action_type: "admin_pin_reset_self_fail",
        target_type: "system",
        success: false,
        metadata: JSON.stringify({
          attempts: newFailed,
          ...(isNowLocked && { locked_until: updatePayload.locked_until })
        })
      });

      if (isNowLocked) {
        return Response.json({ ok: false, reason: "locked", locked_until: updatePayload.locked_until }, { status: 403 });
      }
      return Response.json({ ok: false, reason: "invalid_current_pin" }, { status: 401 });
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
      admin_employee_id: employee_id,
      action_type: "admin_pin_reset_self",
      target_type: "system",
      success: true,
      metadata: JSON.stringify({})
    });

    return Response.json({ ok: true });

  } catch (error) {
    console.error("adminResetOwnPin error:", error);
    return Response.json({ ok: false, reason: "internal_error", error: error.message }, { status: 500 });
  }
});