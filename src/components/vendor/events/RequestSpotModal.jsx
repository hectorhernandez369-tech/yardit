import { useState } from "react";
import { X, Store, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export default function RequestSpotModal({ event, account, isOpen, onClose }) {
  const [selectedBusiness, setSelectedBusiness] = useState(account?.id);
  const [boothSize, setBoothSize] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual backend function call
      // await base44.functions.invoke("requestEventSpot", {
      //   event_id: event.id,
      //   vendor_account_id: selectedBusiness,
      //   booth_size: boothSize,
      //   notes: notes,
      // });

      toast.success("Request submitted successfully!");
      onClose();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event || !account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-2xl font-bold">Request Vendor Spot</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <DialogDescription className="text-left">
            {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Business Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Store className="h-4 w-4 text-amber-500" />
                Select Business
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={account.id}>
                    <div className="flex items-center gap-2">
                      {account.business_logo ? (
                        <img src={account.business_logo} alt="" className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <Store className="w-4 h-4" />
                      )}
                      {account.business_name}
                    </div>
                  </SelectItem>
                  {/* Add more businesses if available */}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-2">
                This business profile will be shown to the event organizer
              </p>
            </CardContent>
          </Card>

          {/* Booth Size Selection */}
          {event.booth_sizes && event.booth_sizes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Select Booth Size</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={boothSize} onValueChange={setBoothSize}>
                  <div className="space-y-2">
                    {event.booth_sizes.map((size, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <RadioGroupItem value={size} id={`booth-${idx}`} />
                        <Label htmlFor={`booth-${idx}`} className="flex-1 cursor-pointer">
                          {size}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Notes to Organizer */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-500" />
                Notes to Organizer (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Tell the organizer about your business, special requirements, or any questions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-xs text-gray-500 mt-2">
                This helps organizers understand your business and approve your request
              </p>
            </CardContent>
          </Card>

          {/* Event Summary */}
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Event Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {new Date(event.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-medium">{event.location}</span>
              </div>
              {event.vendor_fee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee:</span>
                  <span className="font-medium">
                    ${event.vendor_fee}{event.vendor_fee_max ? ` - $${event.vendor_fee_max}` : ""}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Spots Available:</span>
                <span className="font-medium text-green-600">{event.spots_available || 0} left</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}