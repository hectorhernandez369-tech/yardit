import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WaitlistCard() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email to join the waitlist.");
      return;
    }

    // Placeholder only: connect this form to waitlist storage when the backend is ready.
    toast.success("Waitlist form is ready — connect save logic when you're ready.");
    setEmail("");
  };

  return (
    <Card className="border-2 border-[#2C4F4E] bg-[#E7D7B8] shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl text-[#2C4F4E]">Join the waitlist</CardTitle>
        <CardDescription>Simple UI is ready now, with a placeholder for save logic later.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="border-[#2C4F4E]/20 bg-white"
          />
          <Button type="submit" className="w-full bg-[#2C4F4E] text-white hover:bg-[#234140]">
            Notify Me
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}