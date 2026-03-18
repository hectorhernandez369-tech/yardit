import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LaunchNotificationForm() {
  const [form, setForm] = useState({ phone_number: "", email: "" });

  const signupMutation = useMutation({
    mutationFn: () => base44.entities.LaunchNotificationSignup.create({
      phone_number: form.phone_number.trim(),
      email: form.email.trim().toLowerCase(),
    }),
    onSuccess: () => {
      toast.success("You’re on the Yardit launch list.");
      setForm({ phone_number: "", email: "" });
    },
    onError: () => {
      toast.error("We couldn’t save your info right now.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    signupMutation.mutate();
  };

  return (
    <Card className="border-2 border-[#2C4F4E] bg-[#E7D7B8]/95 shadow-[0_18px_50px_rgba(44,79,78,0.16)]">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl text-[#2C4F4E]">Get notified when Yardit launches</CardTitle>
        <CardDescription className="text-base text-[#2C4F4E]/80">
          Save your phone number and email to be first in line for launch updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="tel"
            required
            placeholder="Phone number"
            value={form.phone_number}
            onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
            className="h-12 border-2 border-[#2C4F4E]/20 bg-white text-[#2C4F4E] placeholder:text-[#2C4F4E]/45"
          />
          <Input
            type="email"
            required
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="h-12 border-2 border-[#2C4F4E]/20 bg-white text-[#2C4F4E] placeholder:text-[#2C4F4E]/45"
          />
          <Button
            type="submit"
            disabled={signupMutation.isPending}
            className="h-12 w-full border-2 border-[#2C4F4E] bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"
          >
            {signupMutation.isPending ? "Saving..." : "Notify Me"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}