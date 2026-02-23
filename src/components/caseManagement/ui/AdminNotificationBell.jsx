import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { logAdminEvent } from "../lib/eventLogger";

export default function AdminNotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch notifications on mount + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const all = await base44.entities.CaseNotification.filter(
        { admin_id: user.id },
        "-created_date",
        20
      );
      setNotifications(all.slice(0, 5));
      setUnreadCount(all.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      logAdminEvent({ adminId: user.id, eventType: "opened_notification_dropdown", page: "Layout" });
    }
  };

  const handleClickNotification = async (notif) => {
    logAdminEvent({
      adminId: user.id,
      caseId: notif.case_id,
      eventType: "clicked_notification",
      payload: { notificationId: notif.id },
      page: "Layout",
    });

    // Mark as read
    if (!notif.is_read) {
      await base44.entities.CaseNotification.update(notif.id, { is_read: true });
    }

    setOpen(false);

    // Navigate to CaseManagement with openCaseId param
    navigate(createPageUrl("CaseManagement") + `?openCaseId=${notif.case_id}`);

    // Refresh counts
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    logAdminEvent({ adminId: user.id, eventType: "marked_all_notifications_read", page: "Layout" });

    const unread = notifications.filter(n => !n.is_read);
    for (const n of unread) {
      await base44.entities.CaseNotification.update(n.id, { is_read: true });
    }
    await fetchNotifications();
    setMarkingAll(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-[#5DADA5] leading-none px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 z-[200] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                    !n.is_read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    <div className={`flex-1 ${n.is_read ? "ml-4" : ""}`}>
                      <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(n.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}