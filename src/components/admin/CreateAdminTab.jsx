import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

export default function CreateAdminTab() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setInviting(true);
    await base44.users.inviteUser(email.trim(), role);
    toast.success(`Invited ${email.trim()} as ${role}`);
    setEmail("");
    setRole("admin");
    setInviting(false);
  };

  return (
    <div className="mt-6 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Admin User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={inviting} className="w-full">
            {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Send Invite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}