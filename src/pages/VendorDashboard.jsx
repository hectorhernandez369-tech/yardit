import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, ArrowLeft, Loader2, Map, Lock, Users, Edit2, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import BusinessHero from "@/components/vendor/BusinessHero";
import QuickActions from "@/components/vendor/QuickActions";
import FeedComposer from "@/components/vendor/FeedComposer";
import FeedCard from "@/components/vendor/FeedCard";
import TierSelector from "@/components/vendor/TierSelector";
import OnboardingFlow from "@/components/vendor/OnboardingFlow";
import NotificationBell from "@/components/vendor/NotificationBell";
import AuthorizedUsersSection from "@/components/vendor/AuthorizedUsersSection";
import TierInfoCard from "@/components/vendor/TierInfoCard";
import MyTrucksSection from "@/components/vendor/MyTrucksSection";
import CheckInProfileEditor from "@/components/vendor/CheckInProfileEditor";
import CheckInHistory from "@/components/vendor/CheckInHistory";

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState("page");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUserEmail(u?.email || "");
      setUserData(u);
    });
  }, []);

  // Fetch or create vendor profile
  const { data: profiles, isLoading: loadingProfile } = useQuery({
    queryKey: ["vendorProfile"],
    queryFn: () => base44.entities.VendorProfile.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  const profile = profiles?.[0];

  // Fetch or create vendor account
  const { data: vendorAccounts, isLoading: loadingAccount } = useQuery({
    queryKey: ["vendorAccount"],
    queryFn: () => base44.entities.VendorAccount.filter({ owner_user_id: userEmail }),
    enabled: !!userEmail,
  });

  const vendorAccount = vendorAccounts?.[0];

  const createProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.VendorProfile.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorProfile"] }),
  });

  const createAccountMutation = useMutation({
    mutationFn: (data) => base44.entities.VendorAccount.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorAccount"] }),
  });

  // Show onboarding for brand new vendors
  useEffect(() => {
    if (!loadingProfile && userEmail && profiles && profiles.length === 0) {
      setShowOnboarding(true);
    }
  }, [loadingProfile, userEmail, profiles]);

  // Auto-create vendor account if it doesn't exist
  useEffect(() => {
    if (!loadingAccount && userEmail && vendorAccounts && vendorAccounts.length === 0 && profile) {
      createAccountMutation.mutate({
        business_name: profile.business_name || "My Business",
        owner_user_id: userEmail,
        vendor_tier: profile.tier || "starter",
        is_active: true,
      });
    }
  }, [loadingAccount, userEmail, vendorAccounts, profile]);

  const handleOnboardingComplete = (data) => {
    createProfileMutation.mutate({
      business_name: data.business_name || "My Business",
      category: data.category || undefined,
      description: data.description || undefined,
      tier: "starter",
    });
    setShowOnboarding(false);
  };

  // Fetch updates
  const { data: updates = [] } = useQuery({
    queryKey: ["vendorUpdates", profile?.id],
    queryFn: () => base44.entities.VendorUpdate.filter({ vendor_profile_id: profile.id }, "-created_date"),
    enabled: !!profile?.id,
  });

  // Active pin check-ins (new system)
  const { data: activePinCheckIns = [] } = useQuery({
    queryKey: ["activePinCheckIns", vendorAccount?.id],
    queryFn: () => base44.entities.VendorPinCheckIn.filter({ vendor_account_id: vendorAccount.id, status: "live" }),
    enabled: !!vendorAccount?.id,
    refetchInterval: 60000,
  });
  const now = new Date();
  const activePinCheckIn = activePinCheckIns.find(
    (c) => c.checkin_end_time && new Date(c.checkin_end_time) > now
  );

  // Mutations
  const postUpdateMutation = useMutation({
    mutationFn: (text) => base44.entities.VendorUpdate.create({ vendor_profile_id: profile.id, text, likes: 0, liked_by: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorUpdates"] });
      toast.success("Update posted!");
    },
  });

  const likeMutation = useMutation({
    mutationFn: (update) => {
      const isLiked = update.liked_by?.includes(userEmail);
      const newLikedBy = isLiked
        ? (update.liked_by || []).filter((e) => e !== userEmail)
        : [...(update.liked_by || []), userEmail];
      return base44.entities.VendorUpdate.update(update.id, {
        liked_by: newLikedBy,
        likes: newLikedBy.length,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorUpdates"] }),
  });

  const tierMutation = useMutation({
    mutationFn: async (tier) => {
      await base44.entities.VendorProfile.update(profile.id, { tier });
      if (vendorAccount) {
        await base44.entities.VendorAccount.update(vendorAccount.id, { vendor_tier: tier });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
      queryClient.invalidateQueries({ queryKey: ["vendorAccount"] });
      toast.success("Tier updated!");
    },
  });

  const handleProfileUpdate = (updated) => {
    queryClient.setQueryData(["vendorProfile"], [updated]);
  };

  const startEdit = (field, value) => {
    setEditingField(field);
    setEditValues({ [field]: value });
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const updates = {};
      const fieldToKey = {
        business_name: "business_name",
        phone: "phone",
        full_name: "full_name",
      };
      const key = fieldToKey[editingField];
      
      if (editingField === "full_name") {
        await base44.auth.updateMe({ full_name: editValues[editingField] });
        setUserData({ ...userData, full_name: editValues[editingField] });
      } else {
        updates[key] = editValues[editingField];
        await base44.entities.VendorProfile.update(profile.id, updates);
        queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
      }
      
      toast.success("Updated successfully!");
      setEditingField(null);
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValues({});
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (loadingProfile || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Yardit Header */}
      <header className="sticky top-0 z-30" style={{ background: "linear-gradient(135deg, #4A9E97 0%, #5DADA5 60%, #6BBDB5 100%)" }}>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/" className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-white text-base tracking-tight">Yardit Vendors</span>
            </div>
            <Link
              to="/vendor/map"
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Open Yardit Map"
            >
              <Map className="w-[18px] h-[18px] text-white" />
            </Link>
            <NotificationBell updates={updates} profile={profile} activePinCheckIn={activePinCheckIn} />
            <div className="w-2 h-2 rounded-full" style={{ background: !!activePinCheckIn ? "#4ADE80" : "#ffffff40" }} />
          </div>
          <p className="text-white/60 text-xs font-body pl-10">
            Run your sales. Show your location. Be found.
          </p>
        </div>

        {/* Tabs row */}
        <div className="px-4 pb-0">
          <div className="flex gap-1 overflow-x-auto lg:flex-wrap scrollbar-hide">
            {[
              { id: "page", label: "My Page" },
              { id: "pin", label: "My Trucks / Pins" },
              { id: "history", label: "History" },
              { id: "tier", label: "Tier" },
              { id: "authorized", label: "Authorized Users & Pins" },
              { id: "settings", label: "Settings" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-heading font-semibold whitespace-nowrap transition-all rounded-t-lg ${
                  activeTab === tab.id
                    ? "bg-background text-primary"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 py-5 pb-24">
        <div className="max-w-6xl mx-auto space-y-5">
        {/* PAGE TAB */}
        {activeTab === "page" && (
          <>
            <BusinessHero profile={profile} activeCheckIn={activePinCheckIn} />

            <div className="border-t border-border/40" />

            <QuickActions
              isLive={!!activePinCheckIn}
              activeCheckIn={activePinCheckIn}
              onCheckIn={() => setActiveTab("pin")}
              onEditProfile={() => setActiveTab("profile")}
              onTier={() => setActiveTab("tier")}
            />

            <div className="border-t border-border/40" />

            <div>
              <p className="font-heading font-bold text-sm mb-3 text-foreground">Share an Update</p>
              <FeedComposer onSubmit={(text) => postUpdateMutation.mutate(text)} isSubmitting={postUpdateMutation.isPending} />
            </div>

            {updates.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 px-5 py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-heading font-semibold text-sm">No updates yet</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your customers will see your updates here when you're active.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((u) => (
                  <FeedCard
                    key={u.id}
                    update={u}
                    businessName={profile.business_name}
                    logoUrl={profile.logo_url}
                    onLike={(update) => likeMutation.mutate(update)}
                    currentUserEmail={userEmail}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* MY TRUCKS / PINS TAB */}
        {activeTab === "pin" && (
          vendorAccount ? (
            <MyTrucksSection vendorAccount={vendorAccount} />
          ) : (
            <div className="bg-card rounded-2xl border border-border/50 px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-heading font-semibold text-sm">No Vendor Account Yet</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Set up a Vendor Account to manage trucks and pins.
              </p>
            </div>
          )
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          vendorAccount ? (
            <CheckInHistory vendorAccount={vendorAccount} />
          ) : (
            <div className="bg-card rounded-2xl border border-border/50 px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-heading font-semibold text-sm">No check-ins yet</p>
              <p className="text-xs text-muted-foreground mt-1">Use My Trucks / Pins to manage check-ins.</p>
            </div>
          )
        )}

        {/* TIER TAB */}
        {activeTab === "tier" && (
          <>
            <div>
              <h2 className="font-heading font-bold text-lg">Boost Your Visibility</h2>
              <p className="text-sm text-muted-foreground">Higher tiers appear first and reach more customers.</p>
            </div>
            {vendorAccount && <TierInfoCard profile={profile} vendorAccount={vendorAccount} />}
            <TierSelector
              currentTier={profile.tier}
              onSelect={(tier) => tierMutation.mutate(tier)}
              isSaving={tierMutation.isPending}
            />
          </>
        )}

        {/* AUTHORIZED USERS & PINS TAB */}
        {activeTab === "authorized" && (
          vendorAccount ? (
            <>
              <div>
                <h2 className="font-heading font-bold text-lg">Authorized Users & Pins</h2>
                <p className="text-sm text-muted-foreground">Manage team access and vendor locations</p>
              </div>
              <AuthorizedUsersSection vendorAccount={vendorAccount} />
            </>
          ) : (
            <div className="bg-card rounded-2xl border border-border/50 px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-heading font-semibold text-sm">No Vendor Account Yet</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Set up a Vendor Account to manage authorized users and pins.
              </p>
            </div>
          )
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <>
            <div>
              <h2 className="font-heading font-bold text-lg">Profile & Settings</h2>
            </div>
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="font-heading font-semibold text-sm">Public Profile</p>
                <CheckInProfileEditor profile={profile} onUpdate={handleProfileUpdate} />
              </div>
              <div className="border-t border-border/40" />
              <div className="space-y-3">
                <p className="font-heading font-semibold text-sm">Business Profile</p>
                <div className="bg-card rounded-2xl border shadow-sm divide-y divide-border/50">
                  {/* Business Name */}
                  <div className="px-4 py-3.5">
                    <p className="text-xs text-muted-foreground font-heading mb-2">Business Name</p>
                    {editingField === "business_name" ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValues.business_name || ""}
                          onChange={(e) => setEditValues({ ...editValues, business_name: e.target.value })}
                          className="rounded-lg flex-1"
                        />
                        <Button size="sm" onClick={saveEdit} disabled={savingEdit} className="shrink-0 rounded-lg">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} className="shrink-0 rounded-lg">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{profile.business_name}</p>
                        <Button size="sm" variant="outline" onClick={() => startEdit("business_name", profile.business_name)} className="shrink-0 rounded-lg">
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Phone */}
                  <div className="px-4 py-3.5">
                    <p className="text-xs text-muted-foreground font-heading mb-2">Phone</p>
                    {editingField === "phone" ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValues.phone || ""}
                          onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                          placeholder="Enter phone number"
                          className="rounded-lg flex-1"
                        />
                        <Button size="sm" onClick={saveEdit} disabled={savingEdit} className="shrink-0 rounded-lg">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} className="shrink-0 rounded-lg">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{profile.phone || "Not set"}</p>
                        <Button size="sm" variant="outline" onClick={() => startEdit("phone", profile.phone || "")} className="shrink-0 rounded-lg">
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-border/40" />
              <div className="space-y-3">
                <p className="font-heading font-semibold text-sm">Personal & Contact</p>
                <div className="bg-card rounded-2xl border shadow-sm divide-y divide-border/50">
                  {/* Full Name */}
                  <div className="px-4 py-3.5">
                    <p className="text-xs text-muted-foreground font-heading mb-2">Full Name</p>
                    {editingField === "full_name" ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValues.full_name || ""}
                          onChange={(e) => setEditValues({ ...editValues, full_name: e.target.value })}
                          placeholder="Enter full name"
                          className="rounded-lg flex-1"
                        />
                        <Button size="sm" onClick={saveEdit} disabled={savingEdit} className="shrink-0 rounded-lg">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} className="shrink-0 rounded-lg">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{userData?.full_name || "Not set"}</p>
                        <Button size="sm" variant="outline" onClick={() => startEdit("full_name", userData?.full_name || "")} className="shrink-0 rounded-lg">
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Email (Read-only) */}
                  <div className="px-4 py-3.5">
                    <p className="text-xs text-muted-foreground font-heading mb-0.5">Email</p>
                    <p className="text-sm font-medium text-muted-foreground">{userEmail}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="font-heading font-semibold text-sm">Security</p>
                <button
                  onClick={() => toast.error("Password reset coming soon")}
                  className="w-full flex items-center gap-3 bg-card rounded-xl border p-4 text-left hover:bg-muted/50 transition-colors opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Lock className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-heading">Password</p>
                    <p className="text-sm font-medium">Change your password</p>
                  </div>
                </button>
              </div>
              <div className="border-t border-border/40" />
              <div className="space-y-2">
                <p className="font-heading font-semibold text-sm">Account</p>
                <div className="bg-card rounded-2xl border shadow-sm divide-y divide-border/50">
                  <div className="px-4 py-3.5">
                    <p className="text-xs text-muted-foreground font-heading mb-0.5">Current Tier</p>
                    <p className="text-sm font-medium capitalize">{profile.tier}</p>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-xs text-muted-foreground font-heading mb-0.5">Public Vendor Page</p>
                    <Link to={`/vendor/page/${profile.id}`} className="text-sm text-primary underline">
                      View public page →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </main>


    </div>
  );
}