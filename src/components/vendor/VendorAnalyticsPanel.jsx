import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Heart, MapPin, MessageSquare, Users } from "lucide-react";
import { getVendorTierConfig } from "@/lib/vendorTiers";

export default function VendorAnalyticsPanel({ account, checkIns = [], updates = [], followers = [] }) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  const level = tier.analyticsLevel || "none";

  const stats = useMemo(() => {
    const totalLikes = updates.reduce((sum, item) => sum + Number(item.likes || 0), 0);
    const locationCounts = new Map();
    const dayCounts = new Map();
    checkIns.forEach((item) => {
      const location = item.checkin_display_address || "Unnamed location";
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      const d = new Date(item.checkin_start_time || item.created_date);
      if (!Number.isNaN(d.getTime())) {
        const day = d.toLocaleDateString("en-US", { weekday: "long" });
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      }
    });
    const topLocation = [...locationCounts.entries()].sort((a,b) => b[1]-a[1])[0];
    const topDay = [...dayCounts.entries()].sort((a,b) => b[1]-a[1])[0];
    const topPost = [...updates].sort((a,b) => Number(b.likes || 0)-Number(a.likes || 0))[0];
    return { totalLikes, topLocation, topDay, topPost };
  }, [checkIns, updates]);

  if (level === "none") return (
    <Card><CardContent className="p-5 text-sm text-slate-600">Vendor analytics are available on Pro and Growth.</CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><BarChart3 className="h-5 w-5" /> {level === "advanced" ? "Advanced" : "Basic"} Analytics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3"><MapPin className="h-4 w-4 text-[#5DADA5]" /><p className="mt-1 text-2xl font-black">{checkIns.length}</p><p className="text-xs text-slate-500">Check-ins</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><MessageSquare className="h-4 w-4 text-[#5DADA5]" /><p className="mt-1 text-2xl font-black">{updates.length}</p><p className="text-xs text-slate-500">Posts</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><Heart className="h-4 w-4 text-[#5DADA5]" /><p className="mt-1 text-2xl font-black">{stats.totalLikes}</p><p className="text-xs text-slate-500">Post likes</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><Users className="h-4 w-4 text-[#5DADA5]" /><p className="mt-1 text-2xl font-black">{followers.filter((f) => f.subscription_enabled !== false).length}</p><p className="text-xs text-slate-500">Followers</p></div>
        </CardContent>
      </Card>

      {level === "advanced" && (
        <Card><CardContent className="grid gap-3 p-5 md:grid-cols-3">
          <div><p className="text-xs font-semibold uppercase text-slate-400">Best location</p><p className="font-bold text-[#2C4F4E]">{stats.topLocation?.[0] || "Not enough data"}</p>{stats.topLocation && <p className="text-xs text-slate-500">{stats.topLocation[1]} check-ins</p>}</div>
          <div><p className="text-xs font-semibold uppercase text-slate-400">Best day</p><p className="font-bold text-[#2C4F4E]">{stats.topDay?.[0] || "Not enough data"}</p>{stats.topDay && <p className="text-xs text-slate-500">{stats.topDay[1]} check-ins</p>}</div>
          <div><p className="text-xs font-semibold uppercase text-slate-400">Top post</p><p className="font-bold text-[#2C4F4E] line-clamp-2">{stats.topPost?.text || "Not enough data"}</p>{stats.topPost && <p className="text-xs text-slate-500">{stats.topPost.likes || 0} likes</p>}</div>
        </CardContent></Card>
      )}
      <p className="text-xs text-slate-500">These analytics use activity Yardit currently records: check-ins, posts, likes, and vendor followers.</p>
    </div>
  );
}