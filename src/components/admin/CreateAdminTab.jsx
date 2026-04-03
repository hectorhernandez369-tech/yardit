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
  { key: "cases.final_close", label: "Final Close (Master)" },
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
  basic: { regex: /^Padawan[a-zA-Z0-9]{4}$/, example: "Padawan1A2B" },
  supervisor: { regex: /^(Jedi|Sith)[a-zA-Z0-9]{4}$/, example: "Jedi1A2B or Sith9X8Y" },
  master: { regex: /^(Master|Darth)[a-zA-Z0-9]{4}$/, example: "MasterAB12 or Darth9X8Y" },
};

const ROLE_TO_INVITE_ROLE = {
  basic: "admin",
  supervisor: "admin",
  master: "admin",
};

export default function CreateAdminTab() {
  const [employeeId, setEmployeeId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

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

  const selectedCaps = useMemo(
    () => Object.entries(caps).filter(([, v]) => v).map(([k]) => k),
    [caps]
  );

  // Load active supervisors properly
  useEffect(() => {
    const load = async () => {
      try {
        const profiles = await base44.entities.AdminProfile.list();
        setSupervisors(
          profiles.filter((p) => p.role_label === "supervisor" && p.is_active === true)
        );
      } catch (e) {
        console.error("Supervisor load failed:", e);
      }
    };
    load();
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

  const validate = () => {
    if (!employeeId.trim()) return "Employee ID required";
    if (!inviteEmail.trim()) return "Email required";
    if (!firstName.trim()) return "First name required";
    if (!lastName.trim()) return "Last name required";
    if (!dob.trim()) return "DOB required";
    if (!phone.trim()) return "Phone required";

    const rule = EMPLOYEE_ID_RULES[role];
    if (!rule.regex.test(employeeId.trim()))
      return `Invalid Employee ID format. Example: ${rule.example}`;

    if (role === "basic" && !supervisorId)
      return "Basic admins must have a supervisor assigned";

    if (!adminPin || adminPin.length < 4)
      return "Admin PIN must be at least 4 characters";
    if (adminPin !== confirmPin)
      return "PIN and Confirm PIN do not match";

    return null;
  };

  const handleInvite = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setSaving(true);

    // 🔎 GLOBAL EMPLOYEE ID CHECK
    try {
      const [invites, profiles] = await Promise.all([
        base44.entities.AdminInviteProfile.list(),
        base44.entities.AdminProfile.list(),
      ]);

      const exists =
        invites.some((r) => r.employee_id?.toLowerCase() === employeeId.trim().toLowerCase()) ||
        profiles.some((r) => r.employee_id?.toLowerCase() === employeeId.trim().toLowerCase());

      if (exists) {
        toast.error("Employee ID already exists. Delete old record before reuse.");
        setSaving(false);
        return;
      }
    } catch (e) {
      console.error("Employee ID check failed:", e);
      toast.error("Could not verify Employee ID uniqueness.");
      setSaving(false);
      return;
    }

    // ✉️ INVITE STEP — handle existing users gracefully
    let userAlreadyExisted = false;
    try {
      await base44.users.inviteUser(inviteEmail.trim(), ROLE_TO_INVITE_ROLE[role]);
    } catch (e) {
      const msg = (e?.message || e?.toString() || "").toLowerCase();
      const isExistingUser = msg.includes("already") || msg.includes("exist") || msg.includes("duplicate");

      if (isExistingUser) {
        // User exists — update their role instead
        try {
          const allUsers = await base44.entities.User.list();
          const existingUser = allUsers.find(
            (u) => u.email?.toLowerCase() === inviteEmail.trim().toLowerCase()
          );
          if (existingUser) {
            await base44.entities.User.update(existingUser.id, { role: ROLE_TO_INVITE_ROLE[role] });
          }
          userAlreadyExisted = true;
        } catch (updateErr) {
          console.error("Role update for existing user failed:", updateErr);
          toast.error("User exists but role update failed.");
          setSaving(false);
          return;
        }
      } else {
        const detail = e?.message || e?.toString() || "Unknown error";
        console.error("inviteUser failed:", e);
        toast.error(`Invite email failed: ${detail}`);
        setSaving(false);
        return;
      }
    }

    // 💾 SAVE PENDING RECORD
    try {
      const selectedSupervisor =
        role === "basic"
          ? supervisors.find((s) => s.user_id === supervisorId)
          : null;

      await base44.entities.AdminInviteProfile.create({
        email: inviteEmail.trim().toLowerCase(),
        employee_id: employeeId.trim(),
        role_label: role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        dob: dob.trim(),
        phone: phone.trim(),
        address: address.trim() || null,
        capabilities: selectedCaps,
        is_active: true,
        status: "pending",
        invited_at: new Date().toISOString(),
        supervisor_user_id: selectedSupervisor?.user_id || null,
        supervisor_employee_id: selectedSupervisor?.employee_id || null,
      });
    } catch (e) {
      console.error("AdminInviteProfile.create failed:", e);
      toast.error("Invite sent but pending record failed.");
      setSaving(false);
      return;
    }

    // 🔐 CREATE AdminAccessKey with hashed PIN
    try {
      const hashResp = await base44.functions.invoke("adminHashPin", { pin: adminPin });
      const pinHash = hashResp.data.pin_hash;

      // Try to find the user_id if the user already exists
      let targetUserId = null;
      if (userAlreadyExisted) {
        const allUsers = await base44.entities.User.list();
        const found = allUsers.find(u => u.email?.toLowerCase() === inviteEmail.trim().toLowerCase());
        if (found) targetUserId = found.id;
      }

      await base44.entities.AdminAccessKey.create({
        employee_id: employeeId.trim(),
        user_id: targetUserId || "",
        pin_hash: pinHash,
        is_active: true,
        failed_attempts: 0,
      });
    } catch (e) {
      console.error("AdminAccessKey creation failed:", e);
      toast.error("Admin created but PIN setup failed. Set PIN manually later.");
    }

    toast.success(
      userAlreadyExisted
        ? "User already exists. Admin role assigned and confirmation email sent."
        : "Invite sent successfully."
    );

    setEmployeeId("");
    setInviteEmail("");
    setFirstName("");
    setLastName("");
    setDob("");
    setPhone("");
    setAddress("");
    setAdminPin("");
    setConfirmPin("");
    setRole("basic");
    setSupervisorId("");
    applyRoleDefaults("basic");

    setSaving(false);
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
          {/* Employee ID + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input placeholder={EMPLOYEE_ID_RULES[role].example} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            <Input type="email" placeholder="admin@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          </div>

          {/* First / Last / DOB */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input placeholder="MM/DD/YYYY" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>

          {/* Phone / Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {/* Admin PIN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Admin PIN / Passcode</label>
              <Input type="password" placeholder="Min 4 characters" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm PIN</label>
              <Input type="password" placeholder="Re-enter PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
            </div>
          </div>

          {/* Role */}
          <Select value={role} onValueChange={handleRoleChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Admin Basic</SelectItem>
              <SelectItem value="supervisor">Admin Supervisor</SelectItem>
              <SelectItem value="master">Admin Master</SelectItem>
            </SelectContent>
          </Select>

          {/* Supervisor */}
          {role === "basic" && (
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger><SelectValue placeholder="Assign Supervisor" /></SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {s.first_name} {s.last_name} ({s.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button onClick={handleInvite} disabled={saving} className="w-full">
            {saving ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <UserPlus className="mr-2 w-4 h-4" />}
            Send Email Invite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}