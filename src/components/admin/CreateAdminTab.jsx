import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield } from "lucide-react";

/**
 * Create Admin (LOCKED SPEC v1.3 + updates)
 * - Uses User entity (Base44)
 * - Employee ID format enforced by role:
 *   basic: Padawan + 5 alnum
 *   supervisor: Jedi|Sith + 5 alnum
 *   master: Master|Darth + 5 alnum
 * - Master creation allowed BUT requires current Master to re-enter password
 * - Capabilities auto-check based on role defaults; Master can override checkboxes
 * - New admin must reset password on first login
 *
 * IMPORTANT:
 * Base44 project APIs differ. You may need to adjust:
 *  - current user fetch
 *  - password verification call
 *  - create user call
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

const DEFAULT_CAPS_BY_ROLE = {
  basic: new Set(["cases.view", "cases.select_disposition", "cases.submit_disposition"]),
  supervisor: new Set([
    "cases.view",
    "cases.select_disposition",
    "cases.submit_disposition",
    "cases.assign_self",
    "cases.assign_others",
    "cases.approve_to_master_pending",
    "refunds.recommend",
    "promos.recommend",
  ]),
  master: new Set(CAPABILITIES.map((c) => c.key)),
};

const ROLE_LABEL = {
  basic: "Admin Basic",
  supervisor: "Admin Supervisor",
  master: "Admin Master",
};

// Employee ID regex by role (LOCKED)
const EMPLOYEE_ID_RULES = {
  basic: {
    regex: /^Padawan[a-zA-Z0-9]{5}$/,
    example: "PadawanA1B2C",
  },
  supervisor: {
    regex: /^(Jedi|Sith)[a-zA-Z0-9]{5}$/,
    example: "Jedi123AB or Sith9X8Y7",
  },
  master: {
    regex: /^(Master|Darth)[a-zA-Z0-9]{5}$/,
    example: "MasterABCDE or Darth12345",
  },
};

export default function CreateAdminTab() {
  const [employeeId, setEmployeeId] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [role, setRole] = useState("basic");

  // Only required when creating a Master
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");

  const [caps, setCaps] = useState(() => {
    const defaults = DEFAULT_CAPS_BY_ROLE.basic;
    const obj = {};
    CAPABILITIES.forEach((c) => (obj[c.key] = defaults.has(c.key)));
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
    setConfirmMasterPassword(""); // reset confirm field when role changes
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

    const rule = EMPLOYEE_ID_RULES[role];
    if (rule && !rule.regex.test(employeeId.trim())) {
      return `Employee ID format invalid for ${ROLE_LABEL[role]}. Example: ${rule.example}`;
    }

    if (role === "master" && !confirmMasterPassword.trim()) {
      return "Confirm Your Password is required to create an Admin Master";
    }

    return null;
  };

  /**
   * VERIFY CURRENT MASTER PASSWORD
   * (plain English: when creating a Master, re-check the current logged-in Master password)
   *
   * Replace this function with the correct Base44 auth verification method.
   */
  const verifyCurrentMasterPassword = async (password) => {
    // OPTION A (common): base44.auth.verifyPassword(password)
    // OPTION B: base44.users.verifyCurrentPassword(password)
    // OPTION C: call an edge function to verify
    //
    // For now, attempt a few likely methods; adjust to the one your app has.
    if (base44?.auth?.verifyPassword) {
      return await base44.auth.verifyPassword(password);
    }
    if (base44?.users?.verifyCurrentPassword) {
      return await base44.users.verifyCurrentPassword(password);
    }

    // If none exist, throw so you see it immediately in console.
    throw new Error(
      "No password verification method found. Add base44.users.verifyCurrentPassword() or base44.auth.verifyPassword()."
    );
  };

  /**
   * CREATE USER
   * (plain English: create a new admin user record)
   *
   * Replace base44.users.createUser(...) with your actual create method if needed.
   */
  const createAdminUser = async (payload) => {
    if (base44?.users?.createUser) return await base44.users.createUser(payload);
    if (base44?.users?.create) return await base44.users.create(payload);
    if (base44?.User?.create) return await base44.User.create(payload);

    throw new Error("No user create method found on base44 client.");
  };

  const handleCreateAdmin = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setSaving(true);

      // If creating Admin Master, verify current Master password first
      if (role === "master") {
        const ok = await verifyCurrentMasterPassword(confirmMasterPassword.trim());
        if (!ok) {
          toast.error("Password incorrect. Cannot create Admin Master.");
          setSaving(false);
          return;
        }
      }

      const enabledCapabilities = Object.entries(caps)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

      await createAdminUser({
        employee_id: employeeId.trim(), // (plain English: login ID)
        password: tempPassword.trim(),  // (plain English: temp password - store hashed if your backend does that)
        mustResetPassword: true,
        is_active: true,

        role, // basic | supervisor | master

        full_name: fullName.trim(),
        dob: dob.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim() || null,

        admin_capabilities: enabledCapabilities, // string array
        is_admin: true,
      });

      toast.success(`Created ${ROLE_LABEL[role]}: ${employeeId.trim()}`);

      // reset form
      setEmployeeId("");
      setTempPassword("");
      setFullName("");
      setDob("");
      setPhone("");
      setEmail("");
      setAddress("");
      setConfirmMasterPassword("");
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
            <Shield className="w-5 h-5" />
            Create Admin
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Employee/User ID</label>
              <Input
                placeholder={EMPLOYEE_ID_RULES[role]?.example || "PadawanA1B2C"}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format for {ROLE_LABEL[role]}: {EMPLOYEE_ID_RULES[role]?.example}
              </p>
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

          {/* Role + Master confirm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Admin Role</label>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Admin Basic</SelectItem>
                  <SelectItem value="supervisor">Admin Supervisor</SelectItem>
                  <SelectItem value="master">Admin Master</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecting a role auto-checks default permissions. You can still override any checkbox.
              </p>
            </div>

            {role === "master" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Confirm Your Password</label>
                <Input
                  type="password"
                  placeholder="(re-enter your current Master password)"
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required to create another Admin Master.
                </p>
              </div>
            )}
          </div>

          {/* Capabilities */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Capabilities</div>
              <div className="text-xs text-muted-foreground">Selected: {selectedCapsCount}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CAPABILITIES.map((c) => (
                <label key={c.key} className="flex items-start gap-2 cursor-pointer">
                  <Checkbox checked={!!caps[c.key]} onCheckedChange={() => toggleCap(c.key)} />
                  <span className="text-sm leading-5">{c.label}</span>
                </label>
              ))}
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
            New admins are created with a temporary password and must reset it on first login.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
