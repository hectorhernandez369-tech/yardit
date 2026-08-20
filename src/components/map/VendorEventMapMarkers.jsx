import { useEffect, useMemo, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { isPublishedVendorEvent } from "@/lib/vendorEvents";
import { groupVendorEventsByLocation, getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";
import { buildUnifiedSchedulePreview } from "@/lib/unifiedEventSchedule";

const markerCache = {};

const timeLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const scoreLabel = (game) => {
  const status = String(game?.status || "upcoming").toLowerCase();
  if (status === "final") return `${Number(game.home_score || 0)}-${Number(game.away_score || 0)} Final`;
  if (status === "live" || status === "halftime") return `${Number(game.home_score || 0)}-${Number(game.away_score || 0)} ${status === "halftime" ? "Halftime" : "Live"}`;
  return timeLabel(game?.start_time);
};

function getVendorEventIcon(isComingSoon, stackCount, logoUrl) {
  const safeLogoUrl = logoUrl ? String(logoUrl).replace(/"/g, "&quot;") : "";
  const key = `ve_${isComingSoon ? "cs" : "active"}_${stackCount}_${safeLogoUrl || "default"}`;
  if (markerCache[key]) return markerCache[key];

  const iconSize = safeLogoUrl ? 34 : 28;
  const fill = isComingSoon ? "#94a3b8" : "#5DADA5";
  const border = isComingSoon ? "#64748b" : "#2C4F4E";
  const opacity = isComingSoon ? 0.7 : 1;
  const badgeHtml = stackCount > 0 ? `<div style="position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 3px;border-radius:9999px;background:#2C4F4E;border:2px solid #F4A849;color:#fff;font-weight:700;font-size:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);">+${stackCount}</div>` : "";
  const comingSoonLabel = isComingSoon ? `<div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:rgba(245,158,11,0.9);color:#fff;font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;white-space:nowrap;pointer-events:none;">Soon</div>` : "";
  const markerBody = safeLogoUrl ? `<div style="width:${iconSize}px;height:${iconSize}px;border-radius:9999px;background:white;border:3px solid ${border};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.28);overflow:hidden;"><img src="${safeLogoUrl}" alt="Event logo" style="width:100%;height:100%;object-fit:cover;" /></div>` : `<div style="width:${iconSize}px;height:${iconSize}px;border-radius:${iconSize / 2}px;background:${fill};border:3px solid ${border};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.25);"><span style="color:white;font-size:13px;">🎪</span></div>`;

  const icon = L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${iconSize}px;height:${iconSize}px;opacity:${opacity};">${markerBody}${badgeHtml}${comingSoonLabel}</div>`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize],
    popupAnchor: [0, -iconSize - 2],
  });

  markerCache[key] = icon;
  return icon;
}

export default function VendorEventMapMarkers({
  vendorEvents,
  showVendorEvents = true,
  eventScheduleEntries = [],
  leagueEventLinks = [],
  leagueGames = [],
  selectedEventId = "",
  previewEventIds = [],
  leagueReturnState = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const now = new Date();
  const markerRefs = useRef({});
  const selectedId = selectedEventId ? String(selectedEventId) : "";

  const previewIdSet = useMemo(() => new Set(previewEventIds.map((id) => String(id))), [previewEventIds]);

  const groups = useMemo(() => {
    if (!showVendorEvents && previewIdSet.size === 0) return [];

    const visible = vendorEvents.filter((event) => isPublishedVendorEvent(event, now) || previewIdSet.has(String(event.id)));
    const displayable = visible.filter((event) => {
      if (previewIdSet.has(String(event.id))) return true;
      const visStatus = getVendorEventVisibilityStatus(event, now);
      return visStatus === "active" || visStatus === "coming_soon";
    });

    const grouped = groupVendorEventsByLocation(displayable, now);
    if (!selectedId) return grouped;

    return grouped.map((group) => {
      const allEvents = [group.primary, ...group.stacked];
      const selectedEvent = allEvents.find((event) => String(event.id) === selectedId);
      if (!selectedEvent) return group;
      return {
        primary: selectedEvent,
        stacked: allEvents.filter((event) => String(event.id) !== selectedId),
      };
    });
  }, [vendorEvents, showVendorEvents, selectedId, previewIdSet]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => {
      markerRefs.current[selectedId]?.openPopup?.();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [selectedId, groups]);

  const handleLeagueBack = () => {
    navigate(
      `/LeagueTeamDashboard?tab=events&eventId=${encodeURIComponent(location.state?.selectedEventId || selectedId || "")}`,
      {
        replace: true,
        state: {
          restoreEvent: true,
          selectedEventId: location.state?.selectedEventId || selectedId,
          eventSubtab: location.state?.eventSubtab,
        },
      }
    );
  };

  if (!groups.length) return null;

  return (
    <>
      {groups.map(({ primary, stacked }) => {
        const visStatus = getVendorEventVisibilityStatus(primary, now);
        const isComingSoon = visStatus === "coming_soon";
        const isScheduled = visStatus === "scheduled";
        const stackCount = stacked.length;
        const eventLinks = leagueEventLinks.filter((link) => link?.event_id === primary.id);
        const eventEntries = eventScheduleEntries.filter((entry) => entry?.event_id === primary.id);
        const unifiedPreview = buildUnifiedSchedulePreview({ leagueEventLinks: eventLinks, leagueGames, scheduleEntries: eventEntries, limit: 4 });

        return (
          <Marker
            key={`ve-${primary.id}`}
            ref={(ref) => { if (ref) markerRefs.current[String(primary.id)] = ref; }}
            position={[primary.latitude, primary.longitude]}
            icon={getVendorEventIcon(isComingSoon || isScheduled, stackCount, primary.logo || primary.organizer_logo)}
          >
            <Popup maxWidth={300} minWidth={220} autoPan>
              <div className="space-y-2 rounded-xl bg-white p-3 text-slate-900 shadow-sm">
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge className={isComingSoon || isScheduled ? "bg-amber-500 text-white text-[9px] px-1 py-0" : "bg-emerald-600 text-white text-[9px] px-1 py-0"}>
                    {isScheduled ? "Scheduled" : isComingSoon ? "Coming Soon" : "Active Now"}
                  </Badge>
                  {stackCount > 0 && <Badge variant="outline" className="text-[9px] px-1 py-0">+{stackCount} more</Badge>}
                </div>

                <p className="font-bold text-sm leading-tight">{primary.title}</p>
                <p className="text-[11px] text-slate-500">{primary.display_address}</p>

                {unifiedPreview.items.length > 0 && (
                  <div className="rounded-lg bg-slate-50/90 p-1.5 space-y-1">
                    {unifiedPreview.items.map((item) => item.schedule_item_type === "league_game" ? (
                      <div key={item.id} className="space-y-0.5 text-[11px] leading-tight">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate font-semibold text-slate-700">{item.home_team || "Home"} vs {item.away_team || "Away"}</span>
                          <span className="shrink-0 font-bold text-[#2C4F4E] capitalize">{scoreLabel(item)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                          <span className="min-w-0 truncate">{item.division || item.age_group || item.field_name || "Game"}</span>
                          <span className="shrink-0">{timeLabel(item.start_time)}</span>
                        </div>
                      </div>
                    ) : (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-[11px] leading-tight">
                        <span className="min-w-0 truncate font-semibold text-slate-700">{item.title || item.game_title || "Schedule Item"}</span>
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
                          <span className="font-semibold">{evt.title}</span>{" — "}<span className={s === "active" ? "text-emerald-600 font-semibold" : "text-amber-600"}>{s === "active" ? "Active" : s === "coming_soon" ? "Coming Soon" : "Scheduled"}</span>
                          {s === "coming_soon" && evt.startDateTime && <span className="text-slate-400"> · starts {new Date(evt.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                        </p>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                  {leagueReturnState && (
                    <Button size="sm" variant="outline" onClick={handleLeagueBack} className="h-6 flex-1 text-[11px] px-2">
                      Back
                    </Button>
                  )}
                  <Button size="sm" onClick={() => navigate(`/VendorEventPublicPage?id=${primary.id}`)} className="h-6 flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] px-2">
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