import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Clock, CheckCheck, Trash2, Users, Check, X, Bell, AlertTriangle, LifeBuoy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { respondToCoHostInvite } from "@/lib/coHostInviteActions";

export default function NotificationList({ notifications, onMarkAllRead, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const markReadMutation = useMutation({
    mutationFn: (notification) => {
      if (notification._isCaseNotif) return base44.entities.CaseNotification.update(notification.id, { is_read: true });
      return base44.entities.Notification.update(notification.id, { read: true, is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (notification) => {
      if (notification._isCaseNotif) return base44.entities.CaseNotification.delete(notification.id);
      return base44.entities.Notification.delete(notification.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ notificationId, action, requesterEmail, eventTitle, notification }) => {
      const reqUserId = notification?.metadata?.requester_user_id || requesterEmail;
      const reqListingId = notification?.metadata?.requester_listing_id;
      const saleListingId = notification?.metadata?.sale_listing_id;

      if (action === "accept") {
      if (reqListingId) {
        await base44.entities.Listing.update(reqListingId, {
          neighborhood_join_status: "approved",
          payment_intent_status: "none",
          hold_deadline_at: null,
          activation_status: "active"
        });

          const reqs = await base44.entities.JoinRequest.filter({
            listingId: reqListingId,
            ...(saleListingId ? { saleListingId } : {})
          });

          if (reqs && reqs.length > 0) {
            await base44.entities.JoinRequest.update(reqs[0].id, { status: "approved" });
          }
        }

        await base44.entities.Notification.create({
          userId: reqUserId,
          user_id: reqUserId,
          title: "Neighborhood Sale Request",
          message: `Approved — you joined ${eventTitle}.`,
          type: "join_request_accepted",
          related_entity_type: "listing",
          related_entity_id: saleListingId,
          read: false,
          is_read: false
        });
      } else {
        if (reqListingId) {
          await base44.entities.Listing.update(reqListingId, {
            neighborhood_join_status: "denied"
          });

          const reqs = await base44.entities.JoinRequest.filter({
            listingId: reqListingId,
            ...(saleListingId ? { saleListingId } : {})
          });

          if (reqs && reqs.length > 0) {
            await base44.entities.JoinRequest.update(reqs[0].id, { status: "denied" });
          }
        }

        await base44.entities.Notification.create({
          userId: reqUserId,
          user_id: reqUserId,
          title: "Neighborhood Sale Request",
          message: "Request denied. Complete payment to activate listing.",
          type: "join_request_denied",
          related_entity_type: "listing",
          related_entity_id: saleListingId,
          read: false,
          is_read: false
        });
      }

      await base44.entities.Notification.update(notificationId, {
        read: true,
        is_read: true,
        type: "join_request_resolved",
        message: `You ${action === "accept" ? "approved" : "denied"} the join request for ${eventTitle}.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Response sent");
    }
  });

  const coHostInviteMutation = useMutation({
    mutationFn: ({ notification, action }) => respondToCoHostInvite(notification, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["myListings"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success(variables.action === "accept" ? "Co-host request accepted" : "Co-host request declined");
    },
    onError: (error) => {
      toast.error(error.message || "Could not respond to co-host request.");
    }
  });

  const vendorAccessInviteMutation = useMutation({
    mutationFn: async ({ notification, action }) => {
      const authorizedUserId = notification.metadata?.authorized_user_id;
      if (!authorizedUserId) return;
      const now = new Date().toISOString();
      if (action === "accept") {
        await base44.entities.VendorAuthorizedUser.update(authorizedUserId, {
          status: "accepted",
          accepted_at: now,
        });
      } else {
        await base44.entities.VendorAuthorizedUser.update(authorizedUserId, {
          status: "denied",
          denied_at: now,
        });
      }
      await base44.entities.Notification.update(notification.id, {
        read: true,
        is_read: true,
        message: action === "accept"
          ? `You accepted access to ${notification.metadata?.business_name || "the vendor dashboard"}.`
          : `You declined access to ${notification.metadata?.business_name || "the vendor dashboard"}.`,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(variables.action === "accept" ? "Access accepted! Vendor Tools is now available." : "Invite declined.");
    },
    onError: () => toast.error("Could not respond to invite."),
  });

  const vendorEventInviteMutation = useMutation({
    mutationFn: async ({ notification, action }) => {
      const inviteId = notification.metadata?.invite_id;
      if (!inviteId) return;
      await base44.entities.EventVendorInvite.update(inviteId, {
        status: action === "accept" ? "pending_setup" : "declined",
        updated_at: new Date().toISOString(),
      });
      await base44.entities.Notification.update(notification.id, {
        read: true,
        is_read: true,
        message: action === "accept" ? "You accepted this event invitation." : "You declined this event invitation.",
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(variables.action === "accept" ? "Invitation accepted" : "Invitation declined");
    }
  });

  const getIcon = (type) => {
    if (type === "vendor_access_invite") return <Users className="w-4 h-4 text-teal-600" />;
    if (type === "vendor_event_invite" || type === "event_collaboration_invite") return <Users className="w-4 h-4 text-emerald-600" />;
    if (type?.startsWith("join_")) return <Users className="w-4 h-4 text-purple-600" />;
    if (type?.startsWith("report_")) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (type?.startsWith("support_")) return <LifeBuoy className="w-4 h-4 text-blue-600" />;
    if (type?.startsWith("listing_")) return <MapPin className="w-4 h-4 text-orange-600" />;
    if (type?.startsWith("case_") || type?.startsWith("assign_")) return <LifeBuoy className="w-4 h-4 text-indigo-600" />;
    switch (type) {
      case "new_listing":
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case "expiring_tracked":
      case "own_expiring":
        return <Clock className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read && !notification.is_read) {
       markReadMutation.mutate(notification);
    }
    let url = null;
    if (notification._isCaseNotif) {
      url = createPageUrl("CaseManagement") + `?openCaseId=${notification.case_id}`;
    } else {
      const entityId = notification.related_entity_id || notification.metadata?.listing_id || notification.metadata?.sale_listing_id || notification.location_id;

      if (notification.type?.startsWith("report_") || notification.type?.startsWith("case_") || notification.type?.startsWith("assign_")) {
        url = createPageUrl("AdminLite") + "?tab=cases" + (entityId ? `&openCaseId=${entityId}` : "");
      } else if (notification.type?.startsWith("support_ticket_")) {
        url = createPageUrl("MySupportTickets");
      } else if (notification.metadata?.rescue_token) {
        url = createPageUrl("CreateListing") + "?rescueToken=" + notification.metadata.rescue_token;
      } else if (notification.type === "join_invitation" && notification.metadata?.invite_code) {
        url = createPageUrl("JoinNeighborhoodSale") + `?code=${encodeURIComponent(notification.metadata.invite_code)}`;
      } else if (notification.type === "vendor_event_invite") {
        url = `/VendorEventDetail?id=${notification.metadata?.event_id || entityId}`;
      } else if (notification.type === "event_collaboration_invite") {
        url = `/VendorDashboard?tab=events&collabInvite=${notification.metadata?.collaborator_id || ""}&eventId=${notification.metadata?.event_id || entityId || ""}`;
      } else if (notification.type?.startsWith("join_")) {
        if (entityId) {
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
    }

    if (url) {
      onClose?.();
      navigate(url);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[500px] min-h-0">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-lg">Notifications</h3>
        {notifications.some((n) => !n.read && !n.is_read) && (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="text-xs gap-1">
            <CheckCheck className="w-3 h-3" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const isUnread = !notification.read && !notification.is_read;
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    isUnread ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {isUnread && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>

                      {notification.type === "co_host_invite" && (
                        <div className="flex gap-2 mt-2 mb-3">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
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
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              coHostInviteMutation.mutate({ notification, action: "decline" });
                            }}
                          >
                            <X className="w-3 h-3 mr-1" /> Deny
                          </Button>
                        </div>
                      )}

                      {notification.type === "join_request" && !notification.read && !notification.is_read && (
                        <div className="flex gap-2 mt-2 mb-3">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToRequestMutation.mutate({
                                notificationId: notification.id,
                                action: "accept",
                                eventTitle: notification.metadata?.event_title || "this Neighborhood Sale",
                                notification,
                              });
                            }}
                          >
                            <Check className="w-3 h-3 mr-1" /> Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToRequestMutation.mutate({
                                notificationId: notification.id,
                                action: "deny",
                                eventTitle: notification.metadata?.event_title || "this Neighborhood Sale",
                                notification,
                              });
                            }}
                          >
                            <X className="w-3 h-3 mr-1" /> Deny
                          </Button>
                        </div>
                      )}

                      {notification.type === "vendor_access_invite" && !notification.read && !notification.is_read && (
                        <div className="flex gap-2 mt-2 mb-3">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-[#5DADA5] hover:bg-[#4A9B93]"
                            onClick={(e) => {
                              e.stopPropagation();
                              vendorAccessInviteMutation.mutate({ notification, action: "accept" });
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
                              vendorAccessInviteMutation.mutate({ notification, action: "deny" });
                            }}
                          >
                            <X className="w-3 h-3 mr-1" /> Deny
                          </Button>
                        </div>
                      )}

                      {notification.type === "vendor_event_invite" && (
                        <div className="flex flex-wrap gap-2 mt-2 mb-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onClose?.(); navigate(`/VendorEventDetail?id=${notification.metadata?.event_id}`); }}>View Event</Button>
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={(e) => { e.stopPropagation(); vendorEventInviteMutation.mutate({ notification, action: "accept" }); }}><Check className="w-3 h-3 mr-1" /> Accept</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); vendorEventInviteMutation.mutate({ notification, action: "decline" }); }}><X className="w-3 h-3 mr-1" /> Decline</Button>
                        </div>
                      )}

                      {notification.type === "event_collaboration_invite" && (
                        <div className="flex flex-wrap gap-2 mt-2 mb-3">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose?.();
                              navigate(`/VendorDashboard?tab=events&collabInvite=${notification.metadata?.collaborator_id || ""}&eventId=${notification.metadata?.event_id || notification.related_entity_id || ""}`);
                            }}
                          >
                            Review Invite
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
                            deleteMutation.mutate(notification);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-slate-100 bg-slate-50">
        <Button 
          variant="ghost" 
          className="w-full text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          onClick={() => { onClose?.(); navigate(createPageUrl("Notifications")); }}
        >
          View All Notifications
        </Button>
      </div>
    </div>
  );
}