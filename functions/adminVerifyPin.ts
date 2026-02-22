import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    const { employee_id, pin } = await req.json();

    if (!employee_id || !pin) {
      return Response.json({ ok: false, reason: "missing_credentials" }, { status: 400 });
    }

    // Lookup AdminAccessKey by employee_id (service role)
    const accessKeys = await base44.asServiceRole.entities.AdminAccessKey.filter({ employee_id });
    const accessKey = accessKeys.length > 0 ? accessKeys[0] : null;

    if (!accessKey || !accessKey.is_active) {
      await base44.asServiceRole.entities.AdminAuditLog.create({
        user_id: user.id,
        admin_employee_id: employee_id,
        action_type: "admin_pin_fail",
        target_type: "system",
        success: false,
        metadata: JSON.stringify({ reason: "not_found_or_inactive" })
      });
      return Response.json({ ok: false, reason: "invalid" });
    }

    // Check if locked
    if (accessKey.locked_until) {
      const lockedUntil = new Date(accessKey.locked_until);
      if (lockedUntil > new Date()) {
        await base44.asServiceRole.entities.AdminAuditLog.create({
          user_id: user.id,
          admin_employee_id: employee_id,
          action_type: "admin_pin_locked",
          target_type: "system",
          success: false,
          metadata: JSON.stringify({ locked_until: accessKey.locked_until })
        });
        return Response.json({ ok: false, reason: "locked", locked_until: accessKey.locked_until });
      }
    }

    // Compare pin against pin_hash
    const pinMatch = await bcrypt.compare(pin, accessKey.pin_hash);

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
        action_type: "admin_pin_fail",
        target_type: "system",
        success: false,
        metadata: JSON.stringify({
          attempts: newFailed,
          ...(isNowLocked && { locked_until: updatePayload.locked_until })
        })
      });

      if (isNowLocked) {
        return Response.json({ ok: false, reason: "locked", locked_until: updatePayload.locked_until });
      }
      return Response.json({ ok: false, reason: "invalid" });
    }

    // PIN matched — reset counters
    await base44.asServiceRole.entities.AdminAccessKey.update(accessKey.id, {
      failed_attempts: 0,
      locked_until: null
    });

    await base44.asServiceRole.entities.AdminAuditLog.create({
      user_id: accessKey.user_id || user.id,
      admin_employee_id: employee_id,
      action_type: "admin_pin_success",
      target_type: "system",
      success: true,
      metadata: JSON.stringify({ user_id: accessKey.user_id || user.id })
    });

    return Response.json({
      ok: true,
      employee_id: accessKey.employee_id,
      user_id: accessKey.user_id || user.id
    });

  } catch (error) {
    console.error("adminVerifyPin error:", error);
    return Response.json({ ok: false, reason: "internal_error", error: error.message }, { status: 500 });
  }
});