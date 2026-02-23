import { base44 } from "@/api/base44Client";

/**
 * Runs on every app load for logged-in users.
 * Accepts any pending AdminInviteProfile, creates AdminProfile,
 * links AdminAccessKey, and logs the acceptance.
 * Returns { accepted: boolean, adminProfile: object|null }
 */
export async function syncAdminInvite(currentUser) {
  if (!currentUser?.email) return { accepted: false, adminProfile: null };

  const email = currentUser.email.toLowerCase();

  // Check if AdminProfile already exists
  const [profilesByEmail, profilesByUserId] = await Promise.all([
    base44.entities.AdminProfile.filter({ email }),
    base44.entities.AdminProfile.filter({ user_id: currentUser.id }),
  ]);

  let existingProfile = profilesByUserId[0] || profilesByEmail[0];

  // If found by email but user_id is wrong/missing, fix it
  if (existingProfile && existingProfile.user_id !== currentUser.id) {
    console.log("ADMIN INVITE SYNC - healing user_id mismatch", {
      profileId: existingProfile.id,
      oldUserId: existingProfile.user_id,
      correctUserId: currentUser.id,
    });
    await base44.entities.AdminProfile.update(existingProfile.id, { user_id: currentUser.id });
    existingProfile = { ...existingProfile, user_id: currentUser.id };
  }

  // Bootstrap: fix MasterOB1k placeholder
  if (!existingProfile) {
    const allProfiles = await base44.entities.AdminProfile.list();
    const bootstrapProfile = allProfiles.find(
      p => p.employee_id === "MasterOB1k" && (!p.user_id || p.user_id === "__PLACEHOLDER__")
    );
    if (bootstrapProfile) {
      await base44.entities.AdminProfile.update(bootstrapProfile.id, {
        user_id: currentUser.id,
        email,
        first_name: currentUser.full_name?.split(" ")[0] || bootstrapProfile.first_name,
        last_name: currentUser.full_name?.split(" ").slice(1).join(" ") || bootstrapProfile.last_name,
        last_login_at: new Date().toISOString(),
      });
      const accessKeys = await base44.entities.AdminAccessKey.filter({ employee_id: "MasterOB1k" });
      for (const ak of accessKeys) {
        if (!ak.user_id || ak.user_id === "__PLACEHOLDER__") {
          await base44.entities.AdminAccessKey.update(ak.id, { user_id: currentUser.id });
        }
      }
      existingProfile = { ...bootstrapProfile, user_id: currentUser.id, email };
    }
  }

  if (existingProfile) {
    return { accepted: false, adminProfile: existingProfile };
  }

  // No profile — look for pending invite
  const invites = await base44.entities.AdminInviteProfile.filter({ email });
  const pendingInvite = invites.find(i => i.status === "pending");

  if (!pendingInvite) {
    return { accepted: false, adminProfile: null };
  }

  // Accept the invite: create AdminProfile
  await base44.entities.AdminProfile.create({
    user_id: currentUser.id,
    email: pendingInvite.email.toLowerCase(),
    employee_id: pendingInvite.employee_id,
    role_label: pendingInvite.role_label,
    first_name: pendingInvite.first_name,
    last_name: pendingInvite.last_name,
    dob: pendingInvite.dob,
    phone: pendingInvite.phone,
    address: pendingInvite.address || "",
    capabilities: pendingInvite.capabilities,
    is_active: true,
    last_login_at: new Date().toISOString(),
    ...(pendingInvite.supervisor_user_id ? {
      supervisor_user_id: pendingInvite.supervisor_user_id,
      supervisor_employee_id: pendingInvite.supervisor_employee_id,
    } : {}),
  });

  // Mark invite as accepted
  await base44.entities.AdminInviteProfile.update(pendingInvite.id, {
    status: "accepted",
  });

  // Link AdminAccessKey
  const accessKeys = await base44.entities.AdminAccessKey.filter({ employee_id: pendingInvite.employee_id });
  for (const ak of accessKeys) {
    if (!ak.user_id || ak.user_id === "__PLACEHOLDER__") {
      await base44.entities.AdminAccessKey.update(ak.id, { user_id: currentUser.id });
    }
  }

  // Audit log
  await base44.entities.AdminAuditLog.create({
    user_id: currentUser.id,
    admin_employee_id: pendingInvite.employee_id,
    action_type: "admin_invite_accepted",
    target_type: "admin",
    target_id: pendingInvite.employee_id,
    success: true,
    metadata: JSON.stringify({
      invite_id: pendingInvite.id,
      role_label: pendingInvite.role_label,
      accepted_at: new Date().toISOString(),
    }),
  });

  // Re-fetch the profile from DB to get the canonical record with id
  const verifiedProfiles = await base44.entities.AdminProfile.filter({ user_id: currentUser.id });
  const verifiedProfile = verifiedProfiles[0] || null;

  // TEMPORARY DEBUG LOG
  console.log("ADMIN INVITE SYNC - accepted invite, verified profile:", {
    meId: currentUser.id,
    meEmail: email,
    verifiedProfileUserId: verifiedProfile?.user_id,
    verifiedProfileIsActive: verifiedProfile?.is_active,
    verifiedProfileRole: verifiedProfile?.role_label,
  });

  return { accepted: true, adminProfile: verifiedProfile };
}