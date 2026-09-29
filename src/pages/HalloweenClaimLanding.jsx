import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SetupAddressVerification from "@/components/profile/SetupAddressVerification";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Ghost, Loader2, MapPin, Search, Sparkles, Candy, CalendarDays, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HALLOWEEN_ICON_ASSETS } from "@/lib/halloweenMapIcons";
import { getHalloweenSpotTypeLabel } from "@/lib/halloweenSpots";

function formatTime(value) {
  if (!value) return "";
  const [h, m] = String(value).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function HalloweenClaimLanding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState("");
  const [assistedId, setAssistedId] = useState("");
  const [approvalSource] = useState("address_search");
  const [homeStatus, setHomeStatus] = useState("checking");
  const [homeUser, setHomeUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState(null);
  const [state, setState] = useState("search");
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const findHouse = async (event, resumeAddress) => {
    event?.preventDefault?.();
    const query = typeof resumeAddress === "string" ? resumeAddress : address;
    if (!query.trim()) return;
    setAddress(query);
    setSearching(true);
    setHomeStatus("checking");
    setAssistedId("");
    setMessage("");
    setSuggestions([]);
    setResult(null);
    try {
      const response = await base44.functions.invoke("findAssistedHalloweenSpot", { address: query.trim() });
      const data = response?.data || {};
      if (data.status === "found" || data.status === "approved") {
        setResult(data.spot);
        setAssistedId(data.assistedId || "");
        setState("found");
        const authenticated = await base44.auth.isAuthenticated();
        if (authenticated) {
          const me = await base44.auth.me();
          setHomeUser(me);
          const fullName = String(me.full_name || "").trim().split(/\s+/).filter(Boolean);
          setFirstName(me.first_name || fullName[0] || "");
          setLastName(me.last_name || fullName.slice(1).join(" ") || "");
          const check = await base44.functions.invoke("resolveAssistedHalloweenSpot", { assistedId: data.assistedId, action: "check_address" });
          setHomeStatus(check.data?.status || "address_mismatch");
          if (check.data?.status === "address_mismatch") setMessage(check.data?.error || "Your Yardit home address must match this property.");
        } else {
          setHomeUser(null);
          setHomeStatus("unauthorized");
        }
      } else if (data.status === "claimed") {
        setResult(data.spot);
        setState("claimed");
        setMessage("This Halloween Spot has already been claimed by its owner.");
      } else if (data.status === "multiple") {
        setMessage(data.message || "Add the city or ZIP code and try again.");
      } else if (data.status === "expired") {
        setMessage("We found the property, but its approval invitation has expired.");
      } else {
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setMessage(data.suggestions?.length
          ? "We didn’t find an exact match. Is your house one of these?"
          : "We couldn’t find an assisted Halloween listing at that address yet.");
      }
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "Could not search right now. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const approve = async () => {
    if (!assistedId || approvalSource !== "address_search" || homeStatus !== "verified") return;
    setActing(true);
    setMessage("");
    try {
      const response = await base44.functions.invoke("resolveAssistedHalloweenSpot", {
        assistedId,
        action: "approve",
      });
      if (["approved", "claimed"].includes(response?.data?.status)) {
        setResult(response.data.spot || result);
        setState(response.data.status === "claimed" ? "claimed" : "approved");
        await queryClient.invalidateQueries({ queryKey: ["myAssistedListings"] });
        await queryClient.invalidateQueries({ queryKey: ["halloweenLocations"] });
      } else {
        setMessage(response?.data?.error || "Could not approve this Halloween Spot.");
      }
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "Could not approve this Halloween Spot.");
    } finally {
      setActing(false);
    }
  };

  const loginToApprove = () => {
    sessionStorage.setItem("assisted_halloween_search_address", address);
    sessionStorage.setItem("yardit_halloween_fast_onboarding", "true");
    base44.auth.redirectToLogin(`${window.location.origin}/spooky?resume=1`);
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("resume") !== "1") return;
    const saved = sessionStorage.getItem("assisted_halloween_search_address");
    sessionStorage.removeItem("assisted_halloween_search_address");
    if (saved) findHouse(null, saved);
  }, []);

  const verifyAndApprove = async (addressPayload) => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!cleanFirst || !cleanLast) {
      setMessage("Enter your first and last name to continue.");
      return;
    }
    setActing(true);
    setMessage("");
    try {
      const updated = await base44.auth.updateMe({
        first_name: cleanFirst,
        last_name: cleanLast,
        ...addressPayload,
      });
      setHomeUser(updated);

      const claimed = await base44.functions.invoke("resolveAssistedHalloweenSpot", {
        assistedId,
        action: "approve_and_claim",
      });
      if (claimed.data?.status !== "claimed") {
        setHomeStatus(claimed.data?.status || "address_mismatch");
        setMessage(claimed.data?.error || "We could not verify this property for your account.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["myAssistedListings"] });
      await queryClient.invalidateQueries({ queryKey: ["myListings"] });
      await queryClient.invalidateQueries({ queryKey: ["halloweenLocations"] });
      sessionStorage.setItem("yardit_halloween_fast_onboarding", "true");
      navigate(createPageUrl("HalloweenSpotDetail") + `?id=${claimed.data.spot.id}`);
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "Could not complete your Halloween Spot setup.");
    } finally {
      setActing(false);
    }
  };

  const claimSpot = async () => {
    if (!assistedId) return;
    setActing(true);
    setMessage("");
    try {
      const response = await base44.functions.invoke("resolveAssistedHalloweenSpot", { assistedId, action: "claim_complete" });
      if (response.data?.status === "claimed") {
        await queryClient.invalidateQueries({ queryKey: ["myAssistedListings"] });
        await queryClient.invalidateQueries({ queryKey: ["myListings"] });
        navigate(createPageUrl("HalloweenSpotDetail") + `?id=${response.data.spot.id}`);
      } else {
        setMessage(response.data?.error || "Verify your home address to claim this spot.");
      }
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "Could not claim this spot.");
    } finally {
      setActing(false);
    }
  };

  const iconKey = result?.halloween_spot_type || "halloween_decorations";
  const iconUrl = HALLOWEEN_ICON_ASSETS[iconKey] || HALLOWEEN_ICON_ASSETS.halloween_decorations;
  const hasCandy = result?.halloween_candy_available === true && !(result?.halloween_tags || []).includes("no_candy_here");

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#4c1d95_0%,#1e1b4b_38%,#020617_76%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-30 bg-[radial-gradient(circle_at_10%_20%,rgba(249,115,22,.5),transparent_18%),radial-gradient(circle_at_90%_15%,rgba(168,85,247,.45),transparent_22%)]" />
      <div className="relative mx-auto max-w-xl px-4 py-8 sm:py-12">
        <div className="text-center">
          <div className="text-6xl drop-shadow-lg">🎃</div>
          <p className="mt-2 text-xs font-black tracking-[.32em] text-orange-300">YARDIT HALLOWEEN</p>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Was your spooky house added to Yardit?</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-purple-100/80">Enter your address to reveal your free Halloween Spot. Approval and claiming require a verified Yardit home address.</p>
        </div>

        {state === "search" && (
          <form onSubmit={findHouse} className="mt-8 rounded-3xl border border-orange-400/30 bg-black/25 p-5 shadow-2xl backdrop-blur">
            <label className="text-sm font-black text-orange-100">Find your spooky house</label>
            <div className="mt-2 flex gap-2">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Type your home address" className="h-12 border-white/15 bg-white text-slate-950 placeholder:text-slate-400" />
              <Button type="submit" disabled={searching || !address.trim()} className="h-12 shrink-0 bg-orange-500 px-4 font-black text-purple-950 hover:bg-orange-400">
                {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-purple-200/70">Tip: include your city or ZIP if your street name is common.</p>
          </form>
        )}

        {state === "found" && result && (
          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-orange-400/40 bg-gradient-to-b from-purple-900/70 to-black/55 p-5 shadow-2xl">
              <div className="text-center">
                <Sparkles className="mx-auto h-7 w-7 text-yellow-300" />
                <p className="mt-2 text-sm font-black tracking-widest text-orange-300">🎉 WE FOUND YOUR SPOOKY HOUSE!</p>
                <h2 className="mt-2 text-2xl font-black text-white">Your FREE Halloween icon is already waiting on Yardit.</h2>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/95 p-4 text-slate-900">
                {result.photos?.[0] && <img src={result.photos[0]} alt="" className="mb-4 h-52 w-full rounded-2xl object-cover" />}
                <div className="flex gap-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-purple-950"><img src={iconUrl} alt="" className="h-16 w-16 object-contain" /></div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black">{result.title}</h2>
                    <p className="mt-1 text-sm font-bold text-purple-700">{getHalloweenSpotTypeLabel(result)}</p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{result.address}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  {result.halloween_start_date && <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-purple-900"><CalendarDays className="h-3 w-3" />{result.halloween_start_date}</span>}
                  {result.halloween_start_time && <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-orange-900"><Clock3 className="h-3 w-3" />{formatTime(result.halloween_start_time)}{result.halloween_end_time ? ` – ${formatTime(result.halloween_end_time)}` : ""}</span>}
                  {hasCandy && <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2.5 py-1 text-pink-900"><Candy className="h-3 w-3" />Candy</span>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-300/25 bg-gradient-to-r from-orange-500/10 to-purple-500/10 p-4 text-center">
              <p className="text-sm font-black text-orange-200">YOUR HALLOWEEN SPOT IS RESERVED 🎃</p>
              <p className="mt-2 font-black">Families nearby will be able to discover your display on the Yardit Halloween map.</p>
              <p className="mt-1 text-xs text-purple-200">Approve it to make your spot official. It only takes a moment.</p>
            </div>

            {homeStatus === "checking" && <p className="text-center text-sm text-purple-100">Checking your account…</p>}
            {homeStatus === "unauthorized" && <div className="space-y-2">
              <p className="text-center text-sm font-semibold text-purple-100">Your spot is ready. One quick homeowner check keeps someone else from approving it.</p>
              <Button onClick={loginToApprove} className="w-full bg-orange-500 text-purple-950">Already have a Yardit account? Log In to Approve</Button>
              <Button onClick={loginToApprove} variant="outline" className="w-full border-white/20 bg-transparent text-white">Don't have an account? Sign Up to Approve</Button>
            </div>}
            {homeStatus === "needs_address_verification" && homeUser && (
              <div className="space-y-3 rounded-2xl bg-white p-4 text-slate-900">
                <div>
                  <h3 className="text-lg font-black text-slate-900">One quick step and your spot is yours 🎃</h3>
                  <p className="mt-1 text-xs text-slate-600">Add your name and confirm your home address. We’ll approve and claim the spot automatically.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">First name</label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Last name</label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="bg-white text-slate-900" />
                  </div>
                </div>
                <SetupAddressVerification
                  user={homeUser}
                  isVerified={false}
                  onVerified={verifyAndApprove}
                  title="Confirm your home address"
                  description="This confirms you belong to this property and protects your Halloween Spot."
                  buttonLabel="Confirm My Home & Keep My Spot 🎃"
                />
              </div>
            )}
            {homeStatus === "address_mismatch" && <p className="text-center text-sm text-orange-200">This Halloween Spot can only be approved by a Yardit account verified at this property.</p>}
            {homeStatus === "verified" && <Button onClick={async () => {
              setActing(true);
              setMessage("");
              try {
                const cleanFirst = firstName.trim() || homeUser?.first_name || "";
                const cleanLast = lastName.trim() || homeUser?.last_name || "";
                if (!cleanFirst || !cleanLast) {
                  setMessage("Enter your first and last name to continue.");
                  return;
                }
                await base44.auth.updateMe({ first_name: cleanFirst, last_name: cleanLast });
                const claimed = await base44.functions.invoke("resolveAssistedHalloweenSpot", { assistedId, action: "approve_and_claim" });
                if (claimed.data?.status === "claimed") {
                  await queryClient.invalidateQueries({ queryKey: ["myAssistedListings"] });
                  await queryClient.invalidateQueries({ queryKey: ["myListings"] });
                  await queryClient.invalidateQueries({ queryKey: ["halloweenLocations"] });
                  sessionStorage.setItem("yardit_halloween_fast_onboarding", "true");
                  navigate(createPageUrl("HalloweenSpotDetail") + `?id=${claimed.data.spot.id}`);
                } else {
                  setMessage(claimed.data?.error || "Could not finish your Halloween Spot setup.");
                }
              } catch (error) {
                setMessage(error?.response?.data?.error || error?.message || "Could not finish your Halloween Spot setup.");
              } finally {
                setActing(false);
              }
            }} disabled={acting} className="h-14 w-full bg-orange-500 text-base font-black text-purple-950 hover:bg-orange-400">
              {acting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              Keep My Spot & View It 🎃
            </Button>}
            <div className="pt-6 text-center">
              <button
                type="button"
                onClick={() => { setState("search"); setResult(null); setAssistedId(""); setHomeStatus("checking"); }}
                className="text-sm font-semibold text-slate-400 underline decoration-slate-600 underline-offset-4 transition hover:text-slate-200"
              >
                That isn’t my house
              </button>
            </div>
          </div>
        )}

        {state === "approved" && result && (
          <div className="mt-8 rounded-3xl border border-emerald-300/30 bg-emerald-500/10 p-6 text-center shadow-2xl">
            <div className="text-6xl">🎃</div>
            <CheckCircle2 className="mx-auto mt-3 h-12 w-12 text-emerald-300" />
            <h2 className="mt-3 text-3xl font-black">You're Officially on the Map! 🎃</h2>
            <p className="mt-3 text-sm text-slate-200">Your Halloween Spot is approved and ready to help families discover spooky homes nearby.</p>
            <div className="mt-5 rounded-2xl bg-white/10 p-4">
              <p className="font-black text-orange-200">Want to make it yours?</p>
              <p className="mt-1 text-xs text-purple-100">Create your free Yardit account to edit photos, hours, candy availability, description, and more.</p>
            </div>
            <Button onClick={homeStatus === "verified" ? claimSpot : loginToApprove} disabled={acting || homeStatus === "address_mismatch"} className="mt-5 h-14 w-full bg-orange-500 text-base font-black text-purple-950 hover:bg-orange-400">Claim & Edit This Spot</Button>
            {homeStatus === "needs_address_verification" && homeUser && <div className="mt-3 rounded-2xl bg-white p-1 text-slate-900"><SetupAddressVerification user={homeUser} isVerified={false} onVerified={verifyAndApprove} /></div>}
            {homeStatus === "address_mismatch" && <p className="mt-3 text-sm text-orange-200">Your verified Yardit home address must match this property to claim it.</p>}
            <Button onClick={() => navigate(createPageUrl("HalloweenSpotDetail") + `?id=${result.id}`)} variant="outline" className="mt-2 w-full border-white/20 bg-transparent text-white hover:bg-white/10">View My Halloween Spot</Button>
            <p className="mt-4 text-xs font-semibold text-purple-200">Help make your neighborhood the place to be this Halloween.</p>
          </div>
        )}

        {state === "claimed" && (
          <div className="mt-8 rounded-3xl border border-purple-300/20 bg-white/10 p-6 text-center">
            <Ghost className="mx-auto h-14 w-14 text-purple-200" />
            <h2 className="mt-3 text-2xl font-black">This spooky house is already claimed.</h2>
            <p className="mt-2 text-sm text-purple-100">{message || "Its owner already has control of this Halloween Spot."}</p>
          </div>
        )}

        {message && state !== "claimed" && <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-500/10 p-3 text-center text-sm text-orange-100">{message}</div>}

        {state === "search" && suggestions.length > 0 && (
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-center text-sm font-black text-orange-200">Did you mean one of these?</p>
            <div className="mt-3 space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.assistedId || suggestion.address}
                  type="button"
                  onClick={() => findHouse(null, suggestion.address)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left transition hover:bg-white/15"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                    <div>
                      <p className="text-sm font-black text-white">{suggestion.street || suggestion.address}</p>
                      {(suggestion.city || suggestion.state || suggestion.zip) && (
                        <p className="mt-0.5 text-xs text-purple-200">{[suggestion.city, suggestion.state, suggestion.zip].filter(Boolean).join(", ")}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {state === "search" && (
          <div className="mt-6 text-center">
            <button onClick={() => navigate(createPageUrl("CreateListing") + "?type=halloween_spot")} className="text-sm font-bold text-orange-300 underline underline-offset-4">My address isn’t listed — add my Halloween Spot free</button>
          </div>
        )}
      </div>
    </div>
  );
}