export async function saveAIFlyer(base44, file) {
  if (!(file instanceof File) || file.size === 0 || file.size > 10*1024*1024) throw new Error('Choose a flyer between 1 byte and 10 MB.');
  const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
  if(!allowed.includes(file.type)) throw new Error('Use a JPG, PNG, WebP image or PDF flyer.');
  const bytes = new Uint8Array(await file.slice(0,16).arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const type = bytes[0]===255 && bytes[1]===216 && bytes[2]===255 ? 'image/jpeg' :
    bytes[0]===137 && text.slice(1,4)==='PNG' ? 'image/png' :
    text.startsWith('RIFF') && text.slice(8,12)==='WEBP' ? 'image/webp' : text.startsWith('%PDF-') ? 'application/pdf' : '';
  if(type !== file.type) throw new Error('The file contents do not match its format. Export a new image or PDF and try again.');
  const result = await base44.asServiceRole.integrations.Core.UploadPrivateFile({file});
  return {file_uri:result.file_uri, name:file.name.slice(0,160), type, size:file.size};
}