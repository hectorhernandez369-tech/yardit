import React from "react";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  active: "bg-green-600",
  warned: "bg-yellow-600",
  suspended: "bg-red-600",
  banned: "bg-black",
};

export default function UserAccountInfo({ user }) {
  const status = user.accountStatus || "active";
  const nameParts = (user.full_name || "").split(" ");
  const firstName = nameParts[0] || "—";
  const lastName = nameParts.slice(1).join(" ") || "—";

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Account Holder Info</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-gray-500">First Name</span>
          <p className="font-medium">{firstName}</p>
        </div>
        <div>
          <span className="text-gray-500">Last Name</span>
          <p className="font-medium">{lastName}</p>
        </div>
        <div>
          <span className="text-gray-500">Email</span>
          <p className="font-medium break-all">{user.email || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Phone</span>
          <p className="font-medium">{user.phone || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Address</span>
          <p className="font-medium">{user.address || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">User ID</span>
          <p className="font-medium font-mono text-xs">{user.id}</p>
        </div>
        <div>
          <span className="text-gray-500">Account Status</span>
          <div className="mt-0.5">
            <Badge className={statusColors[status]}>{status.toUpperCase()}</Badge>
          </div>
        </div>
        <div>
          <span className="text-gray-500">Role</span>
          <p className="font-medium capitalize">{user.role || "user"}</p>
        </div>
      </div>
    </div>
  );
}