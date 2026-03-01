import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CheckCheck, Trash2, Users, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ notificationId, action, requesterEmail, eventTitle, notification }) => {
      const reqUserId = notification?.metadata?.requester_user_id || requesterEmail;
      const reqListingId = notification?.metadata?.requester_listing_id;

      if (action === 'accept') {
        if (reqListingId) {
          await base44.entities.Listing.update(reqListingId, {
            neighborhood_join_status: "approved",
            payment_intent_status: "voided",
            activation_status: "active"
          });
          const reqs = await base44.entities.JoinRequest.filter({ listingId: reqListingId });
          if (reqs && reqs.length > 0) {
            await base44.entities.JoinRequest.update(reqs[0].id, { status: "approved" });
          }
        }
        
        await base44.entities.Notification.create({
          userId: reqUserId,
          title: "Neighborhood Sale Request",
          message: `Approved — you joined ${eventTitle}.`,
          type: "join_response_accept",
          read: false
        });
      } else {
        if (reqListingId) {
          await base44.entities.Listing.update(reqListingId, {
            neighborhood_join_status: "denied"
          });
          const reqs = await base44.entities.JoinRequest.filter({ listingId: reqListingId });
          if (reqs && reqs.length > 0) {
            await base44.entities.JoinRequest.update(reqs[0].id, { status: "denied" });
          }
        }

        await base44.entities.Notification.create({
          userId: reqUserId,
          title: "Neighborhood Sale Request",
          message: "Request denied. Complete payment to activate listing.",
          type: "join_response_deny",
          read: false
        });
      }

      await base44.entities.Notification.update(notificationId, { 
        read: true,
        type: `join_request_resolved`,
        message: `You ${action === 'accept' ? 'approved' : 'denied'} the join request for ${eventTitle}.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Response sent");
    },
  });

  const getIcon = (type) => {
    if (type?.startsWith('join_')) {
      return <Users className="w-4 h-4 text-purple-600" />;
    }
    switch (type) {
      case "new_listing":
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case "expiring_tracked":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "own_expiring":
        return <Clock className="w-4 h-4 text-red-600" />;
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
                    
                    {notification.type === "join_request" && (
                      <div className="flex gap-2 mt-2 mb-3">
                        <Button 
                          size="sm" 
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            respondToRequestMutation.mutate({
                              notificationId: notification.id,
                              action: 'accept',
                              requesterEmail: notification.metadata?.requester_email || notification.metadata?.userId || notification.user_email,
                              eventTitle: notification.metadata?.event_title || 'the neighborhood sale'
                            });
                          }}
                        >
                          <Check className="w-3 h-3 mr-1" /> Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            respondToRequestMutation.mutate({
                              notificationId: notification.id,
                              action: 'deny',
                              requesterEmail: notification.metadata?.requester_email || notification.metadata?.userId || notification.user_email,
                              eventTitle: notification.metadata?.event_title || 'the neighborhood sale'
                            });
                          }}
                        >
                          <X className="w-3 h-3 mr-1" /> Deny
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1">
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