import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Trash2, Check, MapPin, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user?.email,
    initialData: [],
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.location_id) {
      navigate(createPageUrl("Map"));
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_listing":
        return { icon: MapPin, color: "text-blue-600", bg: "bg-blue-100" };
      case "listing_expiring":
        return { icon: Calendar, color: "text-orange-600", bg: "bg-orange-100" };
      case "own_listing_expiring":
        return { icon: Calendar, color: "text-red-600", bg: "bg-red-100" };
      default:
        return { icon: Bell, color: "text-gray-600", bg: "bg-gray-100" };
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Notifications</CardTitle>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-600">{unreadCount} unread</p>
                  )}
                </div>
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={unreadCount === 0 || markAllReadMutation.isPending}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  Mark All Read
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No notifications yet</h3>
                <p className="text-gray-500 mb-4">
                  Save neighborhoods or track listings to get notified about updates
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("Map"))}
                  className="bg-gradient-to-r from-orange-500 to-purple-600"
                >
                  Explore Map
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const iconConfig = getNotificationIcon(notification.type);
                  const Icon = iconConfig.icon;

                  return (
                    <Card
                      key={notification.id}
                      className={`border-2 transition-all cursor-pointer hover:shadow-md ${
                        notification.read ? "bg-white border-gray-200" : "bg-blue-50 border-blue-300"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 ${iconConfig.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${iconConfig.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                              {!notification.read && (
                                <Badge className="bg-blue-600 text-white">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                {format(new Date(notification.created_date), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(notification.id);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}