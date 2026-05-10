import React from "react";
import { Ban, CalendarDays, Eye, MapPin, Sparkles, Users } from "lucide-react";
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

export default function TierFeatureSummary({ tier, compact = false }) {
  if (!tier) return null;

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <FeatureRow icon={Users} label="Included users" value={`${tier.includedUsers} user login${tier.includedUsers === 1 ? "" : "s"}`} />
        <FeatureRow icon={MapPin} label="Included pins" value={`${tier.includedPins} active pin${tier.includedPins === 1 ? "" : "s"}`} />
        <FeatureRow icon={CalendarDays} label="Included events" value={tier.eventAllowanceLabel} />
        <FeatureRow icon={Eye} label="Visibility" value={`${tier.visibilityRange} · Zoom level ${tier.mapZoom}+`} />
      </div>

      {!compact && (
        <div className="rounded-xl border border-[#2C4F4E]/10 bg-white/70 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#2C4F4E]">Event type access</p>
          <div className="space-y-2 text-xs text-slate-700">
            <p><strong>Single Event:</strong> One location event such as a pop-up, sale, or vendor setup.</p>
            <p><strong>Multi-Field Event:</strong> Large organized event with multiple internal locations or fields.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">{tier.dailyCheckInLimit ? `${tier.dailyCheckInLimit} check-in/day` : "Unlimited check-ins"}</Badge>
        <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">{tier.logoPin ? "Logo pins" : "Basic pins"}</Badge>
        <Badge variant="outline" className="rounded-full bg-white text-[#2C4F4E]">{tier.animation ? "Animated pins" : "No animation"}</Badge>
      </div>

      {tier.restrictions?.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {tier.restrictions.map((restriction) => (
            <p key={restriction} className="flex gap-2"><Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />{restriction}</p>
          ))}
        </div>
      )}

      {tier.organizerMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
          <Sparkles className="h-4 w-4" />
          {tier.organizerMessage}
        </div>
      )}
    </div>
  );
}