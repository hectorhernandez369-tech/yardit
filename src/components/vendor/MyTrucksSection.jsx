import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck } from "lucide-react";
import { toast } from "sonner";

export default function MyTrucksSection({ vendorAccount }) {
  const [pinName, setPinName] = useState("");
  const queryClient = useQueryClient();

  const { data: pins = [] } = useQuery({
    queryKey: ["vendorPins", vendorAccount?.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: vendorAccount.id }, "-created_date"),
    enabled: !!vendorAccount?.id,
  });

  const createPinMutation = useMutation({
    mutationFn: () => base44.entities.VendorPin.create({ vendor_account_id: vendorAccount.id, pin_name: pinName, is_active: true }),
    onSuccess: () => {
      setPinName("");
      queryClient.invalidateQueries({ queryKey: ["vendorPins"] });
      toast.success("Truck pin added");
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-lg">My Trucks / Pins</h2>
        <p className="text-sm text-muted-foreground">Create and manage your vendor pin profiles.</p>
      </div>
      <div className="rounded-2xl border bg-card p-4 flex gap-2">
        <Input value={pinName} onChange={(e) => setPinName(e.target.value)} placeholder="Truck or stand name" className="rounded-xl" />
        <Button onClick={() => createPinMutation.mutate()} disabled={!pinName.trim() || createPinMutation.isPending} className="rounded-xl">Add</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pins.filter((pin) => pin.is_active !== false).map((pin) => (
          <div key={pin.id} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><Truck className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <p className="text-sm font-semibold">{pin.pin_name}</p>
              <p className="text-xs text-muted-foreground">Active pin profile</p>
            </div>
          </div>
        ))}
      </div>
      {pins.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No truck pins yet.</p>}
    </div>
  );
}