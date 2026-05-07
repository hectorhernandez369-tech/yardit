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
    <Card className="border-[#2C4F4E]/15">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-[#2C4F4E]">Photo Gallery</CardTitle>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#5DADA5] px-3 py-2 text-sm font-medium text-white hover:bg-[#4A9B93]">
          <ImagePlus className="h-4 w-4" /> {uploading ? "Uploading..." : "Add Photo"}
          <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploading} className="hidden" />
        </label>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2C4F4E]/30 bg-[#F3E6CF]/60 p-8 text-center text-slate-600">
            Add photos to make your vendor page stand out.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((url) => (
              <div key={url} className="group relative overflow-hidden rounded-2xl border bg-white">
                <img src={url} alt="Vendor gallery" className="h-36 w-full object-cover" />
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