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
import { ExternalLink } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function PromotionModal({ open, onClose, user, listing, adminUser }) {
  const queryClient = useQueryClient();
  const scope = listing ? "listing" : "account";
  
  const [promoType, setPromoType] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [promoValue, setPromoValue] = useState("");
  const [targetTiers, setTargetTiers] = useState({ free: false, featured: false, premium: false });
  const [durationType, setDurationType] = useState("count");
  const [durationValue, setDurationValue] = useState("");
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (open) {
      setPromoType("");
      setDiscountType("percentage");
      setPromoValue("");
      setTargetTiers({ free: false, featured: false, premium: false });
      setDurationType("count");
      setDurationValue("");
      setReason("");
      setAdminNotes("");
    }
  }, [open]);

  // Fetch target user if not fully passed (mostly for listing level where we might only have listing)
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

  const activeListings = userListings.filter(l => l.status === "active");
  const pastListings = userListings.filter(l => l.status !== "active");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!promoType) throw new Error("Please select a promotion type");
      if (!reason) throw new Error("Please select a reason");

      let finalValue = promoValue;
      if (scope === "account" && promoType === "Discounted Listing") {
        const tiers = Object.entries(targetTiers).filter(([_, v]) => v).map(([k]) => k).join(", ");
        finalValue = `${discountType === "percentage" ? promoValue + "%" : "$" + promoValue} off [${tiers}] limit: ${durationValue} ${durationType}`;
      }

      await base44.entities.PromotionLog.create({
        user_id: targetUserId,
        listing_id: listing?.id || null,
        promotion_type: promoType,
        promotion_value: finalValue || "",
        scope: scope,
        reason: reason,
        admin_notes: adminNotes,
        admin_id: adminUser?.id || "system",
        status: "active"
      });
    },
    onSuccess: () => {
      toast.success("Promotion granted successfully");
      queryClient.invalidateQueries({ queryKey: ["userPromotions"] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to grant promotion");
    }
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
          <div>
            <label className="text-sm font-medium mb-1 block">Promotion Type *</label>
            <Select value={promoType} onValueChange={setPromoType}>
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

          {scope === "account" && promoType === "Discounted Listing" && (
            <div className="bg-white p-3 rounded border border-slate-200 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Discount Type</label>
                  <Select value={discountType} onValueChange={setDiscountType}>
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
                    placeholder={discountType === "percentage" ? "e.g. 20" : "e.g. 3.00"} 
                    value={promoValue} 
                    onChange={e => setPromoValue(e.target.value)} 
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Target Tiers</label>
                <div className="flex gap-4">
                  {["free", "featured", "premium"].map(tier => (
                    <label key={tier} className="flex items-center gap-2 text-sm capitalize">
                      <Checkbox 
                        checked={targetTiers[tier]} 
                        onCheckedChange={(c) => setTargetTiers(prev => ({...prev, [tier]: c}))} 
                      />
                      {tier}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Duration</label>
                  <Select value={durationType} onValueChange={setDurationType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Listing Count Limit</SelectItem>
                      <SelectItem value="date">Expiration Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    {durationType === "count" ? "Count (e.g. 3)" : "Date (e.g. 2026-12-31)"}
                  </label>
                  <Input 
                    type={durationType === "date" ? "date" : "number"}
                    value={durationValue} 
                    onChange={e => setDurationValue(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          )}

          {scope === "listing" && promoType === "Partial Credit" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Credit Amount ($)</label>
              <Input placeholder="e.g. 5.00" value={promoValue} onChange={e => setPromoValue(e.target.value)} />
            </div>
          )}

          {scope === "listing" && promoType === "Upgrade Tier" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Upgrade Option</label>
              <Select value={promoValue} onValueChange={setPromoValue}>
                <SelectTrigger><SelectValue placeholder="Select upgrade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free -> Featured">Free → Featured</SelectItem>
                  <SelectItem value="Featured -> Premium">Featured → Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
              onChange={e => setAdminNotes(e.target.value)} 
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
                    {userListings.map(l => (
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