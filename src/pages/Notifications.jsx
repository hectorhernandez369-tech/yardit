import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Trash2, Check, MapPin, Calendar, Loader2, Users, AlertTriangle, LifeBuoy, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { respondToCoHostInvite } from "@/lib/coHostInviteActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultTab = new URLSearchParams(location.search).get("tab") === "history" ? "history" : "recent";

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
  });

  const markReadMutation = useMutation({
    mutationFn: (notification) => {
      if (notification._isCaseNotif) return base44.entities.CaseNotification.update(notification.id, { is_read: true });
      return base44.entities.Notification.update(notification.id, { read: true, is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read && !n.is_read);
      await Promise.all(unread.map(n => n._isCaseNotif ? base44.entities.CaseNotification.update(n.id, { is_read: true }) : base44.entities.Notification.update(n.id, { read: true, is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notification) => {
      if (notification._isCaseNotif) return base44.entities.CaseNotification.delete(notification.id);
      return base44.entities.Notification.delete(notification.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
  });

  const coHostInviteMutation = useMutation({
    mutationFn: ({ notification, action }) => respondToCoHostInvite(notification, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(variables.action === "accept" ? "Co-host request accepted" : "Co-host request declined");
    },
    onError: (error) => {
      toast.error(error.message || "Could not respond to co-host request.");
    },
  });

  const getNotificationUrl = (notification) => {
    if (notification._isCaseNotif) {
      return createPageUrl("CaseManagement") + `?openCaseId=${notification.case_id}`;
    }

    let url = null;
    const entityId = notification.related_entity_id || notification.metadata?.listing_id || notification.metadata?.sale_listing_id || notification.location_id;

    if (notification.type?.startsWith("report_")) {
      url = createPageUrl("AdminLite") + "?tab=cases";
    } else if (notification.type?.startsWith("support_ticket_")) {
      url = createPageUrl("MySupportTickets");
    } else if (notification.type?.startsWith("join_") || notification.type === "removed_from_neighborhood") {
      if (notification.metadata?.requester_listing_id) {
        url = createPageUrl("ListingDetail") + "?id=" + notification.metadata.requester_listing_id;
      } else if (entityId) {
        url = createPageUrl("ListingDetail") + "?id=" + entityId;
      } else {
        url = createPageUrl("MyListings");
      }
    } else if (notification.type?.startsWith("listing_")) {
      if (notification.type === "listing_removed") {
        url = createPageUrl("MyListings");
      } else if (entityId) {
        url = createPageUrl("ListingDetail") + "?id=" + entityId;
      } else {
        url = createPageUrl("MyListings");
      }
    }

    if (!url && notification.location_id) {
       url = `/?location=${notification.metadata?.latitude || ''},${notification.metadata?.longitude || ''}`;
    }

    return url;
  };

  const getNotificationIcon = (type) => {
    if (type?.startsWith("join_")) return { icon: Users, color: "text-purple-600", bg: "bg-purple-100" };
    if (type?.startsWith("report_")) return { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" };
    if (type?.startsWith("support_")) return { icon: LifeBuoy, color: "text-blue-600", bg: "bg-blue-100" };
    if (type?.startsWith("listing_")) return { icon: MapPin, color: "text-orange-600", bg: "bg-orange-100" };
    switch (type) {
      case "new_listing":
        return { icon: MapPin, color: "text-blue-600", bg: "bg-blue-100" };
      case "expiring_tracked":
        return { icon: Calendar, color: "text-orange-600", bg: "bg-orange-100" };
      case "own_expiring":
        return { icon: Calendar, color: "text-red-600", bg: "bg-red-100" };
      default:
        return { icon: Bell, color: "text-gray-600", bg: "bg-gray-100" };
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read && !n.is_read);
  const historyNotifications = notifications.filter(n => n.read || n.is_read);
  const unreadCount = unreadNotifications.length;

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

  const renderNotificationCard = (notification) => {
    const isUnread = !notification.read && !notification.is_read;
    const iconConfig = getNotificationIcon(notification.type);
    const Icon = iconConfig.icon;
    const url = getNotificationUrl(notification);

    return (
      <Card
        key={notification.id}
        className={`border-2 transition-all hover:shadow-md ${
          isUnread ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
        }`}
      >
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-4 items-start">
            <div className={`w-10 h-10 ${iconConfig.bg} rounded-full flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0`}>
              <Icon className={`w-5 h-5 ${iconConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                {isUnread && (
                  <Badge className="bg-blue-600 text-white">New</Badge>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-1">{notification.message}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(notification.created_date), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 mt-2 sm:mt-0">
           <div className="flex gap-2 items-center flex-wrap justify-end">
              {notification.type === "co_host_invite" && (
                <>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-green-600 hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      coHostInviteMutation.mutate({ notification, action: "accept" });
                    }}
                  >
                    <Check className="w-3 h-3 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      coHostInviteMutation.mutate({ notification, action: "decline" });
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Decline
                  </Button>
                </>
              )}
              {isUnread && notification.type !== "co_host_invite" && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(notification);
                    }}
                    className="h-8 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" /> Mark Read
                  </Button>
                )}
                {url && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-[#5DADA5] hover:bg-[#4A9B93] text-white"
                    onClick={(e) => {
                       e.stopPropagation();
                       if (isUnread) markReadMutation.mutate(notification);
                       navigate(url);
                    }}
                  >
                    View Details <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
             </div>
             <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(notification);
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 sm:self-end"
                title="Delete Notification"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#5DADA5] rounded-full flex items-center justify-center shadow-sm">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2C4F4E]">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-600">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="gap-2 border-[#5DADA5] text-[#2C4F4E] hover:bg-[#E7D7B8]"
            >
              <Check className="w-4 h-4" />
              Mark All Read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg bg-white animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-12">
            <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No notifications yet</h3>
            <p className="text-slate-500 mb-6">
              You're all caught up!
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Home"))}
              className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] font-semibold"
            >
              Explore Map
            </Button>
          </Card>
        ) : (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
              <TabsTrigger value="recent" className="data-[state=active]:bg-[#5DADA5] data-[state=active]:text-white">
                Recent ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-[#5DADA5] data-[state=active]:text-white">
                History ({historyNotifications.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="space-y-4">
              {unreadNotifications.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg border border-dashed border-slate-300">
                  <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-slate-600">No unread notifications</p>
                </div>
              ) : (
                unreadNotifications.map(renderNotificationCard)
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              {historyNotifications.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg border border-dashed border-slate-300">
                  <p className="text-slate-600">Your notification history is empty.</p>
                </div>
              ) : (
                historyNotifications.map(renderNotificationCard)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}