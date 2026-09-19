import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SETTING_LAST_RUN = 'new_user_scan_last_run';
const SETTING_RECIPIENT = 'new_user_alert_recipient_email';
const DEFAULT_WINDOW_HOURS = 12;
const TIMEZONE = 'America/Los_Angeles';

function formatDateTime(iso) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso || '(unknown)';
  }
}

async function getSetting(base44, key) {
  const rows = await base44.asServiceRole.entities.AppSetting.filter({ key });
  return rows.length ? rows[0].value : null;
}

async function setSetting(base44, key, value) {
  const rows = await base44.asServiceRole.entities.AppSetting.filter({ key });
  if (rows.length) {
    await base44.asServiceRole.entities.AppSetting.update(rows[0].id, { value });
  } else {
    await base44.asServiceRole.entities.AppSetting.create({ key, value });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const lastRunIso = await getSetting(base44, SETTING_LAST_RUN);
    const scanStart = lastRunIso
      ? new Date(lastRunIso)
      : new Date(now.getTime() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000);

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const newUsers = users.filter((u) => new Date(u.created_date) >= scanStart);

    // Advance the scan window for the next run regardless of whether we email.
    await setSetting(base44, SETTING_LAST_RUN, now.toISOString());

    if (!newUsers.length) {
      return Response.json({
        success: true,
        sent: false,
        new_user_count: 0,
        scan_start: scanStart.toISOString(),
      });
    }

    let recipient = await getSetting(base44, SETTING_RECIPIENT);
    if (!recipient) {
      const admin = users.find((u) => u.role === 'admin' && u.email);
      recipient = admin?.email;
    }
    if (!recipient) {
      return Response.json({
        success: false,
        sent: false,
        error: 'no recipient email configured',
        new_user_count: newUsers.length,
      });
    }

    const count = newUsers.length;
    const rowsHtml = newUsers
      .map((u, i) => {
        const name = u.full_name || '(no name)';
        const email = u.email || '(no email)';
        const signedUp = u.created_date ? formatDateTime(u.created_date) : '(unknown)';
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888;">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">${name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${email}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;">${signedUp}</td>
        </tr>`;
      })
      .join('');

    const subject = count === 1 ? '1 new Yardit user signed up' : `${count} new Yardit users signed up`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1F2937;">
      <h2 style="color:#2C4F4E;margin-bottom:4px;">${count} new user${count === 1 ? '' : 's'} signed up</h2>
      <p style="margin-top:0;color:#666;font-size:13px;">Since ${formatDateTime(scanStart.toISOString())}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#F3E6CF;text-align:left;">
            <th style="padding:8px 12px;">#</th>
            <th style="padding:8px 12px;">Name</th>
            <th style="padding:8px 12px;">Email</th>
            <th style="padding:8px 12px;">Signed up</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="margin-top:16px;font-size:12px;color:#888;">You receive this digest twice daily (12 PM &amp; 12 AM). To send it to a specific address, set the "new_user_alert_recipient_email" app setting.</p>
    </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({ to: recipient, subject, html });

    return Response.json({
      success: true,
      sent: true,
      new_user_count: count,
      recipient,
      scan_start: scanStart.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});