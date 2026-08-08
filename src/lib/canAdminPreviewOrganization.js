// Developer emails that always have unrestricted access to all accounts
const DEVELOPER_EMAILS = new Set([
  "hectorhernandez369@gmail.com",
]);

// Master admins and developers can preview/manage any organization dashboard
// without restrictions — used for troubleshooting and assisting users.
export function canAdminPreviewOrganization(user) {
  if (!user) return false;
  if (user.role === "master" || user.role === "super_master") return true;
  if (user.email && DEVELOPER_EMAILS.has(user.email.toLowerCase())) return true;
  return false;
}