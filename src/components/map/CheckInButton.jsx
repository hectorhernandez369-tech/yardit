import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";

export default function CheckInButton({ locationId }) {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: checkIns } = useQuery({
    queryKey: ["checkIns", locationId],
    queryFn: () => base44.entities.CheckIn.filter({ location_id: locationId }),
    initialData: [],
  });

  const userCheckIn = checkIns.find(c => c.user_email === user?.email);

  const checkInMutation = useMutation({
    mutationFn: () => base44.entities.CheckIn.create({
      location_id: locationId,
      user_email: user.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkIns"] });
      toast.success("Checked in!");
    },
  });

  if (!user) return null;

  return (
    <Button
      size="sm"
      variant={userCheckIn ? "default" : "outline"}
      onClick={() => !userCheckIn && checkInMutation.mutate()}
      disabled={!!userCheckIn || checkInMutation.isPending}
      className={`gap-2 border-2 ${userCheckIn ? "bg-[#5DADA5] text-white border-[#2C4F4E] hover:bg-[#4A9B93]" : "bg-[#E7D7B8] text-[#2C4F4E] border-[#2C4F4E] hover:bg-[#DCC9A5]"}`}
    >
      {userCheckIn ? (
        <>
          <CheckCircle className="w-4 h-4" />
          Checked In
        </>
      ) : (
        <>
          <Circle className="w-4 h-4" />
          Check In
        </>
      )}
    </Button>
  );
}