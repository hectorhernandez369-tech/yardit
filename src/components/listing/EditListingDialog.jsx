import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronDown, ChevronUp, Search, Send, MoreHorizontal, Shield, UserX } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EventIconManager from "@/components/events/EventIconManager";
import MarqueeSlotsEditor from "@/components/create/event/MarqueeSlotsEditor";
import EditListingPhotos from "@/components/listing/EditListingPhotos";
import EditParticipantSaleTime from "@/components/listing/EditParticipantSaleTime";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { EVENT_BASIC_ICON_LIBRARY, getEventIconEmoji } from "@/lib/eventListingConfig";
import { getUserDisplayName } from "@/lib/userIdentity";
import { getPhotoLimitByTier } from "@/components/shared/listingTierEngine";
import ImageCropEditor from "@/components/admin/ImageCropEditor";
import { useQueryClient } from "@tanstack/react-query";

export default function EditListingDialog({
  editingListing,
  onClose,
  onSave,
  isSaving,
  // field states
  editTitle, setEditTitle,
  editDescription, setEditDescription,
  editCategories, setEditCategories,
  editStartDate, setEditStartDate,
  editEndDate, setEditEndDate,
  editStartTime, setEditStartTime,
  editEndTime, setEditEndTime,
  editEventIcon, setEditEventIcon,
  editEventLogoUrl, setEditEventLogoUrl,
  editPhotoUrls, setEditPhotoUrls,
  editMarqueeSlots, setEditMarqueeSlots,
  editEventStartDate, setEditEventStartDate,
  editEventEndDate, setEditEventEndDate,
  editEventStartTime, setEditEventStartTime,
  editEventEndTime, setEditEventEndTime,
  editMarqueeFlyerUrl, setEditMarqueeFlyerUrl,
  editMarqueeBackgroundUrl, setEditMarqueeBackgroundUrl,
  iconPickerOpen, setIconPickerOpen,
  // co-host
  filteredCoHostUsers,
  coHostSearchQuery, setCoHostSearchQuery,
  selectedCoHostUserId, setSelectedCoHostUserId,
  isSendingCoHostInvite,
  isUpdatingCoHost,
  pendingInviteRows,
  activeCoHostRows,
  suspendedCoHostRows,
  sendCoHostInvite,
  handleCancelInvite,
  handleResendInvite,
  handleSuspendCoHost,
  handleReactivateCoHost,
  handleRemoveCoHost,
  user,
}) {
  const queryClient = useQueryClient();
  const [isUploadingFlyer, setIsUploadingFlyer] = React.useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = React.useState(false);
  const [cropEditorOpen, setCropEditorOpen] = React.useState(false);
  const [backgroundImageForCrop, setBackgroundImageForCrop] = React.useState("");

  if (!editingListing) return null;

  return (
    <>
      <Dialog open={!!editingListing} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {editingListing?.listingType === "neighborhood_sale" && (
              <>
                <div>
                  <Label className="text-[#2C4F4E] mb-2 block">Title</Label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Neighborhood Sale Title..." className="bg-[#F3E6CF] border-[#2C4F4E]" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[#2C4F4E] font-semibold block">Event Date &amp; Time</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Start Date</Label>
                      <Input type="date" min={new Date().toISOString().split("T")[0]} value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="bg-[#F3E6CF] border-[#2C4F4E]" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Start Time</Label>
                      <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="bg-[#F3E6CF] border-[#2C4F4E]" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">End Date</Label>
                      <Input type="date" min={editStartDate || new Date().toISOString().split("T")[0]} value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="bg-[#F3E6CF] border-[#2C4F4E]" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">End Time</Label>
                      <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="bg-[#F3E6CF] border-[#2C4F4E]" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Changing the start date must be at least 7 days in the future.</p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <div>
                    <Label className="text-[#2C4F4E] mb-2 block">Add Co-Host</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input value={coHostSearchQuery} onChange={(e) => setCoHostSearchQuery(e.target.value)} placeholder="Search by name, email, phone, address, or user ID" className="pl-9" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Search existing Yardit users only.</p>
                  </div>

                  {filteredCoHostUsers.length > 0 && (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {filteredCoHostUsers.map((candidate) => {
                        const displayName = getUserDisplayName(candidate);
                        const isSelected = selectedCoHostUserId === candidate.id;
                        const matchedValue = candidate.matchedField?.value || "";
                        const supportingAddress = [candidate.street_address, candidate.city, candidate.state, candidate.zip_code].filter(Boolean).join(", ");
                        return (
                          <button key={candidate.id} type="button" onClick={() => setSelectedCoHostUserId(candidate.id)}
                            className={`w-full rounded-md border p-3 text-left transition ${isSelected ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                            <div className="font-medium text-slate-900">{displayName}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1">Matched by: {candidate.matchedField.label}</div>
                            <div className="text-xs text-slate-600 mt-1 space-y-1">
                              {matchedValue && <p>{matchedValue}</p>}
                              {supportingAddress && candidate.matchedField.key !== "address" && <p>{supportingAddress}</p>}
                              {candidate.phone && candidate.matchedField.key !== "phone" && <p>{candidate.phone}</p>}
                              {candidate.email && candidate.matchedField.key !== "email" && matchedValue !== candidate.email && <p>{candidate.email}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {coHostSearchQuery.trim() && filteredCoHostUsers.length === 0 && <p className="text-sm text-slate-500">No users found.</p>}

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Co-Host Management</p>
                      <p className="text-xs text-slate-500">Manage pending invites, active co-hosts, and suspended co-hosts.</p>
                    </div>
                    {pendingInviteRows.length === 0 && activeCoHostRows.length === 0 && suspendedCoHostRows.length === 0 ? (
                      <p className="text-sm text-slate-500">No co-hosts or invites yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingInviteRows.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Invites</p>
                            {pendingInviteRows.map((row) => (
                              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{row.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{row.email || "No email available"}</p>
                                  {row.created_date && <p className="text-[10px] text-slate-400 mt-0.5">Sent: {format(new Date(row.created_date), "MMM d, yyyy")}</p>}
                                  <Badge variant="outline" className="mt-2 capitalize bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                                </div>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" disabled={isUpdatingCoHost} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" side="bottom" sideOffset={8} collisionPadding={12} onCloseAutoFocus={(e) => e.preventDefault()} className="z-[2000]">
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleResendInvite(row); }}><Send className="w-4 h-4" /> Resend Invite</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleCancelInvite(row.inviteId); }}><UserX className="w-4 h-4" /> Cancel Invite</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        )}
                        {activeCoHostRows.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Co-Hosts</p>
                            {activeCoHostRows.map((row) => (
                              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{row.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{row.email || "No email available"}</p>
                                  <Badge variant="outline" className="mt-2 capitalize bg-green-100 text-green-800 border-green-200">Active</Badge>
                                </div>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" disabled={isUpdatingCoHost} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" side="bottom" sideOffset={8} collisionPadding={12} onCloseAutoFocus={(e) => e.preventDefault()} className="z-[2000]">
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleSuspendCoHost(row.inviteId); }}><Shield className="w-4 h-4" /> Suspend Co-Host</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleRemoveCoHost(row.inviteId); }}><UserX className="w-4 h-4" /> Remove Co-Host</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        )}
                        {suspendedCoHostRows.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suspended Co-Hosts</p>
                            {suspendedCoHostRows.map((row) => (
                              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{row.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{row.email || "No email available"}</p>
                                  <Badge variant="outline" className="mt-2 capitalize bg-red-100 text-red-800 border-red-200">Suspended</Badge>
                                </div>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" disabled={isUpdatingCoHost} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" side="bottom" sideOffset={8} collisionPadding={12} onCloseAutoFocus={(e) => e.preventDefault()} className="z-[2000]">
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleReactivateCoHost(row.inviteId); }}><Shield className="w-4 h-4" /> Re-Activate Co-Host</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleRemoveCoHost(row.inviteId); }}><UserX className="w-4 h-4" /> Remove Co-Host</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={sendCoHostInvite} disabled={!selectedCoHostUserId || isSendingCoHostInvite || isUpdatingCoHost} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Send className="w-4 h-4 mr-2" />
                      {isSendingCoHostInvite ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {editingListing?.listingType === "yard_sale" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-[#2C4F4E] mb-2 block">Title</Label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Yard Sale Title..." className="bg-[#F3E6CF] border-[#2C4F4E]" />
                </div>
                <div>
                  <Label className="text-[#2C4F4E] mb-2 block">Categories (Up to 10) *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editCategories.map((cat, i) => (
                      <Badge key={i} className="flex items-center gap-1 bg-[#5DADA5] py-1.5 px-3 text-sm rounded-full">
                        {cat}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setEditCategories(prev => prev.filter((_, idx) => idx !== i))} />
                      </Badge>
                    ))}
                  </div>
                  {editCategories.length < 10 && (
                    <Select value="" onValueChange={(value) => { if (editCategories.includes(value)) return; setEditCategories(prev => [...prev, value]); }}>
                      <SelectTrigger className="border-[#2C4F4E] mt-3"><SelectValue placeholder="Add Category +" /></SelectTrigger>
                      <SelectContent>
                        {["Household Items","Furniture","Clothing & Accessories","Electronics","Tools & Hardware","Toys & Games","Baby & Kids","Outdoor & Garden","Sports Equipment","Collectibles","Antiques & Vintage","Vehicles & Auto Parts","Free Items","Food / Baked Goods","Miscellaneous"]
                          .filter(cat => !editCategories.includes(cat)).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}

            {editingListing?.listingType === "event" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-[#2C4F4E] mb-2 block">Event Title *</Label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Event title..." className="bg-[#F3E6CF] border-[#2C4F4E]" />
                </div>

                {(() => {
                  const tier = editingListing?.event_tier || editingListing?.tier || "basic";
                  const isBasic = tier === "basic";
                  const iconLabel = isBasic ? (EVENT_BASIC_ICON_LIBRARY.find(i => i.key === editEventIcon)?.label || editEventIcon || "None selected") : (editEventIcon ? editEventIcon.replace(/_/g, " ") : "None selected");
                  const iconEmoji = isBasic ? null : getEventIconEmoji(editEventIcon);
                  return (
                    <div className="border border-[#2C4F4E]/20 rounded-xl overflow-hidden">
                      <button type="button" onClick={() => setIconPickerOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 bg-[#F3E6CF] hover:bg-[#EDD9B5] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#2C4F4E]">Event Icon</span>
                          <div className="flex items-center gap-2">
                            {editEventLogoUrl ? <img src={editEventLogoUrl} alt="icon" className="w-6 h-6 rounded-full object-cover border border-[#2C4F4E]/30" />
                              : iconEmoji ? <span className="text-lg leading-none">{iconEmoji}</span>
                              : editEventIcon ? <span className="w-5 h-5 flex items-center justify-center text-[#2C4F4E] opacity-70"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" stroke="#2C4F4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></span>
                              : null}
                            <span className="text-xs text-slate-500 capitalize">{iconLabel}</span>
                          </div>
                        </div>
                        {iconPickerOpen ? <ChevronUp className="w-4 h-4 text-[#2C4F4E]" /> : <ChevronDown className="w-4 h-4 text-[#2C4F4E]" />}
                      </button>
                      {iconPickerOpen && (
                        <div className="p-4 border-t border-[#2C4F4E]/10 bg-white">
                          <EventIconManager tier={tier} selectedIcon={editEventIcon} setSelectedIcon={setEditEventIcon} uploadedImageUrl={editEventLogoUrl} setUploadedImageUrl={setEditEventLogoUrl} />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(editingListing?.event_tier || editingListing?.tier) === "marquee" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[#2C4F4E] font-semibold block mb-2">Event Date &amp; Time</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs text-slate-500 mb-1 block">Start Date</Label><Input type="date" value={editEventStartDate} onChange={(e) => setEditEventStartDate(e.target.value)} className="bg-[#F3E6CF] border-[#2C4F4E]" /></div>
                        <div><Label className="text-xs text-slate-500 mb-1 block">Start Time</Label><Input type="time" value={editEventStartTime} onChange={(e) => setEditEventStartTime(e.target.value)} className="bg-[#F3E6CF] border-[#2C4F4E]" /></div>
                        <div><Label className="text-xs text-slate-500 mb-1 block">End Date</Label><Input type="date" value={editEventEndDate} min={editEventStartDate || undefined} onChange={(e) => setEditEventEndDate(e.target.value)} className="bg-[#F3E6CF] border-[#2C4F4E]" /></div>
                        <div><Label className="text-xs text-slate-500 mb-1 block">End Time</Label><Input type="time" value={editEventEndTime} onChange={(e) => setEditEventEndTime(e.target.value)} className="bg-[#F3E6CF] border-[#2C4F4E]" /></div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[#2C4F4E] font-semibold block mb-2">Flyer</Label>
                      {editMarqueeFlyerUrl ? (
                        <div className="space-y-2">
                          <div className="w-full max-w-xs border-2 border-[#2C4F4E] rounded-lg overflow-hidden"><img src={editMarqueeFlyerUrl} alt="Flyer preview" className="w-full h-auto" /></div>
                          <Button type="button" variant="destructive" size="sm" onClick={() => setEditMarqueeFlyerUrl("")}>Delete Flyer</Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-[#2C4F4E] rounded-lg p-4 text-center">
                          <input type="file" id="flyer-upload" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return; setIsUploadingFlyer(true);
                            try { const r = await base44.integrations.Core.UploadFile({ file }); setEditMarqueeFlyerUrl(r.file_url); toast.success("Flyer uploaded"); }
                            catch { toast.error("Failed to upload flyer"); } finally { setIsUploadingFlyer(false); }
                          }} />
                          <Button type="button" variant="outline" className="border-[#2C4F4E]" disabled={isUploadingFlyer} onClick={() => document.getElementById("flyer-upload")?.click()}>
                            {isUploadingFlyer ? "Uploading..." : "Upload Flyer"}
                          </Button>
                          <p className="text-xs text-slate-500 mt-2">JPG, PNG (shown in listing details)</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-[#2C4F4E] font-semibold block mb-2">Background Image</Label>
                      {editMarqueeBackgroundUrl ? (
                        <div className="space-y-2">
                          <div className="w-full max-w-xs border-2 border-[#2C4F4E] rounded-lg overflow-hidden aspect-video"><img src={editMarqueeBackgroundUrl} alt="Background preview" className="w-full h-full object-cover" /></div>
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => { setBackgroundImageForCrop(editMarqueeBackgroundUrl); setCropEditorOpen(true); }}>Crop & Zoom</Button>
                            <Button type="button" variant="destructive" size="sm" onClick={() => setEditMarqueeBackgroundUrl("")}>Delete Background</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-[#2C4F4E] rounded-lg p-4 text-center">
                          <input type="file" id="background-upload" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return; setIsUploadingBackground(true);
                            try { const r = await base44.integrations.Core.UploadFile({ file }); setBackgroundImageForCrop(r.file_url); setCropEditorOpen(true); }
                            catch { toast.error("Failed to upload background"); } finally { setIsUploadingBackground(false); }
                          }} />
                          <Button type="button" variant="outline" className="border-[#2C4F4E]" disabled={isUploadingBackground} onClick={() => document.getElementById("background-upload")?.click()}>
                            {isUploadingBackground ? "Uploading..." : "Upload Background"}
                          </Button>
                          <p className="text-xs text-slate-500 mt-2">16:9 aspect ratio recommended</p>
                        </div>
                      )}
                    </div>

                    <MarqueeSlotsEditor value={editMarqueeSlots} onChange={setEditMarqueeSlots}
                      eventStartDate={editEventStartDate || editingListing?.startDateTime?.slice(0, 10)}
                      eventEndDate={editEventEndDate || editingListing?.endDateTime?.slice(0, 10)} />
                  </div>
                )}
              </div>
            )}

            <EditParticipantSaleTime listing={editingListing}
              startDate={editStartDate} setStartDate={setEditStartDate}
              startTime={editStartTime} setStartTime={setEditStartTime}
              endDate={editEndDate} setEndDate={setEditEndDate}
              endTime={editEndTime} setEndTime={setEditEndTime} />

            {editingListing?.listingType === "yard_sale" && (
              <EditListingPhotos label="Listing Photos" value={editPhotoUrls} onChange={setEditPhotoUrls} maxPhotos={getPhotoLimitByTier(editingListing?.tier)} />
            )}

            {editingListing?.listingType === "event" && ["featured","premium","marquee","galactic_display","galactic","display"].includes(editingListing?.event_tier || editingListing?.tier) && (
              <EditListingPhotos label="Event Photos" value={editPhotoUrls} onChange={setEditPhotoUrls} maxPhotos={getPhotoLimitByTier(editingListing?.event_tier || editingListing?.tier)} />
            )}

            <div>
              <Label className="text-[#2C4F4E] mb-2 block">Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={5} placeholder="Update your description..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropEditor
        imageUrl={backgroundImageForCrop}
        open={cropEditorOpen}
        onClose={() => setCropEditorOpen(false)}
        onApply={async (file) => {
          try {
            const result = await base44.integrations.Core.UploadFile({ file });
            setEditMarqueeBackgroundUrl(result.file_url);
            if (editingListing?.id) {
              await base44.entities.Listing.update(editingListing.id, { marquee_background_url: result.file_url });
              queryClient.invalidateQueries({ queryKey: ["myListings"] });
            }
            toast.success("Background image cropped and saved");
          } catch (error) {
            toast.error("Failed to save cropped image");
          }
        }}
        aspectRatio={16 / 9}
      />
    </>
  );
}