import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ComingSoonModeCard from "./ComingSoonModeCard";

export default function MySettingsTab({ user, session }) {
  const [form, setForm] = useState({
    current_pin: "",
    new_pin: "",
    confirm_pin: ""
  });
  const [loading, setLoading] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.current_pin || !form.new_pin || !form.confirm_pin) {
      toast.error("Please fill all fields.");
      return;
    }
    if (form.new_pin !== form.confirm_pin) {
      toast.error("New PINs do not match.");
      return;
    }
    if (form.new_pin.length < 4) {
      toast.error("New PIN must be at least 4 digits.");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke("adminResetOwnPin", {
        employee_id: session.employee_id,
        current_pin: form.current_pin,
        new_pin: form.new_pin
      });

      if (response.data.ok) {
        toast.success("PIN reset successfully.");
        setForm({ current_pin: "", new_pin: "", confirm_pin: "" });
      } else {
        if (response.data.reason === "invalid_current_pin") {
          toast.error("Current PIN is incorrect.");
        } else if (response.data.reason === "locked") {
          toast.error("Account is locked due to too many failed attempts.");
        } else {
          toast.error(response.data.reason || "Failed to reset PIN.");
        }
      }
    } catch (error) {
      toast.error("An error occurred while resetting PIN.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto md:mx-0 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Reset My PIN</CardTitle>
          <CardDescription>Update your Admin portal access PIN.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Current PIN</Label>
              <Input
                type="password"
                value={form.current_pin}
                onChange={(e) => set("current_pin", e.target.value)}
                maxLength={10}
              />
            </div>
            <div>
              <Label>New PIN</Label>
              <Input
                type="password"
                value={form.new_pin}
                onChange={(e) => set("new_pin", e.target.value)}
                maxLength={10}
              />
            </div>
            <div>
              <Label>Confirm New PIN</Label>
              <Input
                type="password"
                value={form.confirm_pin}
                onChange={(e) => set("confirm_pin", e.target.value)}
                maxLength={10}
              />
            </div>
            <Button type="submit" className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reset PIN
            </Button>
          </form>
        </CardContent>
      </Card>

      {user?.role === "master" && <ComingSoonModeCard />}
    </div>
  );
}