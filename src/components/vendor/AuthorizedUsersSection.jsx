import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";
import { toast } from "sonner";

export default function AuthorizedUsersSection({ vendorAccount }) {
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["vendorAuthorizedUsers", vendorAccount?.id],
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: vendorAccount.id }, "-created_date"),
    enabled: !!vendorAccount?.id,
  });

  const addUserMutation = useMutation({
    mutationFn: () => base44.entities.VendorAuthorizedUser.create({ vendor_account_id: vendorAccount.id, authorized_email: email, status: "active" }),
    onSuccess: () => {
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["vendorAuthorizedUsers"] });
      toast.success("Authorized user added");
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 flex gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="User email" className="rounded-xl" />
        <Button onClick={() => addUserMutation.mutate()} disabled={!email.trim() || addUserMutation.isPending} className="rounded-xl">Add</Button>
      </div>
      <div className="space-y-2">
        {users.filter((user) => user.status !== "removed").map((user) => (
          <div key={user.id} className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{user.authorized_email}</p>
              <p className="text-[10px] font-mono text-muted-foreground break-all">User ID: {user.id}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No authorized users yet.</p>}
      </div>
    </div>
  );
}