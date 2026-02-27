import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinNeighborhoodSale() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };
    fetchUser();
  }, []);

  const { data: sale, isLoading: isSaleLoading } = useQuery({
    queryKey: ["neighborhood_sale_by_code", code],
    queryFn: async () => {
      if (!code) return null;
      const sales = await base44.entities.Listing.filter({ invite_code: code, listingType: "neighborhood_sale" });
      return sales.length > 0 ? sales[0] : null;
    },
    enabled: !!code,
  });

  const { data: existingRequests } = useQuery({
    queryKey: ["join_requests", user?.id, sale?.id],
    queryFn: async () => {
      if (!user?.id || !sale?.id) return [];
      return await base44.entities.JoinRequest.filter({ userId: user.id, listingId: sale.id });
    },
    enabled: !!user?.id && !!sale?.id,
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.JoinRequest.create({
        listingId: sale.id,
        userId: user.id,
        ownerUserId: sale.ownerUserId,
        status: "pending"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join_requests"] });
      toast.success("Request sent successfully!");
    },
    onError: () => {
      toast.error("Failed to send request. Please try again.");
    }
  });

  if (!code) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-slate-500">
            Invalid invite link
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSaleLoading || isAuthChecking) {
    return <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">Loading...</div>;
  }

  if (!sale) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-slate-500">
            Sale not found or invalid code.
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = sale.startDateTime ? new Date(sale.startDateTime).toLocaleDateString() : "";
  const endDate = sale.endDateTime ? new Date(sale.endDateTime).toLocaleDateString() : "";

  const handleSignIn = () => {
    const nextUrl = window.location.pathname + window.location.search;
    base44.auth.redirectToLogin(nextUrl);
  };

  const handleRequest = () => {
    if (sale.ownerUserId === user.id) {
      toast.error("You are the organizer of this event.");
      return;
    }
    requestMutation.mutate();
  };

  const activeRequest = existingRequests?.find(r => r.status === "pending" || r.status === "approved");

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-[#2C4F4E] bg-[#E7D7B8]">
        <CardHeader className="bg-[#5DADA5] text-white border-b-2 border-[#2C4F4E] rounded-t-lg">
          <CardTitle className="text-xl">Neighborhood Sale in your area</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="font-bold text-lg text-[#2C4F4E]">{sale.title}</h3>
            {startDate && endDate && (
              <p className="text-sm text-[#1F2937]">
                {startDate} - {endDate}
              </p>
            )}
          </div>
          
          {user && activeRequest && (
            <div className="p-3 bg-white/50 border border-[#2C4F4E]/30 rounded-md text-[#2C4F4E] text-sm font-medium">
              {activeRequest.status === "approved" ? "Your request has been approved." : "Request already sent. Pending approval."}
            </div>
          )}
          
        </CardContent>
        <CardFooter>
          {!user ? (
            <Button onClick={handleSignIn} className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-bold">
              Sign in to Request
            </Button>
          ) : (
            <Button 
              onClick={handleRequest} 
              disabled={!!activeRequest || requestMutation.isPending || sale.ownerUserId === user.id} 
              className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-bold disabled:opacity-50"
            >
              {requestMutation.isPending ? "Sending..." : activeRequest ? "Request sent" : "Request to Join"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}