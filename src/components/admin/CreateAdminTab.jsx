import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Yardit Admin Creation (LOCKED SPEC v1.3)
 * - Employee/User ID + Temp Password (admin login uses ID + password)
 * - Full Name, DOB, Contact info
 * - Role dropdown: Basic / Supervisor (Master creation restricted)
 * - Capability checklist auto-checks defaults by role, but Master can override
 * - mustResetPassword true on creation (force reset first login)
 *
 * NOTE: Base44 told you there's only a User entity with a role field.
 * So this writes admin fields onto the User record. If your User schema differs,
 * adjust the create payload keys in handleCreateAdmin().
 */

const CAPABILITIES = [
  { key: "cases.view", label: "View Cases" },
  { key: "cases.assign_self", label: "Assign to Self" },
  { key: "cases.assign_others", label: "Assign to Others (Supervisor+)" },
  { key: "cases.select_disposition", label: "Select Disposition" },
  { key: "cases.submit_disposition", label: "Submit Disposition" },
  { key: "cases.approve_to_master_pending", label: "Approve Disposition (Supervisor → Master Pending)" },
  { key: "cases.final_close", label: "Final Approve / Close Cases (Master)" },
  { key: "refunds.recommend", label: "Enter Refund Recommendation (Supervisor+)" },
  { key: "refunds.finalize", label: "Finalize Refund (Master)" },
  { key: "promos.recommend", label: "Enter Promo Recommendation (Supervisor+)" },
  { key: "promos.finalize", label: "Finalize Promo (Master)" },
  { key: "logs.view", label: "View Logs" },
  { key: "admins.manage", label: "Manage Admins (Master)" },
  { key: "locks.override", label: "Override Locks" },
];

// Role defaults (LOCKED)
const DEFAULT_CAPS_BY_ROLE = {
  basic: new Set([
    "cases.view",
    "cases.select_disposition",
    "cases.submit_disposition",
    // add notes is typically covered by case update permission in your code
    // if you have an explicit permission, add it here.
  ]),
  supervisor: new Set([
    "cases.view",
    "cases.select_disposition",
    "cases.submit_disposition",
    "cases.assign_self",
    "cases.assign_others",
    "cases.approve_to_master_pending",
    "refunds.recommend",
    "promos.recommend",
    // locks.override is policy-based; leave off by default unless you want it
  ]),
  // master creation restricted in UI per spec; still keep defaults here for reference
  master: new Set(CAPABILITIES.map((c) => c.key)),
};

function formatRoleLabel(role) {
  if (role === "basic") return "Admin Basic";
  if (role === "supervisor") return "Admin Supervisor";
  if (role === "master") return "Admin Master";
  return role;
}

export default function CreateAdminTab() {
  const [employeeId, setEmployeeId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState(""); // (plain English: date of birth)
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // Spec: dropdown should be Lite/Basic or Supervisor. Master creation restricted.
  const [role, setRole] = useState("basic");

  // store capabilities as { [capKey]: boolean }
  const [caps, setCaps] = useState(() => {
    const set = DEFAULT_CAPS_BY_ROLE.basic;
    const obj = {};
    CAPABILITIES.forEach((c) => (obj[c.key] = set.has(c.key)));
    return obj;
  });

  const [saving, setSaving] = useState(false);

  const selectedCapsCount = useMemo(
    () => Object.values(caps).filter(Boolean).length,
    [caps]
  );

  const applyRoleDefaults = (nextRole) => {
    const defaults = DEFAULT_CAPS_BY_ROLE[nextRole] ?? new Set();
    const obj = {};
    CAPABILITIES.forEach((c) => (obj[c.key] = defaults.has(c.key)));
    setCaps(obj);
  };

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    applyRoleDefaults(nextRole);
  };

  const toggleCap = (capKey) => {
    setCaps((prev) => ({ ...prev, [capKey]: !prev[capKey] }));
  };

  const validate = () => {
    if (!employeeId.trim()) return "Employee/User ID is required";
    if (!tempPassword.trim()) return "Temporary password is required";
    if (!fullName.trim()) return "Full name is required";
    if (!dob.trim()) return "Date of birth is required";
    if (!phone.trim()) return "Phone is required";
    if (!email.trim()) return "Email is required";
    // address optional
    return null;
  };

  const handleCreateAdmin = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setSaving(true);

      // Build enabled capability keys list
      const enabledCapabilities = Object.entries(caps)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

      /**
       * IMPORTANT:
       * We don't know your exact Base44 "User" create method.
       * Common patterns:
       * - base44.entities.User.create(...)
       * - base44.users.create(...)
       * - base44.User.create(...)
       *
       * (plain English) If this line errors, replace it with the correct create call for your project.
       */
      await base44.users.createUser({
        // login credentials
        employeeId: employeeId.trim(),          // (plain English: User ID they log in with)
        tempPassword: tempPassword.trim(),      // (plain English: temporary password)
        mustResetPassword: true,                // (plain English: force password reset on first login)

        // identity/contact
        fullName: fullName.trim(),
        dob: dob.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim() || null,

        // role (basic/supervisor/master)
        role: role,                             // (plain English: admin rank)

        // capabilities (override-able)
        adminCapabilities: enabledCapabilities, // (plain English: permission checklist)
        isAdmin: true,                          // (plain English: marks user as admin if needed)
        isActive: true,
      });

      toast.success(`Created ${formatRoleLabel(role)}: ${employeeId.trim()}`);

      // reset form
      setEmployeeId("");
      setTempPassword("");
      setFullName("");
      setDob("");
      setPhone("");
      setEmail("");
      setAddress("");
      setRole("basic");
      applyRoleDefaults("basic");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create admin. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create Admin
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Employee/User ID</label>
              <Input
                placeholder="12345"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Temporary Password</label>
              <Input
                placeholder="Padawan1234"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Full Name</label>
              <Input
                placeholder="First Last"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Date of Birth</label>
              <Input
                placeholder="MM/DD/YYYY"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                placeholder="(555) 555-5555"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Address (optional)</label>
              <Input
                placeholder="123 Main St, City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Role + capability matrix */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Admin Role</label>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Admin Basic</SelectItem>
                  <SelectItem value="supervisor">Admin Supervisor</SelectItem>
                  {/* Spec: Master creation restricted */}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecting a role auto-checks default permissions. You can still override any checkbox.
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Capabilities</div>
                <div className="text-xs text-muted-foreground">
                  Selected: {selectedCapsCount}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CAPABILITIES.map((c) => (
                  <label key={c.key} className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={!!caps[c.key]}
                      onCheckedChange={() => toggleCap(c.key)}
                    />
                    <span className="text-sm leading-5">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleCreateAdmin} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Admin
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Note: Admin is created with a temporary password and will be forced to reset it on first login.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
