import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CheckCheck, Trash2, ExternalLink, Users, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationList({ notifications, onMarkAllRead }) {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.update(notificationId, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleJoinRequestAction = async (e, notification, action) => {
    e.stopPropagation();
    try {
      const eventTitle = notification.metadata?.event_title || 'Neighborhood Event';
      const message = action === 'accept' 
        ? `Approved — you joined ${eventTitle}.` 
        : `Denied — not added to ${eventTitle}.`;

      await base44.entities.Notification.create({
        user_email: notification.metadata?.requester_email,
        title: action === 'accept' ? 'Join Request Approved' : 'Join Request Denied',
        message: message,
        type: 'join_request_result',
        read: false
      });

      await base44.entities.Notification.update(notification.id, {
        status: action === 'accept' ? 'accepted' : 'denied',
        message: `You ${action === 'accept' ? 'accepted' : 'denied'} the join request.`
      });

      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      console.error("Error processing join request:", error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "new_listing":
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case "expiring_tracked":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "own_expiring":
        return <Clock className="w-4 h-4 text-red-600" />;
      case "join_request":
        return <Users className="w-4 h-4 text-purple-600" />;
      case "join_request_result":
        return <CheckCheck className="w-4 h-4 text-green-600" />;
      case "join_request_sent":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "join_request_expired":
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.location_id) {
      window.location.href = `/?location=${notification.metadata?.latitude},${notification.metadata?.longitude}`;
    }
  };

  return (
    <div className="flex flex-col max-h-[500px]">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-lg">Notifications</h3>
        {notifications.some(n => !n.read) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="text-xs gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? "bg-blue-50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}