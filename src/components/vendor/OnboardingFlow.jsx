import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function OnboardingFlow({ onComplete }) {
  const [form, setForm] = useState({ business_name: "", category: "", description: "" });

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C4F4E]">Set up your vendor page</h1>
          <p className="text-sm text-muted-foreground">Add the basics to start showing your business on Yardit.</p>
        </div>
        <Input placeholder="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <Textarea placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button onClick={() => onComplete(form)} disabled={!form.business_name.trim()} className="w-full rounded-xl">Create Vendor Page</Button>
      </div>
    </div>
  );
}