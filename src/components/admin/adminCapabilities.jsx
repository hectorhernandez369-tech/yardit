/**
 * Admin capability checks based on user role.
 * Roles: admin (mapped to admin_lite), admin_lite, supervisor, master
 */

function normalizeRole(role) {
  if (role === "admin") return "admin_lite";
  return role;
}

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