import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LaunchNotificationForm() {
  const [form, setForm] = useState({ email: "" });

  const signupMutation = useMutation({
    mutationFn: () => base44.entities.LaunchNotificationSignup.create({
      email: form.email.trim().toLowerCase(),
    }),
    onSuccess: () => {
      toast.success("You’re on the Yardit launch list.");
      setForm({ email: "" });
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
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="sr-only">
        <CardTitle>Get notified when Yardit launches</CardTitle>
        <CardDescription>Save your email to be first in line for launch updates.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            required
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="h-12 rounded-2xl border border-teal-100 bg-cyan-50/60 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#5DADA5]"
          />
          <Button
            type="submit"
            disabled={signupMutation.isPending}
            className="h-12 w-full rounded-2xl bg-[#F4A849] font-black text-[#2C4F4E] shadow-md hover:bg-[#E39635]"
          >
            {signupMutation.isPending ? "Saving..." : "Notify Me"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}