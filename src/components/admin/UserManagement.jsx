import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading } = useQuery({
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

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statusColors = {
    active: "bg-green-600",
    warned: "bg-yellow-600",
    suspended: "bg-red-600",
    banned: "bg-black"
  };

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
                  <h3 className="font-semibold mb-2">{user.full_name || "No name"}</h3>
                  <p className="text-sm text-slate-600 mb-2 break-all">{user.email}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={statusColors[user.accountStatus || "active"]}>
                      {(user.accountStatus || "active").toUpperCase()}
                    </Badge>
                    {user.isAdmin && <Badge variant="outline">ADMIN</Badge>}
                  </div>
                </div>
                
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}