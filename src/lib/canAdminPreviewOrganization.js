// Future granular admin permissions can be added here without broadening organization dashboard preview access.
export function canAdminPreviewOrganization(user) {
  return user?.role === "master";
}