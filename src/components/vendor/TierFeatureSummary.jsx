import React from "react";
import { BarChart3, CalendarDays, Eye, MapPin, Megaphone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function FeatureRow({ icon, label, value }) {
  const FeatureIcon = icon;
  return (
    <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2 text-sm">
      <FeatureIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5DADA5]" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="font-semibold text-[#2C4F4E]">{value}</p>
      </div>
    </div>
  );
}

export default function TierFeatureSummary({ tier }) {
  if (!tier) return null;
  const postLabel = tier.postUpdateLimitPerMonth === null
    ? "Unlimited public updates"
    : tier.postUpdateLimitPerMonth > 0
      ? `${tier.postUpdateLimitPerMonth} public updates/month`
      : "No public updates";

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <FeatureRow icon={Users} label="Included users" value={`${tier.includedUsers} user login${tier.includedUsers === 1 ? "" : "s"}`} />
        <FeatureRow icon={MapPin} label="Included pins" value={`${tier.includedPins} active pin${tier.includedPins === 1 ? "" : "s"}`} />
        <FeatureRow icon={Eye} label="Map visibility" value={`${tier.visibilityRange} · zoom ${tier.mapZoom}+`} />
        <FeatureRow icon={Megaphone} label="Customer updates" value={postLabel} />
        <FeatureRow icon={CalendarDays} label="Events" value="Available separately as Event Add-ons" />
        {tier.analyticsLevel !== "none" && <FeatureRow icon={BarChart3} label="Analytics" value={tier.analyticsLevel === "advanced" ? "Advanced vendor analytics" : "Basic vendor analytics"} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">{tier.dailyCheckInLimit ? `${tier.dailyCheckInLimit} check-in/day` : "Unlimited check-ins"}</Badge>
        <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">{tier.fridayToSundayOnly ? "Fri–Sun check-ins" : "Any-day check-ins"}</Badge>
        <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">{tier.logoPin ? "Logo pins" : "Basic pins"}</Badge>
        {tier.scheduledLocations && <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">Scheduled locations</Badge>}
        {tier.notifyFollowersWhenLive && <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">Live follower alerts</Badge>}
        {tier.dealsAndSpecials && <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">Deals & specials</Badge>}
        {tier.animation && <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">Animated pins</Badge>}
      </div>

      {tier.restrictions?.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {tier.restrictions.map((restriction) => <p key={restriction}>• {restriction}</p>)}
        </div>
      )}
    </div>
  );
}
