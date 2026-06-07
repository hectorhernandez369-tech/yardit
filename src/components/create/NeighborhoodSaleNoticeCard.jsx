import React from "react";
import { CalendarDays, Eye, Home, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MAX_HOMES = 25;

function getSaleDateValue(sale, key) {
  if (key === "start") return sale?.selectedRangeStartDate || sale?.startDateTime?.slice(0, 10) || "";
  return sale?.selectedRangeEndDate || sale?.endDateTime?.slice(0, 10) || "";
}

function formatDate(dateStr) {
  if (!dateStr) return "Date TBD";
  const [year, month, day] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return String(dateStr);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(sale) {
  const start = getSaleDateValue(sale, "start");
  const end = getSaleDateValue(sale, "end");
  if (!start && !end) return "Event dates TBD";
  if (start === end || !end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatStatus(status) {
  return String(status || "upcoming").replace(/_/g, " ");
}

export default function NeighborhoodSaleNoticeCard({ sales = [], onDismiss }) {
  if (!sales.length) return null;

  const openSale = (sale) => {
    const url = `/ListingDetail?id=${encodeURIComponent(sale.id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const requestJoin = (sale) => {
    if (!sale.invite_code) return;
    window.location.href = `/join-neighborhood-sale?code=${encodeURIComponent(sale.invite_code)}`;
  };

  return (
    <Card className="border-2 border-[#F4A849] bg-[#FFF8EA] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F4A849] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#2C4F4E]">
            <Home className="h-3.5 w-3.5" /> Neighborhood Sale Nearby
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#1F2937]">
            There is an upcoming Neighborhood Sale near your address.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#1F2937]">
            Neighborhood Sale participants do not need to purchase a listing tier because visibility comes from the Neighborhood Sale event.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#1F2937]">
            You can request to join the Neighborhood Sale, or continue creating your own standalone listing.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onDismiss} className="border-[#2C4F4E] text-[#2C4F4E] hover:bg-white">
          Collapse
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {sales.map((sale) => {
          const homesJoined = Math.max(0, Number(sale.homeCount || 0));
          const spotsAvailable = Math.max(0, MAX_HOMES - homesJoined);
          const distanceFeet = Number.isFinite(sale.distanceFeet) ? Math.round(sale.distanceFeet) : null;

          return (
            <div key={sale.id} className="rounded-xl border border-[#2C4F4E]/20 bg-white p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-[#2C4F4E]">{sale.title || "Neighborhood Sale"}</h4>
                    <span className="rounded-full bg-[#5DADA5]/15 px-2 py-0.5 text-xs font-semibold capitalize text-[#2C4F4E]">
                      {formatStatus(sale.discoveryState || sale.event_state || sale.status)}
                    </span>
                  </div>

                  <div className="mt-2 rounded-lg border border-[#F4A849]/50 bg-[#F4A849]/15 px-3 py-2 text-[#2C4F4E]">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <CalendarDays className="h-4 w-4" /> Event dates: {formatDateRange(sale)}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#2C4F4E]/80">
                      If you request to join, this Neighborhood Sale uses these event dates — not your selected standalone listing dates.
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-[#1F2937]/80">
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {homesJoined} homes joined</span>
                    <span>{spotsAvailable} spots available</span>
                    {distanceFeet !== null && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {distanceFeet} ft away</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                  <Button type="button" variant="outline" onClick={() => openSale(sale)} className="border-[#2C4F4E] text-[#2C4F4E] hover:bg-[#F3E6CF]">
                    <Eye className="h-4 w-4" /> View Neighborhood Sale
                  </Button>
                  <Button type="button" onClick={() => requestJoin(sale)} disabled={!sale.invite_code} className="bg-[#006168] text-white hover:bg-[#004d52]">
                    Request to Join
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}