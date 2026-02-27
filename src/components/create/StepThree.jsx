import React, { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function safeUUID() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return `ns_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function fmtDate(isoOrDateStr) {
  if (!isoOrDateStr) return "Not set";
  try {
    const d = new Date(isoOrDateStr);
    if (Number.isNaN(d.getTime())) return "Not set";
    return d.toLocaleDateString();
  } catch {
    return "Not set";
  }
}

function fmtRange(startISO, endISO) {
  const a = fmtDate(startISO);
  const b = fmtDate(endISO);
  if (a === "Not set" || b === "Not set") return "Not set";
  return `${a} – ${b}`;
}

// dateStr is "YYYY-MM-DD"
function addDaysDateStr(dateStr, deltaDays) {
  if (!dateStr) return null;
  try {
    const [y, m, d] = dateStr.split("-").map((x) => Number(x));
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  } catch {
    return null;
  }
}

function dateStrToISOStart(dateStr) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function dateStrToISOEnd(dateStr) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T23:59:59`).toISOString();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export default function StepThree({ formData, setFormData }) {
  const listingType = formData?.listingType || "yard_sale";
  const tier = formData?.tier || "";
  const isNeighborhoodSale = listingType === "neighborhood_sale";

  // Ensure Neighborhood invite code exists (so EO can share before publish)
  useEffect(() => {
    if (!isNeighborhoodSale) return;

    const existing = formData?.invite_code || formData?.neighborhoodDraftId;
    if (existing) return;

    const id = safeUUID();
    setFormData((p) => ({
      ...p,
      invite_code: id,
      neighborhoodDraftId: id,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNeighborhoodSale]);

  // Premium pre-activation: +/- counter (0–3)
  const earlyDays = useMemo(() => {
    const n = Number(formData?.earlyVisibilityDays ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 0;
  }, [formData?.earlyVisibilityDays]);

  const canShowSchedule = !isNeighborhoodSale && !!tier;

  // Determine the date range fields used across the app
  const startISO = formData?.startDateTime || "";
  const endISO = formData?.endDateTime || "";

  // If CreateListing hasn’t computed start/end yet, fall back to selected range
  const selectedStart = formData?.selectedRangeStartDate || "";
  const selectedEnd = formData?.selectedRangeEndDate || "";

  const resolvedStartISO = useMemo(() => {
    if (startISO) return startISO;
    if (selectedStart) return dateStrToISOStart(selectedStart);
    return "";
  }, [startISO, selectedStart]);

  const resolvedEndISO = useMemo(() => {
    if (endISO) return endISO;
    if (selectedEnd) return dateStrToISOEnd(selectedEnd);
    return "";
  }, [endISO, selectedEnd]);

  const premiumAdvertisingStartISO = useMemo(() => {
    if (!selectedStart) return "";
    const advStart = addDaysDateStr(selectedStart, -earlyDays);
    if (!advStart) return "";
    return dateStrToISOStart(advStart);
  }, [selectedStart, earlyDays]);

  const inviteUrl = useMemo(() => {
    if (!isNeighborhoodSale) return "";
    const code = formData?.invite_code || formData?.neighborhoodDraftId;
    if (!code) return "";
    return `${window.location.origin}/join-neighborhood-sale?code=${encodeURIComponent(code)}`;
  }, [isNeighborhoodSale, formData?.invite_code, formData?.neighborhoodDraftId]);

  const onMinusEarly = () => {
    setFormData((p) => ({
      ...p,
      earlyVisibilityDays: Math.max(0, Math.min(3, Number(p?.earlyVisibilityDays ?? 0) - 1)),
    }));
  };

  const onPlusEarly = () => {
    setFormData((p) => ({
      ...p,
      earlyVisibilityDays: Math.max(0, Math.min(3, Number(p?.earlyVisibilityDays ?? 0) + 1)),
    }));
  };

  const onCopyLink = async () => {
    if (!inviteUrl) return;
    const ok = await copyToClipboard(inviteUrl);
    if (ok) toast.success("Link copied");
    else toast.error("Could not copy link");
  };

  const onShare = async () => {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join our Neighborhood Sale",
          text: "Tap to request to join the Neighborhood Sale on Yardit.",
          url: inviteUrl,
        });
        return;
      } catch {
        // user cancelled; fall back to copy
      }
    }
    await onCopyLink();
  };

  return (
    <div className="space-y-4">
      {/* 1) Review header */}
      <div className="space-y-1">
        <div className="text-base font-semibold">Review</div>
        <div className="text-sm opacity-70">
          (Confirm your schedule and rules before you publish.)
        </div>
      </div>

      {/* 2) Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Schedule Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isNeighborhoodSale ? (
            <>
              <div className="text-sm">
                <div className="font-medium">Neighborhood Event Dates</div>
                <div className="opacity-80">
                  {fmtRange(resolvedStartISO, resolvedEndISO)}{" "}
                  <span className="text-xs opacity-70">(max 3 days)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs opacity-70">Radius</div>
                  <div className="font-semibold">500 ft (locked)</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs opacity-70">Homes</div>
                  <div className="font-semibold">Up to 25</div>
                </div>
              </div>
            </>
          ) : !canShowSchedule ? (
            <div className="text-sm opacity-70">(Select a tier to see schedule details.)</div>
          ) : tier === "free" ? (
            <>
              <div className="text-sm">
                <div className="font-medium">Scheduled</div>
                <div className="opacity-80">
                  Next weekend (Fri–Sun){resolvedStartISO && resolvedEndISO ? `: ${fmtRange(resolvedStartISO, resolvedEndISO)}` : ""}
                </div>
              </div>
              <div className="text-xs opacity-70">
                Dates cannot be changed for Free listings.
              </div>
            </>
          ) : tier === "featured" ? (
            <>
              <div className="text-sm">
                <div className="font-medium">Active Dates</div>
                <div className="opacity-80">
                  {fmtRange(resolvedStartISO, resolvedEndISO)}{" "}
                  <span className="text-xs opacity-70">(3 days)</span>
                </div>
              </div>
              <div className="text-xs opacity-70">
                Featured requires exactly 3 consecutive days.
              </div>
            </>
          ) : tier === "premium" ? (
            <>
              <div className="text-sm">
                <div className="font-medium">Active Dates</div>
                <div className="opacity-80">
                  {fmtRange(resolvedStartISO, resolvedEndISO)}{" "}
                  <span className="text-xs opacity-70">(5 days)</span>
                </div>
              </div>

              {/* Premium Pre-Activation */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Pre-Activation Advertising</div>
                    <div className="text-xs opacity-70">
                      Pre-activation shows your pin early for advertising only. (It does not start your sale early.)
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onMinusEarly}
                      className="h-9 w-10 px-0"
                      aria-label="Decrease pre-activation days"
                    >
                      –
                    </Button>
                    <div className="min-w-[40px] text-center text-sm font-semibold">
                      {earlyDays}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onPlusEarly}
                      className="h-9 w-10 px-0"
                      aria-label="Increase pre-activation days"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Advertising starts:</span>{" "}
                    <span className="opacity-80">{fmtDate(premiumAdvertisingStartISO)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Sale active:</span>{" "}
                    <span className="opacity-80">{fmtRange(resolvedStartISO, resolvedEndISO)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm opacity-70">(Schedule rules not defined for this tier.)</div>
          )}
        </CardContent>
      </Card>

      {/* 3) Tier Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tier Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-1">
            <div className="font-semibold">Free</div>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>Appears in list view only (no priority pin).</li>
              <li>Runs next weekend only (Fri–Sun).</li>
            </ul>
          </div>

          <div className="space-y-1">
            <div className="font-semibold">Featured</div>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>Exactly 3 consecutive days.</li>
              <li>Higher visibility than standard/premium pins at broader zooms.</li>
              <li>No pre-activation advertising.</li>
            </ul>
          </div>

          <div className="space-y-1">
            <div className="font-semibold">Premium</div>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>Exactly 5 consecutive days.</li>
              <li>Optional pre-activation advertising (0–3 days) using + / –.</li>
              <li>Pre-activation shows your pin early for advertising only.</li>
            </ul>
          </div>

          <div className="space-y-1">
            <div className="font-semibold">Neighborhood Sale</div>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>Separate event (opt-in only). Homes are not auto-included just by being nearby.</li>
              <li>EO controls the event; homes request to join and EO approves/denies via notifications.</li>
              <li>Radius is locked (500 ft) and event supports up to 25 homes.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 4) Neighborhood Invite (only for neighborhood sale) */}
      {isNeighborhoodSale && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invite Homes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm opacity-80">
              Share this link so homes can request to join your Neighborhood Sale.
            </div>

            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              readOnly
              value={inviteUrl || ""}
              onFocus={(e) => e.target.select()}
            />

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onCopyLink}>
                Copy Link
              </Button>
              <Button type="button" className="flex-1" onClick={onShare}>
                Share
              </Button>
            </div>

            <div className="text-[11px] opacity-60">
              (Link opens a join page where homes can request approval.)
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5) What happens next */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 opacity-90">
          {isNeighborhoodSale ? (
            <>
              <div>• Homes who join will request approval.</div>
              <div>• You’ll approve/deny from your notification bell.</div>
              <div>• Once 5+ homes confirm, you can activate advertising (coming soon) before the event.</div>
            </>
          ) : (
            <>
              <div>• Your pin appears based on your tier rules.</div>
              <div>• Your listing auto-expires after the end date.</div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}