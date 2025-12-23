import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import StepOne from "../components/create/StepOne";
import StepTwo from "../components/create/StepTwo";
import StepThree from "../components/create/StepThree";

export default function CreateListingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    listingType: "yard_sale",
    tier: "free",
    title: "",
    description: "",
    addressText: "",
    city: "",
    zip: "",
    lat: null,
    lng: null,
    startDateTime: "",
    endDateTime: "",
    photoUrls: [],
    homeCount: 1,
    spanFeet: 0,
    validatedDistance: false,
    validatedText: false,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    fetchUser();
  }, []);

  // Check posting limits
  const { data: userListings } = useQuery({
    queryKey: ["userListings", user?.id],
    queryFn: () => base44.entities.Listing.filter({ ownerUserId: user.id }),
    enabled: !!user,
    initialData: [],
  });

  const checkPostingLimit = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentListings = userListings.filter(
      (l) => new Date(l.created_date) >= sevenDaysAgo
    );

    const limits = { free: 1, featured: 2, premium: 3, neighborhood_tier: 3 };
    const limit = limits[formData.tier];
    
    if (recentListings.length >= limit) {
      toast.error(`You've reached your ${formData.tier} posting limit (${limit} per week)`);
      return false;
    }
    return true;
  };

  const createListingMutation = useMutation({
    mutationFn: async (data) => {
      if (!checkPostingLimit()) {
        throw new Error("Posting limit reached");
      }

      const listing = await base44.entities.Listing.create({
        ...data,
        ownerUserId: user.id,
        status: "active",
      });
      return listing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing created successfully!");
      navigate(createPageUrl("MyListings"));
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create listing");
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.title || !formData.description) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.addressText || !formData.city || !formData.zip || !formData.lat || !formData.lng) {
        toast.error("Please complete the address and location");
        return;
      }
      if (!formData.startDateTime || !formData.endDateTime) {
        toast.error("Please select start and end times");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = () => {
    createListingMutation.mutate(formData);
  };

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    s === step
                      ? "bg-amber-600 text-white"
                      : s < step
                      ? "bg-green-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-1 ${s < step ? "bg-green-600" : "bg-slate-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center gap-8 text-xs text-slate-600">
            <span className={step === 1 ? "font-semibold" : ""}>Details</span>
            <span className={step === 2 ? "font-semibold" : ""}>Location & Time</span>
            <span className={step === 3 ? "font-semibold" : ""}>Tier & Review</span>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-800 text-white">
            <CardTitle>Post Your Yard Sale</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {step === 1 && (
              <StepOne formData={formData} setFormData={setFormData} />
            )}
            {step === 2 && (
              <StepTwo formData={formData} setFormData={setFormData} />
            )}
            {step === 3 && (
              <StepThree formData={formData} setFormData={setFormData} />
            )}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={createListingMutation.isPending}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {createListingMutation.isPending ? "Creating..." : "Create Listing"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}