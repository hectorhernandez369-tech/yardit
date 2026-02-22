import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield } from "lucide-react";

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

const EMPLOYEE_ID_RULES = {
  basic: { regex: /^Padawan[a-zA-Z0-9]{5}$/, example: "PadawanA1B2C" },
  supervisor: { regex: /^(Jedi|Sith)[a-zA-Z0-9]{5}$/, example: "Jedi123AB or Sith9X8Y7" },
  master: { regex: /^(Master|Darth)[a-zA-Z0-9]{5}$/, example: "MasterABCDE or Darth12345" },
};

const ROLE_TO_INVITE_ROLE = {
  basic: "admin",
  supervisor: "supervisor",
  master: "master",
};

export default function CreateAdminTab() {
  const [employeeId, setEmployeeId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [role, setRole] = useState("basic");
  const [supervisorId, setSupervisorId] = useState("");
  const [supervisors, setSupervisors] = useState([]);
  const [saving, setSaving] = useState(false);

  const [caps, setCaps] = useState(() => {
    const defaults = DEFAULT_CAPS_BY_ROLE.basic;
    const obj = {};
    CAPABILITIES.forEach((c) => (obj[c.key] = defaults.has(c.key)));
    return obj;
  });

  const selectedCapsCount = useMemo(
    () => Object.values(caps).filter(Boolean).length,
    [caps]
  );

  // Load active supervisors for the dropdown
  useEffect(() => {
    const loadSupervisors = async () => {
      const profiles = await base44.entities.AdminProfile.filter({ role_label: "supervisor", is_active: true });
      setSupervisors(profiles);
    };
    loadSupervisors();
  }, []);

  const applyRoleDefaults = (nextRole) => {
    const defaults = DEFAULT_CAPS_BY_ROLE[nextRole] ?? new Set();
    const obj = {};
    CAPABILITIES.forEach((c) => (obj[c.key] = defaults.has(c.key)));
    setCaps(obj);
  };

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    applyRoleDefaults(nextRole);
    if (nextRole !== "basic") setSupervisorId("");
  };

  const toggleCap = (capKey) => {
    setCaps((prev) => ({ ...prev, [capKey]: !prev[capKey] }));
  };

  const validate = () => {
    if (!employeeId.trim()) return "Employee/User ID is required";
    if (!inviteEmail.trim()) return "Email is required (Base44 sends the invite here)";
    if (!fullName.trim()) return "Full name is required";
    if (!dob.trim()) return "Date of birth is required";
    if (!phone.trim()) return "Phone is required";

    const rule = EMPLOYEE_ID_RULES[role];
    if (rule && !rule.regex.test(employeeId.trim())) {
      return `Employee ID format invalid for selected role. Example: ${rule.example}`;
    }
    if (role === "basic" && !supervisorId) {
      return "Basic admins must be assigned a supervisor";
    }
    return null;
  };

  const handleInvite = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setSaving(true);

      const enabledCapabilities = Object.entries(caps)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

      // 1) Invite user via Base44 (email sets password)
      await base44.users.inviteUser(inviteEmail.trim(), ROLE_TO_INVITE_ROLE[role]);

      // 2) Save metadata (so we can attach it on first login)
      const selectedSupervisor = role === "basic" ? supervisors.find(s => s.user_id === supervisorId) : null;
      await base44.entities.AdminInviteProfile.create({
        email: inviteEmail.trim().toLowerCase(),
        employee_id: employeeId.trim(),
        role_label: role,
        full_name: fullName.trim(),
        dob: dob.trim(),
        phone: phone.trim(),
        address: address.trim() || null,
        capabilities: enabledCapabilities,
        is_active: true,
        status: "pending",
        invited_at: new Date().toISOString(),
        ...(selectedSupervisor ? {
          supervisor_user_id: selectedSupervisor.user_id,
          supervisor_employee_id: selectedSupervisor.employee_id,
        } : {}),
      });

      toast.success(`Invite sent to ${inviteEmail.trim()}`);

      // reset
      setEmployeeId("");
      setInviteEmail("");
      setFullName("");
      setDob("");
      setPhone("");
      setAddress("");
      setRole("basic");
      setSupervisorId("");
      applyRoleDefaults("basic");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send invite. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Create Admin
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Top row: Employee/User ID + Email Invite (replaces temp password) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Employee/User ID</label>
              <Input
                placeholder={EMPLOYEE_ID_RULES[role]?.example || "PadawanA1B2C"}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format for {role === "basic" ? "Admin Basic" : role === "supervisor" ? "Admin Supervisor" : "Admin Master"}:{" "}
                {EMPLOYEE_ID_RULES[role]?.example}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Email Invite</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Base44 will email an invite link here so the admin can set their password.
              </p>
            </div>
          </div>

          {/* Name/DOB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Full Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First Last" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date of Birth</label>
              <Input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="MM/DD/YYYY" />
            </div>
          </div>

          {/* Phone/Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address (optional)</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" />
            </div>
          </div>

          {/* Role */}
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

          {/* Supervisor Assignment (basic only) */}
          {role === "basic" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Assign Supervisor <span className="text-red-500">*</span></label>
              <Select value={supervisorId} onValueChange={setSupervisorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supervisor..." />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.length === 0 ? (
                    <SelectItem value="__none" disabled>No active supervisors found</SelectItem>
                  ) : (
                    supervisors.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {s.full_name} ({s.employee_id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Basic admins must be assigned to a supervisor.
              </p>
            </div>
          )}

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

          <Button onClick={handleInvite} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Sending Invite...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Send Email Invite
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}