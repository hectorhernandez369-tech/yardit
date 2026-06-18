import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Shield } from "lucide-react";
import ResourceList from "@/components/admin/resources/ResourceList";

export default function AdminResources() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      const currentUser = await base44.auth.me();
      const role = String(currentUser?.role || "").toLowerCase();
      const [profileByUserId, profileByEmail] = await Promise.all([
        base44.entities.AdminProfile.filter({ user_id: currentUser.id }),
        base44.entities.AdminProfile.filter({ email: currentUser.email?.toLowerCase() }),
      ]);
      const adminProfile = profileByUserId[0] || profileByEmail[0];
      const activeAdmin = adminProfile?.is_active === true;
      const allowed = activeAdmin || ["admin", "developer"].includes(role);
      setHasAccess(allowed);
      setUser(activeAdmin ? { ...currentUser, role: adminProfile.role_label, isAdmin: true } : currentUser);
      setLoading(false);
    };

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading Resources…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#2C4F4E] mb-2">No Resource Access</h2>
        <p className="text-gray-600 text-sm">Resources are currently available to Admin and Developer users.</p>
      </div>
    );
  }

  return <ResourceList user={user} />;
}