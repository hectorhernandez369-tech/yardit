/**
 * Admin capability checks based on user role.
 * Roles: admin (mapped to admin_lite), admin_lite, supervisor, master
 */

function normalizeRole(role) {
  if (role === "admin") return "admin_lite";
  return role;
}

export const AVAILABLE_ADMIN_CAPABILITIES = [
  {
    key: "admins.manage",
    label: "Manage Admins",
    description: "Create, edit, deactivate, and manage employee admin accounts.",
  },
  {
    key: "logs.view",
    label: "View Logs",
    description: "View admin logs and activity history.",
  },
  {
    key: "listings.admin_create",
    label: "Add Listing From Admin Dashboard",
    description: "Allows admin to create listings from the Admin Listings Dashboard using the existing admin-created listing flow.",
  },
  {
    key: "promotions.manage",
    label: "Manage Promotions",
    description: "Allows admin to create, edit, approve, or manage Yardit promotions.",
  },
];

const CAPABILITIES = {
  master: {
    "admins.manage": true,
    "logs.view": true,
  },
  supervisor: {
    "admins.manage": false,
    "logs.view": true,
  },
  admin_lite: {
    "admins.manage": false,
    "logs.view": false,
  },
};

export function hasCapability(user, capability) {
  const role = normalizeRole(user?.role);
  return CAPABILITIES[role]?.[capability] ?? false;
}