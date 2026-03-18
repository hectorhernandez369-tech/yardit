import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FollowSection() {
  return (
    <Card className="border-2 border-[#2C4F4E] bg-white/80 shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl text-[#2C4F4E]">Follow Yardit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <a href="https://facebook.com" target="_blank" rel="noreferrer" className="block">
          <Button className="w-full bg-[#5DADA5] text-white hover:bg-[#4A9B93]">Facebook</Button>
        </a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer" className="block">
          <Button className="w-full bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Instagram</Button>
        </a>
        <p className="pt-1 text-sm text-slate-600">Placeholder links are in place for now and can be swapped with your real profiles anytime.</p>
      </CardContent>
    </Card>
  );
}