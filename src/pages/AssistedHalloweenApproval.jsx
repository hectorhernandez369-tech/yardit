import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock, XCircle, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AssistedHalloweenApproval() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const autoclaim = params.get("autoclaim") === "1";
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [spot, setSpot] = useState(null);
  const [assisted, setAssisted] = useState(null);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("not_found");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await base44.functions.invoke("resolveAssistedHalloweenSpot", { token });
        const data = res.data;
        setSpot(data.spot || null);
        setAssisted(data.assisted || null);

        const returning = autoclaim || sessionStorage.getItem("assisted_halloween_claim_token") === token;
        if (returning && ["approved", "assisted_active_unclaimed"].includes(data.status)) {
          const isAuth = await base44.auth.isAuthenticated();
          if (isAuth) {
            const me = await base44.auth.me();
            const claim = await base44.functions.invoke("resolveAssistedHalloweenSpot", {
              token,
              action: "claim_complete",
              claimUserId: me.id,
            });
            if (claim.data?.status === "claimed") {
              sessionStorage.removeItem("assisted_halloween_claim_token");
              navigate(createPageUrl("HalloweenSpotDetail") + `?id=${claim.data.spot.id}`);
              return;
            }
          }
        }

        setStatus(data.status);
      } catch (err) {
        setError(err?.message || "Could not load this Halloween Spot.");
        setStatus("not_found");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, autoclaim, navigate]);

  const approve = async () => {
    setActing(true);
    setError("");
    try {
      const isAuth = await base44.auth.isAuthenticated();
      let claimUserId = null;
      if (isAuth) claimUserId = (await base44.auth.me())?.id || null;
      const res = await base44.functions.invoke("resolveAssistedHalloweenSpot", {
        token,
        action: "approve",
        claimUserId,
      });
      setSpot(res.data?.spot || spot);
      setAssisted(res.data?.assisted || assisted);
      if (res.data?.status === "claimed") {
        navigate(createPageUrl("HalloweenSpotDetail") + `?id=${res.data.spot.id}`);
      } else {
        setStatus("approved");
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not approve this Halloween Spot.");
    } finally {
      setActing(false);
    }
  };

  const decline = async () => {
    setActing(true);
    try {
      await base44.functions.invoke("resolveAssistedHalloweenSpot", { token, action: "decline" });
      setStatus("declined");
      setSpot(null);
    } finally {
      setActing(false);
    }
  };

  const loginToClaim = () => {
    sessionStorage.setItem("assisted_halloween_claim_token", token);
    const returnUrl = `${window.location.origin}/assisted-halloween?token=${encodeURIComponent(token)}&autoclaim=1`;
    base44.auth.redirectToLogin(returnUrl);
  };

  if (loading) {
    return <div className="min-h-screen bg-purple-950 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-slate-950 text-white">
      <div className="max-w-md mx-auto p-5 py-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🎃</div>
          <p className="text-orange-300 text-xs font-black tracking-[0.25em]">YARDIT HALLOWEEN</p>
        </div>

        {["not_found", "spot_missing"].includes(status) && (
          <div className="rounded-2xl bg-white/10 border border-white/15 p-6 text-center">
            <XCircle className="w-14 h-14 mx-auto mb-3 text-slate-300" />
            <h1 className="text-xl font-bold">Halloween Spot Not Found</h1>
            <p className="text-sm text-slate-300 mt-2">{error || "This claim link could not be loaded."}</p>
          </div>
        )}

        {status === "expired" && (
          <div className="rounded-2xl bg-white/10 border border-amber-400/30 p-6 text-center">
            <Clock className="w-14 h-14 mx-auto mb-3 text-amber-300" />
            <h1 className="text-xl font-bold">This Claim Link Expired</h1>
            <p className="text-sm text-slate-300 mt-2">Ask the Yardit team member who created the spot for a fresh QR code.</p>
          </div>
        )}

        {status === "declined" && (
          <div className="rounded-2xl bg-white/10 border border-red-400/30 p-6 text-center">
            <XCircle className="w-14 h-14 mx-auto mb-3 text-red-300" />
            <h1 className="text-xl font-bold">Halloween Spot Declined</h1>
            <p className="text-sm text-slate-300 mt-2">This assisted spot is no longer public.</p>
          </div>
        )}

        {status === "ok" && spot && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/10 border border-orange-400/30 p-5">
              <h1 className="text-xl font-black">Yardit added your Halloween Spot 🎃</h1>
              <p className="text-sm text-slate-300 mt-2">Approve it to put this exact property on the Halloween map. If you are signed in, ownership transfers to your account immediately.</p>
            </div>
            <div className="rounded-2xl bg-white text-slate-900 p-4 space-y-2">
              {spot.photos?.[0] && <img src={spot.photos[0]} alt="" className="w-full h-44 object-cover rounded-xl" />}
              <h2 className="text-lg font-bold">{spot.title}</h2>
              <p className="flex items-start gap-2 text-sm text-slate-600"><MapPin className="w-4 h-4 mt-0.5 shrink-0" />{spot.address}</p>
              {spot.halloween_start_date && <p className="flex items-center gap-2 text-sm text-slate-600"><Calendar className="w-4 h-4 shrink-0" />{spot.halloween_start_date} through {spot.halloween_end_date}</p>}
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button onClick={approve} disabled={acting} className="w-full bg-orange-500 hover:bg-orange-400 text-purple-950 font-black h-12">
              {acting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}Approve Halloween Spot
            </Button>
            <Button onClick={decline} disabled={acting} variant="outline" className="w-full border-white/30 bg-transparent text-white hover:bg-white/10">Decline</Button>
          </div>
        )}

        {status === "approved" && spot && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-500/15 border border-emerald-300/30 p-5 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
              <h1 className="text-xl font-black">Your Halloween Spot is live!</h1>
              <p className="text-sm text-slate-300 mt-2">Sign in or create your Yardit account to take over this same spot and edit it yourself.</p>
            </div>
            <Button onClick={loginToClaim} className="w-full bg-orange-500 hover:bg-orange-400 text-purple-950 font-black h-12">Sign In & Take Over Spot</Button>
            <Button onClick={() => navigate(createPageUrl("HalloweenSpotDetail") + `?id=${spot.id}`)} variant="outline" className="w-full border-white/30 bg-transparent text-white hover:bg-white/10">View Spot</Button>
          </div>
        )}

        {status === "claimed" && spot && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-300/30 p-6 text-center">
            <CheckCircle className="w-14 h-14 mx-auto mb-3 text-emerald-300" />
            <h1 className="text-xl font-black">This Halloween Spot has been claimed.</h1>
            <Button onClick={() => navigate(createPageUrl("HalloweenSpotDetail") + `?id=${spot.id}`)} className="mt-5 w-full bg-orange-500 hover:bg-orange-400 text-purple-950 font-black">View Halloween Spot</Button>
          </div>
        )}
      </div>
    </div>
  );
}