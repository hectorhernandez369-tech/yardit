import { base44 } from "@/api/base44Client";

export const ADMIN_PREVIEW_ENTRY_ACTION = "admin_entered_organization_dashboard";
export const ADMIN_PREVIEW_EXIT_ACTION = "admin_exited_organization_dashboard";

export async function createAdminPreviewAuditLog({ actionType, user, account, dashboardType, occurredAt }) {
  const timestamp = occurredAt || new Date().toISOString();
  const metadata = {
    organization_id: account.id,
    organization_name: account.business_name || account.vendor_display_name || "Unnamed Organization",
    organization_type: account.organization_type || "vendor",
    dashboard_type: dashboardType,
    admin_email: user?.email || "",
    source: "adminPreview",
  };

  if (actionType === ADMIN_PREVIEW_ENTRY_ACTION) {
    metadata.entered_at = timestamp;
  }

  if (actionType === ADMIN_PREVIEW_EXIT_ACTION) {
    metadata.exited_at = timestamp;
  }

  return base44.entities.AdminAuditLog.create({
    user_id: user?.id || "",
    admin_employee_id: user?.employee_id || user?.admin_employee_id || user?.email || user?.id || "master",
    action_type: actionType,
    target_type: "VendorAccount",
    target_id: account.id,
    success: true,
    metadata: JSON.stringify(metadata),
  });
}