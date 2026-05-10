/**
 * Admin capability checks based on user role.
 * Roles: admin (mapped to admin_lite), admin_lite, supervisor, master
 */

function normalizeRole(role) {
  if (role === "admin") return "admin_lite";
  return role;
}

export const ADMIN_CAPABILITY_SECTIONS = [
  {
    title: "ADMIN MANAGEMENT",
    permissions: [
      { key: "admin.invite", label: "Invite Admins", description: "Allows admin to invite new employee admins." },
      { key: "admin.profiles.edit", label: "Edit Admin Profiles", description: "Allows admin to edit employee admin profile details." },
      { key: "admin.deactivate", label: "Deactivate Admins", description: "Allows admin to deactivate employee admin accounts." },
      { key: "admin.delete", label: "Delete Admins", description: "Allows admin to delete employee admin access records." },
      { key: "admin.pin.reset", label: "Reset Admin PIN", description: "Allows admin to reset an employee admin PIN." },
      { key: "admin.permissions.edit", label: "Edit Admin Permissions", description: "Allows admin to edit employee admin permissions." },
      { key: "admin.logs.view", label: "View Admin Logs", description: "Allows admin to view admin logs and activity history." },
    ],
  },
  {
    title: "CASE / REPORT MANAGEMENT",
    permissions: [
      { key: "reports.view", label: "View Reports", description: "Allows admin to view submitted reports." },
      { key: "cases.open", label: "Open Cases", description: "Allows admin to open cases from reports or user issues." },
      { key: "cases.assign", label: "Assign Cases", description: "Allows admin to assign cases to employee admins." },
      { key: "reports.approve", label: "Approve Reports", description: "Allows admin to approve submitted reports." },
      { key: "reports.deny", label: "Deny Reports", description: "Allows admin to deny submitted reports." },
      { key: "cases.notes.add", label: "Add Case Notes", description: "Allows admin to add notes to cases." },
      { key: "cases.escalate", label: "Escalate Cases", description: "Allows admin to escalate cases for higher review." },
      { key: "cases.close", label: "Close Cases", description: "Allows admin to close resolved cases." },
      { key: "cases.reopen", label: "Reopen Cases", description: "Allows admin to reopen closed cases." },
    ],
  },
  {
    title: "LISTING MANAGEMENT",
    permissions: [
      { key: "listings.view_all", label: "View All Listings", description: "Allows admin to view all listings in the admin dashboard." },
      { key: "listings.admin_create", label: "Add Listing From Admin Dashboard", description: "Allows admin to create listings from the Admin Listings Dashboard using the existing admin-created listing flow." },
      { key: "listings.edit_any", label: "Edit Any Listing", description: "Allows admin to edit any listing." },
      { key: "listings.cancel", label: "Cancel Listings", description: "Allows admin to cancel active or scheduled listings." },
      { key: "listings.delete", label: "Delete Listings", description: "Allows admin to delete listings." },
      { key: "listings.restore", label: "Restore Listings", description: "Allows admin to restore eligible listings." },
      { key: "listings.status.override", label: "Override Listing Status", description: "Allows admin to manually override listing status." },
      { key: "listings.feature", label: "Feature / Unfeature Listings", description: "Allows admin to feature or unfeature listings." },
    ],
  },
  {
    title: "USER MANAGEMENT",
    permissions: [
      { key: "users.view", label: "View Users", description: "Allows admin to view user accounts." },
      { key: "users.profiles.edit", label: "Edit User Profiles", description: "Allows admin to edit user profile details." },
      { key: "users.suspend", label: "Suspend Users", description: "Allows admin to suspend user accounts." },
      { key: "users.reactivate", label: "Reactivate Users", description: "Allows admin to reactivate suspended user accounts." },
      { key: "users.delete", label: "Delete Users", description: "Allows admin to delete user accounts." },
      { key: "users.activity.view", label: "View User Activity", description: "Allows admin to view user activity history." },
    ],
  },
  {
    title: "REFUNDS / BILLING",
    permissions: [
      { key: "billing.payments.view", label: "View Payments", description: "Allows admin to view payment records." },
      { key: "billing.refunds.issue", label: "Issue Refunds", description: "Allows admin to issue approved refunds." },
      { key: "billing.refunds.approve", label: "Approve Refund Requests", description: "Allows admin to approve refund requests." },
      { key: "billing.refunds.deny", label: "Deny Refund Requests", description: "Allows admin to deny refund requests." },
      { key: "billing.history.view", label: "View Billing History", description: "Allows admin to view billing history." },
      { key: "billing.credits.apply", label: "Apply Credits / Promos", description: "Allows admin to apply credits or promotional adjustments." },
    ],
  },
  {
    title: "PROMOTIONS",
    permissions: [
      { key: "promotions.manage", label: "Manage Promotions", description: "Allows admin to create, edit, approve, or manage Yardit promotions." },
      { key: "promotions.create", label: "Create Promotions", description: "Allows admin to create promotions." },
      { key: "promotions.edit", label: "Edit Promotions", description: "Allows admin to edit promotions." },
      { key: "promotions.approve", label: "Approve Promotions", description: "Allows admin to approve promotions." },
      { key: "promotions.delete", label: "Delete Promotions", description: "Allows admin to delete promotions." },
      { key: "promotions.jth.manage", label: "Manage Join The Hunt", description: "Allows admin to manage Join The Hunt settings and promotions." },
      { key: "promotions.coins.manage", label: "Manage Coin Events", description: "Allows admin to manage coin events." },
    ],
  },
  {
    title: "SYSTEM SETTINGS",
    permissions: [
      { key: "system.demo.toggle", label: "Toggle Demo Mode", description: "Allows admin to turn demo mode on or off." },
      { key: "system.settings.edit", label: "Edit App Settings", description: "Allows admin to edit app-wide settings." },
      { key: "system.categories.manage", label: "Manage Categories", description: "Allows admin to manage app categories." },
      { key: "system.logs.view", label: "View System Logs", description: "Allows admin to view system logs." },
    ],
  },
];

export const AVAILABLE_ADMIN_CAPABILITIES = ADMIN_CAPABILITY_SECTIONS.flatMap((section) => section.permissions.map((permission) => ({ ...permission, section: section.title })));

export const ROLE_DEFAULT_CAPABILITIES = {
  basic: ["reports.view", "cases.notes.add", "listings.view_all", "users.view"],
  supervisor: ["reports.view", "cases.open", "cases.assign", "reports.approve", "reports.deny", "cases.notes.add", "cases.escalate", "cases.close", "cases.reopen", "listings.view_all", "listings.edit_any", "users.view", "users.activity.view", "admin.logs.view"],
  master: AVAILABLE_ADMIN_CAPABILITIES.map((permission) => permission.key),
};

const LEGACY_CAPABILITY_ALIASES = {
  "admins.manage": "admin.permissions.edit",
  "logs.view": "admin.logs.view",
};

const ROLE_FALLBACK_CAPABILITIES = {
  master: ROLE_DEFAULT_CAPABILITIES.master,
  supervisor: ROLE_DEFAULT_CAPABILITIES.supervisor,
  admin_lite: [],
  basic: ROLE_DEFAULT_CAPABILITIES.basic,
};

export function hasCapability(user, capability) {
  const role = normalizeRole(user?.role_label || user?.role);
  const normalizedCapability = LEGACY_CAPABILITY_ALIASES[capability] || capability;

  if (role === "master") return true;

  const savedCapabilities = Array.isArray(user?.capabilities) ? user.capabilities : null;
  if (savedCapabilities) {
    return savedCapabilities.includes(normalizedCapability) || savedCapabilities.includes(capability);
  }

  return (ROLE_FALLBACK_CAPABILITIES[role] || []).includes(normalizedCapability);
}