import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock, XCircle, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AssistedListingOwnerView from "@/components/assisted/AssistedListingOwnerView";

function DeclinedScreen({ navigate }) {
  return (
    <div className="text-center py-12 px-4">
      <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">Listing Declined</h2>
      <p className="text-gray-600 mb-4">This promotional listing has been declined and is no longer accessible.</p>
      <p className="text-sm text-gray-500 mb-6">Want to get your sale on the map? You can create your own free Yardit listing anytime.</p>
      <Button
        onClick={() => navigate(createPageUrl("CreateListing"))}
        className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white font-semibold py-3"
      >
        Create Your Own Listing
      </Button>
    </div>
  );
}

function ExpiredScreen({ navigate }) {
  return (
    <div className="text-center py-12 px-4">
      <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">This Link Has Expired</h2>
      <p className="text-gray-600 mb-4">The 24-hour window for this promotional listing has passed.</p>
      <p className="text-sm text-gray-500 mb-6">You can still get your sale on the map — create your own free Yardit listing in minutes.</p>
      <Button
        onClick={() => navigate(createPageUrl("CreateListing"))}
        className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white font-semibold py-3"
      >
        Create Your Own Free Listing
      </Button>
      <button
        onClick={() => navigate(createPageUrl("Home"))}
        className="mt-3 text-sm text-gray-500 underline"
      >
        Browse Yardit instead
      </button>
    </div>
  );
}

export default function AssistedListingApprovalPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  // autoclaim=1 means user just returned from login — approve+claim was already stored
  const autoclaim = params.get("autoclaim") === "1";

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null);
  const [listing, setListing] = useState(null);
  const [assisted, setAssisted] = useState(null);
  const [isActing, setIsActing] = useState(false);
  const [claimError, setClaimError] = useState(null);

  useEffect(() => {
    if (!token) { setState("not_found"); setLoading(false); return; }
    (async () => {
      try {
        const res = await base44.functions.invoke("resolveAssistedListing", { token });
        const d = res.data;

        // Detect post-login return: either ?autoclaim=1 in URL or saved token in sessionStorage
        const isReturningFromLogin = autoclaim || sessionStorage.getItem("assisted_claim_token") === token;

        if (isReturningFromLogin && (d.status === "approved" || d.status === "ok" || d.status === "assisted_active_unclaimed")) {
          setState("autoclaiming");
          setListing(d.listing);
          setAssisted(d.assisted);
          setLoading(false);

          // Must be authenticated at this point
          const isAuth = await base44.auth.isAuthenticated();
          if (!isAuth) {
            // Not logged in yet — show owner view so they can try again
            setState("approved");
            return;
          }

          const user = await base44.auth.me();
          if (!user?.id) {
            setState("approved");
            return;
          }

          try {
            const claimRes = await base44.functions.invoke("resolveAssistedListing", {
              token,
              action: "claim_complete",
              claimUserId: user.id,
            });
            if (claimRes.data?.status === "claimed") {
              sessionStorage.removeItem("assisted_claim_token");
              navigate(createPageUrl("MyListings"));
            } else {
              // Backend returned unexpected status — show error
              setClaimError(claimRes.data?.error || "Could not complete claim. Please try again.");
              setState("approved");
            }
          } catch (err) {
            setClaimError(err?.message || "Could not complete claim. Please try again.");
            setState("approved");
          }
          return;
        }

        setState(d.status);
        setListing(d.listing);
        setAssisted(d.assisted);
      } catch {
        setState("not_found");
      }
      setLoading(false);
    })();
  }, [token]);

  // Approve button handler — if logged in, approve+claim in one step; if logged out, approve then show owner view with login CTA
  const handleApprove = async () => {
    setIsActing(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      let claimUserId = null;
      if (isAuth) {
        const user = await base44.auth.me();
        claimUserId = user?.id || null;
      }

      const res = await base44.functions.invoke("resolveAssistedListing", {
        token,
        action: "approve",
        claimUserId,
      });
      const d = res.data;
      if (d.listing) setListing(d.listing);
      if (d.assisted) setAssisted(d.assisted);

      if (d.status === "claimed") {
        // Logged-in: approved + claimed → go straight to My Listings
        navigate(createPageUrl("MyListings"));
      } else {
        // Logged-out: approved, now show owner view with login CTA
        setState("approved");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setIsActing(false);
  };

  const handleDecline = async () => {
    setIsActing(true);
    try {
      const res = await base44.functions.invoke("resolveAssistedListing", { token, action: "decline" });
      const d = res.data;
      if (d.listing) setListing(d.listing);
      if (d.assisted) setAssisted(d.assisted);
      setState("declined");
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setIsActing(false);
  };

  if (loading || state === "autoclaiming") {
    return (
      <div className="min-h-screen bg-[#F3E6CF] flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#5DADA5]" />
        {state === "autoclaiming" && (
          <p className="text-[#2C4F4E] font-semibold text-center">Claiming your listing…</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3E6CF]">
      {/* Header */}
      <div className="bg-[#5DADA5] border-b-2 border-[#2C4F4E] p-4 text-center">
        <p className="text-white text-sm font-semibold tracking-widest">YARDIT</p>
      </div>

      <div className="max-w-md mx-auto p-4 py-6">

        {state === "not_found" && (
          <div className="text-center py-12">
            <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Listing Not Found</h2>
            <p className="text-gray-500 mb-6">This QR code could not be found.</p>
            <Button onClick={() => navigate(createPageUrl("Home"))} variant="outline">Go Home</Button>
          </div>
        )}

        {state === "declined" && <DeclinedScreen navigate={navigate} />}
        {state === "expired" && <ExpiredScreen navigate={navigate} />}

        {/* Pending seller approval — first scan */}
        {state === "ok" && assisted && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center border border-[#5DADA5]/30">
              <div className="text-4xl mb-3">🎁</div>
              <h1 className="text-xl font-bold text-[#2C4F4E] mb-3">
                You've Been Gifted a Free Promotional Listing by Yardit
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                A Yardit team member created a free promotional yard sale listing for this address with your permission. Approving this listing helps make your sale more visible to local shoppers using Yardit.
              </p>
            </div>

            {listing?.location_source === "map_pin" && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">This location was selected by a Yardit team member.</span> Please confirm this is your sale location before approving.
                </p>
              </div>
            )}

            {listing && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                {listing.photoUrls?.length > 0 && (
                  <img src={listing.photoUrls[0]} alt="" className="w-full h-40 object-cover rounded-lg" />
                )}
                <h3 className="font-bold text-lg text-[#2C4F4E]">{listing.title}</h3>
                {(listing.display_address || listing.addressText) && (
                  <p className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {listing.display_address || listing.addressText}{listing.city ? `, ${listing.city}` : ""}{listing.state ? `, ${listing.state}` : ""}
                  </p>
                )}
                {listing.startDateTime && (
                  <p className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {new Date(listing.startDateTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                )}
                {listing.description && <p className="text-sm text-gray-600">{listing.description}</p>}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleApprove}
                disabled={isActing}
                size="lg"
                className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white py-4 text-base font-semibold shadow-md"
              >
                {isActing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                Approve &amp; View
              </Button>

              <Button
                disabled={isActing}
                size="lg"
                variant="outline"
                className="w-full py-4 text-base border-2 border-[#2C4F4E] text-[#2C4F4E] hover:bg-[#2C4F4E]/5"
                onClick={() => setState("decide_later")}
              >
                <Clock className="w-5 h-5 mr-2" />
                Decide Later
              </Button>

              <div className="border-t pt-3 flex flex-col items-center">
                <button
                  onClick={handleDecline}
                  disabled={isActing}
                  className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 py-1"
                >
                  Decline Listing
                </button>
              </div>
            </div>
          </div>
        )}

        {state === "decide_later" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center border border-amber-200">
              <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-[#2C4F4E] mb-2">No Problem!</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your listing will stay on hold. Scan this QR code again before it expires to approve or manage it.
              </p>
              {assisted?.assisted_qr_expires_at && (
                <p className="text-xs text-amber-700 mt-3 font-medium">
                  Expires: {new Date(assisted.assisted_qr_expires_at).toLocaleString()}
                </p>
              )}
            </div>
            <Button onClick={() => setState("ok")} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white font-semibold">
              ← Back to Listing
            </Button>
            <Button onClick={() => navigate(createPageUrl("Home"))} variant="outline" className="w-full">
              Go to Yardit
            </Button>
          </div>
        )}

        {/* Approved — show single-listing owner view (logged-out path only) */}
        {["approved", "assisted_active_unclaimed"].includes(state) && (
          listing
            ? <AssistedListingOwnerView listing={listing} token={token} claimError={claimError} />
            : (
              <div className="text-center py-12 px-4">
                <XCircle className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-gray-700 mb-2">We couldn't load this listing.</h2>
                <p className="text-sm text-gray-500 mb-6">Please scan the QR code again to try once more.</p>
                <Button onClick={() => window.location.reload()} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white font-semibold">
                  Try Again
                </Button>
              </div>
            )
        )}

      </div>
    </div>
  );
}