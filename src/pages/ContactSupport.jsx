import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ContactSupportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    description: "",
  });
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user) {
        setFormData(prev => ({
          ...prev,
          name: user.full_name || "",
          phone: user.phone || "",
          email: user.email || "",
        }));
      }
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    try {
      // Handle photo uploads
      const photo_paths = [];
      for (const photo of photos) {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
          if (file_url) photo_paths.push(file_url);
        } catch (err) {
          console.error("Photo upload failed", err);
          toast.error("Failed to upload some photos.");
        }
      }

      // Generate ticket number ST-XXXXX
      const existingTickets = await base44.entities.SupportTicket.list();
      const nextNum = existingTickets.length + 1;
      const ticket_number = `ST-${String(nextNum).padStart(5, '0')}`;

      await base44.entities.SupportTicket.create({
        ...formData,
        ticket_number,
        photo_paths,
        status: "open"
      });

      toast.success("Support ticket created successfully!");
      navigate(createPageUrl("Settings"));
    } catch (error) {
      console.error(error);
      toast.error("Failed to create support ticket.");
    } finally {
      setLoading(false);
    }
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
                <Textarea name="description" required value={formData.description} onChange={handleChange} className="bg-white min-h-[120px] mt-1" />
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