import { useMemo, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isPublishedVendorEvent } from "@/lib/vendorEvents";
import { groupVendorEventsByLocation, getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";

const markerCache = {};

const timeLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

function getVendorEventIcon(isComingSoon, stackCount, logoUrl) {
  const safeLogoUrl = logoUrl ? String(logoUrl).replace(/"/g, "&quot;") : "";
  const key = `ve_${isComingSoon ? "cs" : "active"}_${stackCount}_${safeLogoUrl || "default"}`;
  if (markerCache[key]) return markerCache[key];

  const iconSize = safeLogoUrl ? 34 : 28;
  const fill = isComingSoon ? "#94a3b8" : "#5DADA5";
  const border = isComingSoon ? "#64748b" : "#2C4F4E";
  const opacity = isComingSoon ? 0.7 : 1;
  const badgeHtml = stackCount > 0
    ? `<div style="position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 3px;border-radius:9999px;background:#2C4F4E;border:2px solid #F4A849;color:#fff;font-weight:700;font-size:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);">+${stackCount}</div>`
    : "";
  const comingSoonLabel = isComingSoon
    ? `<div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:rgba(245,158,11,0.9);color:#fff;font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;white-space:nowrap;pointer-events:none;">Soon</div>`
    : "";
  const markerBody = safeLogoUrl
    ? `<div style="width:${iconSize}px;height:${iconSize}px;border-radius:9999px;background:white;border:3px solid ${border};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.28);overflow:hidden;"><img src="${safeLogoUrl}" alt="Event logo" style="width:100%;height:100%;object-fit:cover;" /></div>`
    : `<div style="width:${iconSize}px;height:${iconSize}px;border-radius:${iconSize / 2}px;background:${fill};border:3px solid ${border};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.25);"><span style="color:white;font-size:13px;">🎪</span></div>`;

  const icon = L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${iconSize}px;height:${iconSize}px;opacity:${opacity};">
      ${markerBody}
      ${badgeHtml}
      ${comingSoonLabel}
    </div>`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize],
    popupAnchor: [0, -iconSize - 2],
  });

  markerCache[key] = icon;
  return icon;
}

export default function VendorEventMapMarkers({ vendorEvents, showVendorEvents = true }) {
  const navigate = useNavigate();
  const now = new Date();

  const groups = useMemo(() => {
    if (!showVendorEvents) return [];
    const visible = vendorEvents.filter((e) => isPublishedVendorEvent(e, now));
    const displayable = visible.filter((e) => {
      const vs = getVendorEventVisibilityStatus(e, now);
      return vs === "active" || vs === "coming_soon";
    });
    return groupVendorEventsByLocation(displayable, now);
  }, [vendorEvents, showVendorEvents]);

  if (!groups.length) return null;

  return (
    <>
      {groups.map(({ primary, stacked }) => {
        const visStatus = getVendorEventVisibilityStatus(primary, now);
        const isComingSoon = visStatus === "coming_soon";
        const stackCount = stacked.length;

        const schedulePreview = (primary.schedule_preview || []).filter((item) => item?.title && item?.start_time).slice(0, 4);

        return (
          <Marker
            key={`ve-${primary.id}`}
            position={[primary.latitude, primary.longitude]}
            icon={getVendorEventIcon(isComingSoon, stackCount, primary.logo || primary.organizer_logo)}
          >
            <Popup maxWidth={300} minWidth={220} autoPan>
              <div className="space-y-2 rounded-xl bg-white p-3 text-slate-900 shadow-sm">
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge className={isComingSoon ? "bg-amber-500 text-white text-[9px] px-1 py-0" : "bg-emerald-600 text-white text-[9px] px-1 py-0"}>
                    {isComingSoon ? "Coming Soon" : "Active Now"}
                  </Badge>
                  {stackCount > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0">+{stackCount} more</Badge>
                  )}
                </div>

                <p className="font-bold text-sm leading-tight">{primary.title}</p>
                <p className="text-[11px] text-slate-500">{primary.display_address}</p>

                {schedulePreview.length > 0 && (
                  <div className="rounded-lg bg-slate-50/90 p-1.5 space-y-1">
                    {schedulePreview.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="flex items-center justify-between gap-2 text-[11px] leading-tight">
                        <span className="min-w-0 truncate font-semibold text-slate-700">{item.title}</span>
                        <span className="shrink-0 text-slate-500">{timeLabel(item.start_time)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {stacked.length > 0 && (
                  <div className="border-t border-slate-100 pt-1.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Also at this location:</p>
                    {stacked.map((evt) => {
                      const s = getVendorEventVisibilityStatus(evt, now);
                      return (
                        <p key={evt.id} className="text-[11px] text-slate-600">
                          <span className="font-semibold">{evt.title}</span>
                          {" — "}
                          <span className={s === "active" ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                            {s === "active" ? "Active" : "Coming Soon"}
                          </span>
                          {s === "coming_soon" && evt.startDateTime && (
                            <span className="text-slate-400"> · starts {new Date(evt.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          )}
                        </p>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/VendorEventPublicPage?id=${primary.id}`)}
                    className="h-6 flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] px-2"
                  >
                    View Event
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}