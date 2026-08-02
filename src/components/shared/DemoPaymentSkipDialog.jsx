import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DemoPaymentSkipDialog({ open, onOpenChange, onSkip, onContinue, isProcessing, description }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demo Mode Payment</DialogTitle>
          <DialogDescription>
            {description || "Demo Mode is on for your admin account. Do you want to skip payment for this test, or continue to Stripe?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onContinue} disabled={isProcessing}>
            Continue to Stripe
          </Button>
          <Button type="button" onClick={onSkip} disabled={isProcessing} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">
            Skip Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}