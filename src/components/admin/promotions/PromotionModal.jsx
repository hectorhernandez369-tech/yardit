import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { ChevronDown, ChevronUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const createPromotion = () => ({
  id: crypto.randomUUID(),
  enabled: true,
  collapsed: false,
  promoType: "",
  discountType: "percentage",
  promoValue: "",
  targetTiers: { free: false, featured: false, premium: false },
  durationType: "count",
  durationValue: "",
});

export default function PromotionModal({ open, onClose, user, listing, adminUser }) {
  const queryClient = useQueryClient();
  const scope = listing ? "listing" : "account";

  const [promotions, setPromotions] = useState([createPromotion()]);
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (open) {
      setPromotions([createPromotion()]);
      setReason("");
      setAdminNotes("");
    }
  }, [open]);

  const targetUserId = user?.id || listing?.ownerUserId;
  const { data: targetUser } = useQuery({
    queryKey: ["user", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      if (user && user.id) return user;
      const res = await base44.entities.User.filter({ id: targetUserId });
      return res[0];
    },
    enabled: !!targetUserId && open,
  });

  const { data: userListings } = useQuery({
    queryKey: ["userListings", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      return await base44.entities.Listing.filter({ ownerUserId: targetUserId }, "-created_date");
    },
    enabled: !!targetUserId && open,
    initialData: [],
  });

  const activeListings = userListings.filter((l) => l.status === "active");
  const pastListings = userListings.filter((l) => l.status !== "active");

  const updatePromotion = (id, patch) => {
    setPromotions((prev) => prev.map((promo) => (promo.id === id ? { ...promo, ...patch } : promo)));
  };

  const updatePromotionTiers = (id, tier, checked) => {
    setPromotions((prev) =>
      prev.map((promo) =>
        promo.id === id
          ? { ...promo, targetTiers: { ...promo.targetTiers, [tier]: checked } }
          : promo
      )
    );
  };

  const addPromotion = () => {
    setPromotions((prev) => [...prev.map((promo) => ({ ...promo, collapsed: true })), createPromotion()]);
  };

  const removePromotion = (id) => {
    setPromotions((prev) => {
      if (prev.length === 1) return [createPromotion()];
      return prev.filter((promo) => promo.id !== id);
    });
  };

  const buildPromotionValue = (promo) => {
    if (["Discounted Listing", "Discounted Event"].includes(promo.promoType)) {
      const tiers = Object.entries(promo.targetTiers)
        .filter(([_, v]) => v)
        .map(([k]) => k)
        .join(", ");
      return `${promo.discountType === "percentage" ? promo.promoValue + "%" : "$" + promo.promoValue} off [${tiers}] limit: ${promo.durationValue} ${promo.durationType}`;
    }

    if (["Free Listings", "Free Event"].includes(promo.promoType)) {
      return `free [${promo.durationValue} ${promo.durationType}]`;
    }

    return promo.promoValue;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!reason) throw new Error("Please select a reason");

      const validPromotions = promotions.filter((promo) => promo.promoType);
      if (validPromotions.length === 0) throw new Error("Please add at least one promotion type");

      await Promise.all(
        validPromotions.map((promo) =>
          base44.entities.PromotionLog.create({
            user_id: targetUserId,
            listing_id: listing?.id || null,
            promotion_type: promo.promoType,
            promotion_value: buildPromotionValue(promo) || "",
            scope,
            reason,
            admin_notes: adminNotes,
            admin_id: adminUser?.id || "system",
            status: promo.enabled ? "active" : "disabled",
          })
        )
      );

      // Determine action_type per promo
      const resolveActionType = (promoType) => {
        if (["Free Listings", "Free Event"].includes(promoType)) return "admin_granted_free_listing";
        if (["Discounted Listing", "Discounted Event"].includes(promoType)) return "admin_applied_discount";
        if (promoType === "Credit Full Listing Amount") return "admin_granted_credit";
        if (promoType === "Partial Credit") return "admin_granted_credit";
        if (promoType === "Upgrade Tier") return "admin_granted_premium_upgrade";
        return "admin_used_override";
      };

      await Promise.all(
        validPromotions.map((promo) =>
          base44.entities.AdminAuditLog.create({
            admin_id: adminUser?.id,
            admin_employee_id: adminUser?.employee_id || adminUser?.id,
            action_type: resolveActionType(promo.promoType),
            target_type: scope === "listing" ? "Listing" : "User",
            target_id: listing?.id || targetUserId || "",
            success: true,
            metadata: JSON.stringify({
              affected_user_id: targetUserId,
              affected_user_email: targetUser?.email,
              listing_id: listing?.id || null,
              promotion_type: promo.promoType,
              promotion_value: buildPromotionValue(promo),
              discount_amount: ["Discounted Listing", "Discounted Event"].includes(promo.promoType) ? promo.promoValue : null,
              credit_amount: ["Credit Full Listing Amount", "Partial Credit"].includes(promo.promoType) ? promo.promoValue : null,
              reason,
              admin_notes: adminNotes,
              created_at: new Date().toISOString(),
            }),
          }).catch(() => {})
        )
      );
    },
    onSuccess: () => {
      toast.success("Promotions granted successfully");
      queryClient.invalidateQueries({ queryKey: ["userPromotions"] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to grant promotions");
    },
  });

  if (!targetUser) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grant Promotion ({scope === "listing" ? "Listing Level" : "Account Level"})</DialogTitle>
        </DialogHeader>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-1 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500">User Name</p>
              <p className="font-medium">{targetUser.full_name || targetUser.email}</p>
            </div>
            <div>
              <p className="text-slate-500">Email</p>
              <p className="font-medium break-all">{targetUser.email}</p>
            </div>
            <div>
              <p className="text-slate-500">Account Created</p>
              <p className="font-medium">{targetUser.created_date ? format(new Date(targetUser.created_date), "MMM d, yyyy") : "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Listings</p>
              <p className="font-medium">{activeListings.length} Active • {pastListings.length} Past</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {promotions.map((promo, index) => (
            <div key={promo.id} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 p-3 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Checkbox
                    checked={promo.enabled}
                    onCheckedChange={(checked) => updatePromotion(promo.id, { enabled: !!checked })}
                  />
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    Promotion {index + 1}{promo.promoType ? ` • ${promo.promoType}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => updatePromotion(promo.id, { collapsed: !promo.collapsed })}
                  >
                    {promo.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePromotion(promo.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {!promo.collapsed && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Promotion Type *</label>
                    <Select value={promo.promoType} onValueChange={(value) => updatePromotion(promo.id, { promoType: value })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {scope === "account" ? (
                          <>
                            <SelectItem value="Discounted Listing">Discounted Listing</SelectItem>
                            <SelectItem value="Free Listings">Free Listings</SelectItem>
                            <SelectItem value="Discounted Event">Discounted Event</SelectItem>
                            <SelectItem value="Free Event">Free Event</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Credit Full Listing Amount">Credit Full Listing Amount</SelectItem>
                            <SelectItem value="Partial Credit">Partial Credit</SelectItem>
                            <SelectItem value="Upgrade Tier">Upgrade Tier</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {scope === "account" && ["Discounted Listing", "Discounted Event"].includes(promo.promoType) && (
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-1 block">Discount Type</label>
                          <Select value={promo.discountType} onValueChange={(value) => updatePromotion(promo.id, { discountType: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="exact">Exact Amount ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-1 block">Value</label>
                          <Input
                            placeholder={promo.discountType === "percentage" ? "e.g. 20" : "e.g. 3.00"}
                            value={promo.promoValue}
                            onChange={(e) => updatePromotion(promo.id, { promoValue: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Target Tiers</label>
                        <div className="flex gap-4">
                          {["free", "featured", "premium"].map((tier) => (
                            <label key={tier} className="flex items-center gap-2 text-sm capitalize">
                              <Checkbox
                                checked={promo.targetTiers[tier]}
                                onCheckedChange={(checked) => updatePromotionTiers(promo.id, tier, !!checked)}
                              />
                              {tier}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-1 block">Duration</label>
                          <Select value={promo.durationType} onValueChange={(value) => updatePromotion(promo.id, { durationType: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="count">Listing Count Limit</SelectItem>
                              <SelectItem value="date">Expiration Date</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-1 block">
                            {promo.durationType === "count" ? "Count (e.g. 3)" : "Date (e.g. 2026-12-31)"}
                          </label>
                          <Input
                            type={promo.durationType === "date" ? "date" : "number"}
                            value={promo.durationValue}
                            onChange={(e) => updatePromotion(promo.id, { durationValue: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {scope === "account" && ["Free Listings", "Free Event"].includes(promo.promoType) && (
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-1 block">Limit Type</label>
                          <Select value={promo.durationType} onValueChange={(value) => updatePromotion(promo.id, { durationType: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="count">Count Limit</SelectItem>
                              <SelectItem value="date">Expiration Date</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-1 block">
                            {promo.durationType === "count" ? "Count (e.g. 3)" : "Date (e.g. 2026-12-31)"}
                          </label>
                          <Input
                            type={promo.durationType === "date" ? "date" : "number"}
                            value={promo.durationValue}
                            onChange={(e) => updatePromotion(promo.id, { durationValue: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {scope === "listing" && promo.promoType === "Partial Credit" && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Credit Amount ($)</label>
                      <Input placeholder="e.g. 5.00" value={promo.promoValue} onChange={(e) => updatePromotion(promo.id, { promoValue: e.target.value })} />
                    </div>
                  )}

                  {scope === "listing" && promo.promoType === "Upgrade Tier" && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Upgrade Option</label>
                      <Select value={promo.promoValue} onValueChange={(value) => updatePromotion(promo.id, { promoValue: value })}>
                        <SelectTrigger><SelectValue placeholder="Select upgrade" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Free -> Featured">Free → Featured</SelectItem>
                          <SelectItem value="Featured -> Premium">Featured → Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" className="w-full gap-2" onClick={addPromotion}>
            <Plus className="w-4 h-4" /> Add Another Promotion
          </Button>

          <div>
            <label className="text-sm font-medium mb-1 block">Promo Reason *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Launch Promotion">Launch Promotion</SelectItem>
                <SelectItem value="Customer Support">Customer Support</SelectItem>
                <SelectItem value="Marketing Campaign">Marketing Campaign</SelectItem>
                <SelectItem value="Event Organizer Support">Event Organizer Support</SelectItem>
                <SelectItem value="User Retention">User Retention</SelectItem>
                <SelectItem value="Admin Courtesy">Admin Courtesy</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Admin Notes (Optional)</label>
            <Textarea
              placeholder="Internal notes visible only to admins..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="h-20"
            />
          </div>

          {userListings.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-medium mb-2 block">User's Listings</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-2 font-medium">Title</th>
                      <th className="p-2 font-medium">Tier</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userListings.map((l) => (
                      <tr key={l.id} className={listing?.id === l.id ? "bg-purple-50" : ""}>
                        <td className="p-2 max-w-[150px] truncate">{l.title || "Untitled"}</td>
                        <td className="p-2 capitalize">{l.tier}</td>
                        <td className="p-2 capitalize">{l.status}</td>
                        <td className="p-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={() => window.open(createPageUrl("ListingDetail") + "?id=" + l.id, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Grant Promotion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}