import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function VendorBusinessPage({ account, updates, onRefresh }) {
  const [text, setText] = useState("");

  const addUpdate = async () => {
    if (!text.trim()) return;
    await base44.entities.VendorUpdate.create({ vendor_account_id: account.id, text, likes: 0, liked_by: [] });
    setText("");
    toast.success("Update posted");
    onRefresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card><CardHeader><CardTitle>Business Profile</CardTitle></CardHeader><CardContent className="space-y-3">
        {account.business_logo && <img src={account.business_logo} alt={account.business_name} className="h-20 w-20 rounded-xl object-cover border" />}
        <Input value={account.business_name || ""} readOnly />
        <p className="text-sm text-slate-600">Profile editing and branding controls can be expanded here.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Business Updates</CardTitle></CardHeader><CardContent className="space-y-4">
        <Textarea placeholder="Post an update for customers..." value={text} onChange={(e) => setText(e.target.value)} />
        <Button onClick={addUpdate} className="bg-[#5DADA5] hover:bg-[#4A9B93]">Post Update</Button>
        <div className="space-y-2">
          {updates.map((update) => <div key={update.id} className="rounded-lg border bg-white p-3 text-sm">{update.text}</div>)}
        </div>
      </CardContent></Card>
    </div>
  );
}