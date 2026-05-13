import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock, XCircle, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

function formatDate(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function formatTime(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function DeclinedScreen({ navigate }) {
  return (
    <div className="text-center py-12 px-4">
      <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">Listing Declined</h2>
      <p className="text-gray-600 mb-6">This promotional listing was declined. You can still create your own Yardit listing.</p>
      <Button onClick={() => navigate(createPageUrl("CreateListing"))} className="bg-[#5DADA5] hover:bg-[#4A9B93]">
        Create Your Own Listing
      </Button>
    </div>
  );
}

function ExpiredScreen({ navigate }) {
  return (
    <div className="text-center py-12 px-4">
      <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">Link Expired</h2>
      <p className="text-gray-600 mb-6">This promotional listing link has expired. You can still create your own Yardit listing.</p>
      <Button onClick={() => navigate(createPageUrl("CreateListing"))} className="bg-[#5DADA5] hover:bg-[#4A9B93]">
        Create Your Own Listing
      </Button>
    </div>
  );
}

function ListingCard({ listing }) {
  if (!listing) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      {listing.photoUrls?.length > 0 && (
        <img src={listing.photoUrls[0]} alt="" className="w-full h-48 object-cover rounded-lg mb-3" />
      )}
      <h3 className="font-bold text-lg text-[#2C4F4E]">{listing.title}</h3>
      {listing.addressText && (
        <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          {listing.addressText}, {listing.city}, {listing.state}
        </p>
      )}
      {listing.startDateTime && (
        <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(listing.startDateTime)} · {formatTime(listing.startDateTime)} – {formatTime(listing.endDateTime)}
        </p>
      )}
      {listing.description && (
        <p className="text-sm text-gray-600 mt-2">{listing.description}</p>
      )}
    </div>
  );
}

function LockedActionModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="font-bold text-lg text-[#2C4F4E] mb-2">Create an Account to Make Changes</h3>
        <p className="text-sm text-gray-600 mb-5">Create an account to claim this listing and make changes, relist, upgrade, or add photos.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Not Now</Button>
          <Button onClick={() => base44.auth.redirectToLogin()} className="flex-1 bg-[#5DADA5] hover:bg-[#4A9B93]">Sign Up / Log In</Button>
        </div>
      </div>
    </div>
  );
}

function ApprovedUnclaimedView({ listing, onSignUpToEdit, navigate }) {
  const [showLockedModal, setShowLockedModal] = useState(false);
  const shareUrl = `${window.location.origin}${createPageUrl("ListingDetail")}?id=${listing?.id}`;

  const handleShare = async () => {
    if (navigator.share) {
      navigator.share({ title: listing?.title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
        <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Your listing is live!</p>
          <p className="text-sm text-green-700 mt-0.5">Share this with friends, neighbors, and shoppers nearby.</p>
        </div>
      </div>

      <ListingCard listing={listing} />

      <Button onClick={handleShare} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">
        Share Listing
      </Button>

      {/* Locked actions */}
      <div className="space-y-2">
        {["Edit Details", "Add Photos", "Relist / Upgrade"].map((action) => (
          <button
            key={action}
            onClick={() => setShowLockedModal(true)}
            className="w-full text-left p-3 rounded-lg border border-gray-200 text-sm text-gray-500 flex items-center justify-between hover:bg-gray-50"
          >
            🔒 {action}
            <span className="text-xs text-gray-400">Account required</span>
          </button>
        ))}
      </div>

      <div className="border-t pt-4">
        <Button onClick={onSignUpToEdit} variant="outline" className="w-full border-[#5DADA5] text-[#5DADA5] hover:bg-[#5DADA5]/5">
          Sign Up to Claim & Edit This Listing
        </Button>
      </div>

      <LockedActionModal open={showLockedModal} onClose={() => setShowLockedModal(false)} />
    </div>
  );
}

export default function AssistedListingApprovalPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null); // ok | declined | expired | not_found | approved | claim_pending
  const [listing, setListing] = useState(null);
  const [assisted, setAssisted] = useState(null);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    if (!token) { setState("not_found"); setLoading(false); return; }
    (async () => {
      try {
        const res = await base44.functions.invoke("resolveAssistedListing", { token });
        const d = res.data;
        setState(d.status);
        setListing(d.listing);
        setAssisted(d.assisted);
      } catch {
        setState("not_found");
      }
      setLoading(false);
    })();
  }, [token]);

  // Try to auto-claim if user is now logged in and we previously set claim_pending
  useEffect(() => {
    if (state !== "claim_pending") return;
    (async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return;
      const user = await base44.auth.me();
      if (!user) return;
      // Attempt claim_complete
      try {
        const res = await base44.functions.invoke("resolveAssistedListing", {
          token,
          action: "claim_complete",
          claimUserId: user.id,
        });
        if (res.data?.status === "claimed") {
          navigate(createPageUrl("MyListings"));
        }
      } catch {}
    })();
  }, [state, token]);

  const doAction = async (action) => {
    setIsActing(true);
    try {
      const res = await base44.functions.invoke("resolveAssistedListing", { token, action });
      const d = res.data;
      setState(d.status === "approved" ? "approved" : d.status === "claim_pending" ? "claim_pending" : d.status);
      if (d.listing) setListing(d.listing);
      if (d.assisted) setAssisted(d.assisted);

      if (action === "claim_pending") {
        // Store token in session so post-login we can complete claim
        sessionStorage.setItem("assisted_claim_token", token);
        base44.auth.redirectToLogin(`${window.location.origin}/assisted-listing?token=${token}`);
      }
      if (action === "decline") {
        setState("declined");
      }
    } catch (err) {
      alert("Something went wrong. Please try again.");
    }
    setIsActing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3E6CF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5DADA5]" />
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

        {state === "ok" && assisted && (
          <div className="space-y-5">
            {/* Gift message */}
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center border border-[#5DADA5]/30">
              <div className="text-4xl mb-3">🎁</div>
              <h1 className="text-xl font-bold text-[#2C4F4E] mb-3">
                You've Been Gifted a Free Promotional Listing by Yardit
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                A Yardit team member created a free promotional yard sale listing for this address with your permission. Approving this listing helps make your sale more visible to local shoppers using Yardit.
              </p>
            </div>

            {listing && <ListingCard listing={listing} />}

            <div className="space-y-3">
              {/* Large primary actions */}
              <Button
                onClick={() => doAction("approve")}
                disabled={isActing}
                size="lg"
                className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white py-4 text-base font-semibold"
              >
                {isActing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                Approve & View Listing
              </Button>

              <Button
                disabled={isActing}
                size="lg"
                variant="outline"
                className="w-full py-4 text-base border-2 border-[#2C4F4E] text-[#2C4F4E]"
                onClick={() => setState("decide_later")}
              >
                <Clock className="w-5 h-5 mr-2" />
                Decide Later
              </Button>

              <div className="border-t pt-3 flex gap-3">
                {/* Small secondary actions */}
                <Button
                  onClick={() => doAction("claim_pending")}
                  disabled={isActing}
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-[#5DADA5] hover:bg-[#5DADA5]/10"
                >
                  Sign Up to Edit
                </Button>
                <Button
                  onClick={() => doAction("decline")}
                  disabled={isActing}
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-red-500 hover:bg-red-50"
                >
                  Decline Listing
                </Button>
              </div>
            </div>
          </div>
        )}

        {state === "decide_later" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center border border-amber-200">
              <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-[#2C4F4E] mb-2">No Problem!</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                This promotional listing will be saved temporarily. You have 24 hours from the time it was created to approve and view it.
              </p>
              {assisted?.assisted_qr_expires_at && (
                <p className="text-xs text-amber-700 mt-3 font-medium">
                  Expires: {new Date(assisted.assisted_qr_expires_at).toLocaleString()}
                </p>
              )}
            </div>
            <Button onClick={() => navigate(createPageUrl("Home"))} variant="outline" className="w-full">
              Go to Yardit
            </Button>
          </div>
        )}

        {state === "approved" && listing && (
          <ApprovedUnclaimedView
            listing={listing}
            onSignUpToEdit={() => doAction("claim_pending")}
            navigate={navigate}
          />
        )}

        {state === "claim_pending" && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-[#5DADA5] mx-auto mb-4" />
            <p className="text-gray-600">Redirecting to sign up…</p>
          </div>
        )}

        {state === "claimed" && (
          <div className="text-center py-12">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#2C4F4E] mb-2">Listing Claimed!</h2>
            <p className="text-gray-600 mb-6">Your listing is now in My Listings. You can now edit, relist, and manage it.</p>
            <Button onClick={() => navigate(createPageUrl("MyListings"))} className="bg-[#5DADA5] hover:bg-[#4A9B93]">
              Go to My Listings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}