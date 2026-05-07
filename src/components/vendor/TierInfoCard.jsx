import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TierInfoCard({ profile, vendorAccount }) {
  const tier = profile?.tier || vendorAccount?.vendor_tier || "starter";

  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="text-xl font-bold capitalize">{tier}</p>
        </div>
        <Badge className="bg-[#F4A849] text-[#2C4F4E]">Active</Badge>
      </CardContent>
    </Card>
  );
}