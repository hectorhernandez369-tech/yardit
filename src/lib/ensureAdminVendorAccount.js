/**
 * ensureAdminVendorAccount
 *
 * Silently ensures that a master/super-master admin user has a linked
 * VendorAccount. If none exists, auto-creates one and logs the action.
 *
 * Returns the VendorAccount (existing or newly created), or null on failure.
 *
 * Only runs for high-level roles: master, super_master.
 */

import { base44 } from "@/api/base44Client";
import {
  buildVendorAccountIdentityFields,
  getNextVendorAccountNumber,
  getNextVendorSlug,
} from "@/lib/vendorAccountIdentity";

const MASTER_ROLES = new Set(["master", "super_master"]);

export function isMasterAdminRole(role) {
  return MASTER_ROLES.has(role);
}

export async function ensureAdminVendorAccount(user) {
  if (!user?.id || !user?.email) return null;

  const role = user.role || user.role_label;
  if (!isMasterAdminRole(role)) return null;

  try {
    // Check for existing account by owner_user_id or owner_email
    const [byId, byEmail] = await Promise.all([
      base44.entities.VendorAccount.filter({ owner_user_id: user.id }),
      base44.entities.VendorAccount.filter({ owner_email: user.email }),
    ]);

    const existing = [...byId, ...byEmail].find(a => a.is_active !== false);
    if (existing) return existing;

    // None found — auto-create
    const firstName = (user.full_name || user.email || "Admin").split(" ")[0];
    const businessName = `Yardit Admin – ${firstName}`;

    const [allAccounts, allReservations] = await Promise.all([
      base44.entities.VendorAccount.list(),
      base44.entities.VendorAccountIdentityReservation.list().catch(() => []),
    ]);

    const vendorAccountNumber = getNextVendorAccountNumber(allAccounts, allReservations);
    const vendorSlug = getNextVendorSlug(businessName, allAccounts, allReservations);

    const newAccount = await base44.entities.VendorAccount.create({
      business_name: businessName,
      vendor_display_name: businessName,
      legal_business_name: businessName,
      owner_name: user.full_name || user.email,
      owner_email: user.email,
      owner_user_id: user.id,
      vendor_account_number: vendorAccountNumber,
      account_number: vendorAccountNumber,
      vendor_slug: vendorSlug,
      organization_type: "vendor",
      vendor_tier: "growth",
      subscription_status: "active",
      vendor_setup_status: "complete",
      setup_tier_confirmed: true,
      is_verified_vendor: true,
      is_active: true,
      is_internal_admin_vendor: true,
      vendor_origin: "admin_auto_created",
      description: "Internal admin vendor account — auto-created for dashboard access.",
      organization_user_ids: [user.id],
      organization_staff_emails: [user.email],
      organization_permissions: {},
      assigned_pin_ids: [],
      team_settings: {},
      extra_users_count: 0,
      extra_pins_count: 0,
      current_authorized_users: 0,
      current_vendor_pins: 0,
    });

    // Audit log — best effort
    base44.entities.AdminAuditLog.create({
      admin_id: user.id,
      admin_email: user.email,
      action_type: "admin_vendor_account_auto_created",
      target_entity_type: "VendorAccount",
      target_entity_id: newAccount.id,
      description: `Auto-created internal vendor account "${businessName}" (${vendorAccountNumber}) for master admin ${user.email}.`,
      metadata: { vendor_account_number: vendorAccountNumber, role },
    }).catch(() => {});

    return newAccount;
  } catch (err) {
    console.error("ensureAdminVendorAccount error:", err);
    return null;
  }
}