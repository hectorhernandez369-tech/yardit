export const COLLABORATOR_ROLES = {
  owner: "Owner",
  co_host: "Co-Host",
  scheduler: "Scheduler",
  vendor_manager: "Vendor Manager",
  staff: "Staff",
  viewer: "Viewer",
};

export const ROLE_PERMISSIONS = {
  owner: {
    editEvent: true,
    manageVendors: true,
    manageSchedule: true,
    manageFlags: true,
    manageStaff: true,
    manageCollaborators: true,
    deleteEvent: false,
    manageVisibility: true,
    managePayments: true,
    removePrimaryOwner: false,
    readOnly: false,
  },
  co_host: {
    editEvent: true,
    manageVendors: true,
    manageSchedule: true,
    manageFlags: true,
    manageStaff: true,
    manageCollaborators: false,
    deleteEvent: false,
    manageVisibility: true,
    managePayments: false,
    removePrimaryOwner: false,
    readOnly: false,
  },
  scheduler: {
    editEvent: false,
    manageVendors: false,
    manageSchedule: true,
    manageFlags: true,
    manageStaff: false,
    manageCollaborators: false,
    deleteEvent: false,
    manageVisibility: false,
    managePayments: false,
    removePrimaryOwner: false,
    readOnly: false,
  },
  vendor_manager: {
    editEvent: false,
    manageVendors: true,
    manageSchedule: false,
    manageFlags: false,
    manageStaff: false,
    manageCollaborators: false,
    deleteEvent: false,
    manageVisibility: false,
    managePayments: true,
    removePrimaryOwner: false,
    readOnly: false,
  },
  staff: {
    editEvent: true,
    manageVendors: false,
    manageSchedule: true,
    manageFlags: false,
    manageStaff: false,
    manageCollaborators: false,
    deleteEvent: false,
    manageVisibility: false,
    managePayments: false,
    removePrimaryOwner: false,
    readOnly: false,
  },
  viewer: {
    editEvent: false,
    manageVendors: false,
    manageSchedule: false,
    manageFlags: false,
    manageStaff: false,
    manageCollaborators: false,
    deleteEvent: false,
    manageVisibility: false,
    managePayments: false,
    removePrimaryOwner: false,
    readOnly: true,
  },
};

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}

export function normalizeOrganizationIds(organizationIds = []) {
  return organizationIds.filter(Boolean);
}

export function getAcceptedCollaborators(collaborators = []) {
  return collaborators.filter((collaborator) => collaborator.status === "accepted" && collaborator.is_primary_owner !== true);
}

export function getPrimaryOwnerOrganizationId(event, collaborators = []) {
  const primaryCollaborator = collaborators.find((collaborator) => collaborator.event_id === event?.id && collaborator.is_primary_owner === true && collaborator.status === "accepted");
  return primaryCollaborator?.organization_id || event?.organizer_business_id;
}

export function getOrganizationEventCollaboration(event, collaborators = [], organizationIds = []) {
  const ids = normalizeOrganizationIds(organizationIds);
  return collaborators.find((collaborator) =>
    collaborator.event_id === event?.id &&
    ids.includes(collaborator.organization_id) &&
    collaborator.status !== "removed"
  ) || null;
}

export function isPrimaryOwnerForEvent(event, collaborators = [], organizationIds = []) {
  const primaryOwnerId = getPrimaryOwnerOrganizationId(event, collaborators);
  return normalizeOrganizationIds(organizationIds).includes(primaryOwnerId);
}

export function canAccessEvent(event, collaborators = [], organizationIds = []) {
  const collaboration = getOrganizationEventCollaboration(event, collaborators, organizationIds);
  return isPrimaryOwnerForEvent(event, collaborators, organizationIds) || collaboration?.status === "accepted";
}

export function getEventPermissionContext(event, collaborators = [], organizationIds = []) {
  const primaryOwner = isPrimaryOwnerForEvent(event, collaborators, organizationIds);
  const collaboration = getOrganizationEventCollaboration(event, collaborators, organizationIds);
  const permissions = primaryOwner ? {
    editEvent: true,
    manageVendors: true,
    manageSchedule: true,
    manageFlags: true,
    manageStaff: true,
    manageCollaborators: true,
    deleteEvent: true,
    manageVisibility: true,
    managePayments: true,
    removePrimaryOwner: false,
    readOnly: false,
  } : { ...getRolePermissions(collaboration?.role), ...(collaboration?.permissions || {}) };

  return { primaryOwner, collaboration, permissions, accepted: primaryOwner || collaboration?.status === "accepted", pending: collaboration?.status === "pending" };
}

function hasPermission(event, collaborators, organizationIds, key) {
  const context = getEventPermissionContext(event, collaborators, organizationIds);
  return context.accepted && context.permissions[key] === true;
}

export function canEditEvent(event, collaborators = [], organizationIds = []) {
  return hasPermission(event, collaborators, organizationIds, "editEvent");
}

export function canManageVendors(event, collaborators = [], organizationIds = []) {
  return hasPermission(event, collaborators, organizationIds, "manageVendors");
}

export function canManageSchedule(event, collaborators = [], organizationIds = []) {
  return hasPermission(event, collaborators, organizationIds, "manageSchedule");
}

export function canManageFlags(event, collaborators = [], organizationIds = []) {
  return hasPermission(event, collaborators, organizationIds, "manageFlags");
}

export function canManageCollaborators(event, collaborators = [], organizationIds = []) {
  return hasPermission(event, collaborators, organizationIds, "manageCollaborators");
}

export function canDeleteEvent(event, collaborators = [], organizationIds = []) {
  return hasPermission(event, collaborators, organizationIds, "deleteEvent");
}

export function getHostedByLabels(event, collaborators = [], vendorAccounts = []) {
  const primaryOwnerId = getPrimaryOwnerOrganizationId(event, collaborators);
  const primaryAccount = vendorAccounts.find((account) => account.id === primaryOwnerId);
  const coHosts = getAcceptedCollaborators(collaborators.filter((collaborator) => collaborator.event_id === event?.id))
    .map((collaborator) => vendorAccounts.find((account) => account.id === collaborator.organization_id)?.business_name || collaborator.organization_name)
    .filter(Boolean);

  return {
    hostedBy: primaryAccount?.business_name || event?.organizer_business_name || "Organizer",
    coHostedBy: coHosts,
  };
}