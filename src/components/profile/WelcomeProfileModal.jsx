import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

const seenKey = (userId) => `yardit_profile_welcome_seen_${userId}`;

export default function WelcomeProfileModal({ user, setUser }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", phone: "" });

  useEffect(() => {
    if (!user?.id) return;

    const hasYarditName = !!(user.first_name && user.last_name);

    if (!hasYarditName) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
      });
      setOpen(true);
    }
  }, [user]);

  const markSeen = () => {
    if (user?.id) localStorage.setItem(seenKey(user.id), "true");
  };

  const handleSubmit = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }

    setSaving(true);
    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone: formData.phone.trim(),
    };

    const updatedUser = await base44.auth.updateMe(payload);
    setUser?.(updatedUser);
    markSeen();
    setOpen(false);
    setSaving(false);
    toast.success("Welcome to Yardit!");
  };

  const handleCompleteProfile = () => {
    setOpen(false);
    navigate(createPageUrl("Profile"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-[#F3E6CF] border-2 border-[#2C4F4E]">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#5DADA5] text-white shadow-md">
            <UserRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-[#2C4F4E]">Welcome to Yardit</DialogTitle>
          <DialogDescription className="text-center text-slate-700">
            Add your name so neighbors can find you when they search for other Yardit users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="welcome_first_name">First Name</Label>
              <Input
                id="welcome_first_name"
                value={formData.first_name}
                onChange={(event) => setFormData((prev) => ({ ...prev, first_name: event.target.value }))}
                placeholder="First name"
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="welcome_last_name">Last Name</Label>
              <Input
                id="welcome_last_name"
                value={formData.last_name}
                onChange={(event) => setFormData((prev) => ({ ...prev, last_name: event.target.value }))}
                placeholder="Last name"
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="welcome_phone">Phone Number <span className="font-normal text-slate-500">(optional)</span></Label>
            <Input
              id="welcome_phone"
              type="tel"
              value={formData.phone}
              onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="(555) 123-4567"
              className="bg-white"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
            <Button onClick={handleCompleteProfile} variant="outline" className="w-full border-[#2C4F4E] text-[#2C4F4E] hover:bg-[#E7D7B8]">
              Complete Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}