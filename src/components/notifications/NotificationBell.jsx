import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import NotificationList from "./NotificationList";

export default function NotificationBell() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
       const byId = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date");
       const byUserId = await base44.entities.Notification.filter({ userId: user.id }, "-created_date");
       const byEmail = await base44.entities.Notification.filter({ user_email: user.email }, "-created_date");
       
       let adminNotifs = [];
       if (user?.isAdmin) {
         adminNotifs = await base44.entities.CaseNotification.filter({ admin_id: user.id }, "-created_date");
         adminNotifs = adminNotifs.map(n => ({ ...n, _isCaseNotif: true, title: "Case Management", type: "report_case" }));
       }

       const all = [...byEmail, ...byId, ...byUserId, ...adminNotifs];
       const unique = [];
       const seen = new Set();
       for (const n of all) {
           if (!seen.has(n.id)) {
               seen.add(n.id);
               unique.push(n);
           }
       }
       return unique.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
    initialData: [],
    refetchInterval: 30000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.read && !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => 
          n._isCaseNotif 
            ? base44.entities.CaseNotification.update(n.id, { is_read: true })
            : base44.entities.Notification.update(n.id, { read: true, is_read: true })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read && !n.is_read).length;

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10 h-8 w-8">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 text-[10px] flex items-center justify-center p-0 bg-red-500 border border-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0 z-[99999]" align="end">
        <NotificationList 
          notifications={notifications}
          onMarkAllRead={() => markAllReadMutation.mutate()}
        />
      </PopoverContent>
    </Popover>
  );
}