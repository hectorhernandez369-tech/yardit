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
import { isBellNotification } from "@/lib/notificationRegistry";
import { parseUtcTimestamp } from "@/lib/dateTime";

export default function NotificationBell() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
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
       
       const all = [...byEmail, ...byId, ...byUserId];
       const unique = [];
       const seen = new Set();
       for (const n of all) {
           if (!seen.has(n.id)) {
               seen.add(n.id);
               unique.push(n);
           }
       }
       return unique.filter(isBellNotification).sort((a, b) => (parseUtcTimestamp(b.created_date)?.getTime() || 0) - (parseUtcTimestamp(a.created_date)?.getTime() || 0));
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-12 w-12 rounded-2xl text-[#2C4F4E] hover:bg-[#5DADA5]/10 touch-manipulation transition-all duration-200 sm:text-white sm:hover:bg-white/20">
          <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 text-[10px] flex items-center justify-center p-0 bg-red-500 border-2 border-white animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] max-w-[22rem] sm:w-80 md:w-96 p-0 z-[99999] translate-x-10 sm:translate-x-0" align="end" sideOffset={8}>
        <NotificationList 
          notifications={notifications}
          onMarkAllRead={() => markAllReadMutation.mutate()}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}