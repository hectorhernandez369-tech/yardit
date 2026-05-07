import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function VendorPhotoGallery({ account, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const photos = account.photo_urls || [];

  const savePhotos = async (photo_urls, featured_photo_url = account.featured_photo_url) => {
    await base44.entities.VendorAccount.update(account.id, { photo_urls, featured_photo_url });
    await onRefresh();
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await savePhotos([...photos, file_url], account.featured_photo_url || file_url);
    toast.success("Photo added");
    setUploading(false);
    event.target.value = "";
  };

  const removePhoto = async (url) => {
    const nextPhotos = photos.filter((photo) => photo !== url);
    const nextFeatured = account.featured_photo_url === url ? nextPhotos[0] || "" : account.featured_photo_url;
    await savePhotos(nextPhotos, nextFeatured);
    toast.success("Photo removed");
  };

  const setFeatured = async (url) => {
    await savePhotos(photos, url);
    toast.success("Featured photo updated");
  };

  return (
    <Card className="rounded-3xl border-[#2C4F4E]/15 bg-white shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row gap-3 p-3 sm:items-center sm:justify-between sm:p-4">
        <CardTitle className="text-base text-[#2C4F4E]">Photos</CardTitle>
        <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#5DADA5] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4A9B93]">
          <ImagePlus className="h-4 w-4" /> {uploading ? "Uploading..." : "Add Photo"}
          <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploading} className="hidden" />
        </label>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2C4F4E]/30 bg-[#F3E6CF]/60 p-6 text-center text-sm text-slate-600">
            Add photos to make your page stand out.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {photos.slice(0, 9).map((url, index) => (
              <div key={url} className={`group relative overflow-hidden border bg-white ${index === 0 ? "col-span-2 row-span-2 rounded-2xl" : "rounded-xl"}`}>
                <img src={url} alt="Vendor gallery" className={index === 0 ? "h-44 w-full object-cover sm:h-56" : "h-20 w-full object-cover sm:h-24"} />
                {account.featured_photo_url === url && <Badge className="absolute left-2 top-2 bg-[#F4A849] text-[#2C4F4E]">Featured</Badge>}
                <div className="absolute inset-x-2 bottom-2 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setFeatured(url)} className="flex-1 bg-white/90"><Star className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => removePhoto(url)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}