import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const SUPPORT_AREAS = [
  { value: "residential", label: "Residential / Yard Sale Issue", queue: "residential_support", source_type: "listing" },
  { value: "vendor", label: "Vendor Account or Truck Pin", queue: "vendor_support", source_type: "vendor_account" },
  { value: "event", label: "Vendor Event", queue: "event_support", source_type: "vendor_event" },
  { value: "billing", label: "Billing, Payment, or Subscription", queue: "billing_support", source_type: "general" },
  { value: "technical", label: "Technical Issue / App Bug", queue: "technical_support", source_type: "general" },
];

export default function ContactSupportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    support_area: "residential",
    description: "",
  });
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    // Pre-fill from URL params (e.g. ?area=vendor&source_id=xxx&source_type=vendor_account)
    const params = new URLSearchParams(window.location.search);
    const areaParam = params.get("area");
    const areaMatch = SUPPORT_AREAS.find((a) => a.value === areaParam);

    base44.auth.me().then((user) => {
      setCurrentUser(user);
      setFormData((prev) => ({
        ...prev,
        name: user.full_name || "",
        phone: user.phone || "",
        email: user.email || "",
        support_area: areaMatch ? areaParam : "residential",
        source_id: params.get("source_id") || "",
        source_type: areaMatch ? areaMatch.source_type : "general",
      }));
    }).catch(() => {
      if (areaMatch) setFormData((prev) => ({ ...prev, support_area: areaParam }));
    });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAreaChange = (value) => {
    const areaConfig = SUPPORT_AREAS.find((a) => a.value === value);
    setFormData((prev) => ({
      ...prev,
      support_area: value,
      source_type: areaConfig?.source_type || "general",
    }));
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 3) {
      toast.error("You can only upload up to 3 photos.");
      return;
    }
    setPhotos([...photos, ...files].slice(0, 3));
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.description) {
      toast.error("Email and Description are required.");
      return;
    }
    setLoading(true);

    const photo_paths = [];
    for (const photo of photos) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
      if (file_url) photo_paths.push(file_url);
    }

    const areaConfig = SUPPORT_AREAS.find((a) => a.value === formData.support_area) || SUPPORT_AREAS[0];
    const existingTickets = await base44.entities.SupportTicket.list();
    const nextNum = existingTickets.length + 1;
    const ticket_number = `ST-${String(nextNum).padStart(5, "0")}`;

    const newTicket = await base44.entities.SupportTicket.create({
      ticket_number,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      description: formData.description,
      photo_paths,
      support_area: formData.support_area,
      assigned_queue: areaConfig.queue,
      source_type: formData.source_type || areaConfig.source_type,
      source_id: formData.source_id || "",
      requester_user_id: currentUser?.id || "",
      requester_email: formData.email,
      status: "open",
      priority: "normal",
    });

    await base44.entities.TicketAction.create({
      ticket_id: newTicket.id,
      action: "Ticket created",
      details: `${ticket_number} submitted via ${areaConfig.label} — routed to ${areaConfig.queue.replace(/_/g, " ")}`,
    });

    toast.success("Support ticket created successfully!");
    navigate(createPageUrl("Settings"));

    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-[#F3E6CF]">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-[#2C4F4E]">
          &larr; Back
        </Button>
        <Card className="border-2 border-[#2C4F4E] shadow-sm bg-[#E7D7B8]">
          <CardHeader>
            <CardTitle className="text-2xl text-[#2C4F4E]">Contact Support</CardTitle>
            <CardDescription className="text-slate-600">Please fill out the form below to create a support ticket.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Support Area — routes ticket to correct queue */}
              <div>
                <Label>What do you need help with? *</Label>
                <Select value={formData.support_area} onValueChange={handleAreaChange}>
                  <SelectTrigger className="bg-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_AREAS.map((area) => (
                      <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Your ticket will be routed to the <strong>{SUPPORT_AREAS.find((a) => a.value === formData.support_area)?.label}</strong> team.
                </p>
              </div>

              <div>
                <Label>Name</Label>
                <Input name="name" value={formData.name} onChange={handleChange} className="bg-white mt-1" />
              </div>
              <div>
                <Label>Email Address (Required)</Label>
                <Input name="email" type="email" required value={formData.email} onChange={handleChange} className="bg-white mt-1" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="bg-white mt-1" />
              </div>
              <div>
                <Label>Physical Address</Label>
                <Input name="address" value={formData.address} onChange={handleChange} className="bg-white mt-1" />
              </div>
              <div>
                <Label>Description (Required)</Label>
                <Textarea name="description" required value={formData.description} onChange={handleChange} className="bg-white min-h-[120px] mt-1" placeholder="Please describe your issue in detail..." />
              </div>
              <div>
                <Label>Upload Photo Evidence (Optional, Max 3)</Label>
                <Input type="file" accept="image/*" multiple onChange={handlePhotoChange} disabled={photos.length >= 3} className="bg-white mt-1" />
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative bg-slate-200 p-2 rounded text-xs flex items-center pr-8">
                        <span className="truncate max-w-[120px]">{photo.name}</span>
                        <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 text-red-500 font-bold px-1 hover:bg-red-100 rounded">&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Support Ticket
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}