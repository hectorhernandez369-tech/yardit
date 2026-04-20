import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import UserDetailDrawer from "./userDetail/UserDetailDrawer";
import DeleteUserDialog from "./DeleteUserDialog";
import { getUserDisplayName } from "@/lib/userIdentity";

export default function UserManagement() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setAdminUser).catch(() => {});
  }, []);

  const { data: users } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date"),
    initialData: [],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, accountStatus }) => 
      base44.entities.User.update(id, { accountStatus }),
    onSuccess: () => {
      toast.success("User status updated");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });

  const normalizedQuery = searchQuery.toLowerCase();
  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
    return u.email.toLowerCase().includes(normalizedQuery) || fullName.includes(normalizedQuery);
  });

  const statusColors = {
    active: "bg-green-600",
    warned: "bg-yellow-600",
    suspended: "bg-red-600",
    banned: "bg-black"
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const openUserId = urlParams.get("openUserId");
    if (openUserId && users.length > 0) {
      const matchedUser = users.find((u) => u.id === openUserId);
      if (matchedUser) {
        setSelectedUser(matchedUser);
      }
    }
  }, [location.search, users]);

  return (
    <div className="mt-6">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredUsers.slice(0, 20).map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-2">{getUserDisplayName(user)}</h3>
                  <p className="text-sm text-slate-600 mb-2 break-all">{user.email}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={statusColors[user.accountStatus || "active"]}>
                      {(user.accountStatus || "active").toUpperCase()}
                    </Badge>
                    {user.isAdmin && <Badge variant="outline">ADMIN</Badge>}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 items-end">
                  <Select
                    value={user.accountStatus || "active"}
                    onValueChange={(value) => 
                      updateStatusMutation.mutate({ id: user.id, accountStatus: value })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="warned">Warned</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={() => setSelectedUser(user)}
                  >
                    <Eye className="w-3 h-3" /> View More Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setDeletingUser(user)}
                  >
                    <Trash2 className="w-3 h-3" /> Delete User
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <UserDetailDrawer
        user={selectedUser}
        adminUser={adminUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={(updatedUser) => {
          setSelectedUser(updatedUser);
          queryClient.invalidateQueries({ queryKey: ["allUsers"] });
        }}
      />

      <DeleteUserDialog
        open={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        user={deletingUser}
        adminUser={adminUser}
        onDeleted={() => {
          setDeletingUser(null);
          queryClient.invalidateQueries({ queryKey: ["allUsers"] });
        }}
      />
    </div>
  );
}