import React from 'react';
import { Button } from '@/components/ui/button';
export default function AIListingAttachment({flyer, preview, busy, onUpload, onRemove}) {
  return <div className="space-y-2">
    <label className="block text-sm font-medium">Optional flyer (JPG, PNG, WebP or PDF, up to 10 MB)
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} className="mt-2 block w-full min-w-0 text-sm" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)onUpload(file);}}/>
    </label>
    {flyer && <div className="space-y-2 rounded-lg border bg-background p-3">
      <p className="break-all text-sm">{flyer.name}</p>
      {preview && (flyer.type==='application/pdf' ? <><object data={preview} type="application/pdf" aria-label="Flyer PDF preview" className="h-56 w-full"><p>Open the PDF to preview this flyer.</p></object><a href={preview} target="_blank" rel="noreferrer" className="text-sm underline">Open PDF flyer</a></> : <img src={preview} alt="Attached listing flyer" className="max-h-64 w-full object-contain"/>)}
      <Button type="button" variant="outline" size="sm" onClick={onRemove} disabled={busy}>Remove flyer</Button>
    </div>}
    <p className="text-xs text-muted-foreground">Draft attachments are stored privately. Uploading does not publish a listing.</p>
  </div>;
}