import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const LEGACY_KEY = "yardit_christmas_coming_soon_2026_v1";
const seenThisSession = new Set();

export default function useChristmasAnnouncement() {
  const { user, isLoadingAuth } = useAuth();
  const userId = user?.id;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    let active = true;
    setOpen(false);
    const showOnce = async () => {
      const currentUser = userId ? await base44.auth.me() : null;
      if (!active) return;
      const key = `yardit_christmas_announcement_seen:${userId || "guest"}`;
      let seen = seenThisSession.has(key) || currentUser?.christmas_announcement_seen === true;
      try {
        seen = seen || localStorage.getItem(key) === "seen" || localStorage.getItem(LEGACY_KEY) === "seen";
        localStorage.setItem(key, "seen");
        localStorage.removeItem(LEGACY_KEY);
      } catch { /* Account and session memory still prevent repeat announcements. */ }
      seenThisSession.add(key);
      if (!seen) setOpen(true);
      if (currentUser && !currentUser.christmas_announcement_seen) {
        await base44.auth.updateMe({ christmas_announcement_seen: true });
      }
    };
    void showOnce();
    return () => { active = false; };
  }, [userId, isLoadingAuth]);

  return { open, dismiss: () => setOpen(false) };
}