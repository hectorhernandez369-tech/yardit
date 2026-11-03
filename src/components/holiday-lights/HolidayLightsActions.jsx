import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation, Plus, Flag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SaveListingButton from '@/components/listing/SaveListingButton';
import ListingShareButton from '@/components/listing/ListingShareButton';
import { useHunt, HUNT_ENABLED } from '@/components/hunt/HuntContext';
import { useGuestGuard } from '@/hooks/useGuestGuard';
import GuestAuthModal from '@/components/guest/GuestAuthModal';
import ReportModal from '@/components/ReportModal';
import { holidayListing } from '@/lib/holidayLights';

export default function HolidayLightsActions({spot,user}) {
 const listing=holidayListing(spot);
 const hunt=useHunt();
 const {guardAction,showModal,setShowModal,modalProps,isGuest}=useGuestGuard();
 const [reportOpen,setReportOpen]=React.useState(false);
 const added=!!hunt?.huntStops?.some(stop=>stop.id===spot.id);
 const shareUrl=window.location.origin+'/HolidayLightsDetail?id='+spot.id;
 return <section className="rounded-2xl border border-holiday-gold/60 bg-gradient-to-b from-christmas-green to-christmas-red p-5 text-holiday-snow shadow-lg">
   <h2 className="mb-3 font-black uppercase tracking-wider text-amber-200">Plan Your Stop</h2>
   <div className="space-y-3">
     <Button asChild className="w-full bg-red-700 text-white hover:bg-red-600"><a href={'https://www.google.com/maps/dir/?api=1&destination='+spot.latitude+','+spot.longitude} target="_blank" rel="noopener noreferrer"><Navigation className="mr-2 h-4 w-4"/>Directions</a></Button>
     <SaveListingButton listing={listing} className="w-full justify-center border-amber-300/30 bg-white/10 text-white hover:bg-white/20"/>
     {HUNT_ENABLED&&hunt&&<Button variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10" disabled={added} onClick={()=>guardAction(()=>hunt.addToHunt(listing),{allowGuest:isGuest&&hunt.huntStops.length<2,modal:{title:'Create a Free Account to Save More Stops',description:'Guests can preview up to 2 Hunt stops.'}})}><Plus className="mr-2 h-4 w-4"/>{added?'Already in Hunt':'Add to Hunt'}</Button>}
     <ListingShareButton listing={{...listing,description:spot.description||'Check out this Christmas display on Yardit.'}} listingUrl={shareUrl} mainImage={spot.photos?.[0]||''} buttonLabel="Share Display" className="w-full border border-white/20 bg-white/5 text-white hover:bg-white/10"/>
     {user?.id===spot.owner_user_id&&<Button asChild variant="outline" className="w-full border-amber-300/40 bg-white/5 text-white"><Link to={'/CreateHolidayLights?id='+spot.id}>Edit My Display</Link></Button>}
     <Button variant="ghost" className="w-full text-red-200 hover:bg-red-600/20 hover:text-white" onClick={()=>guardAction(()=>setReportOpen(true))}><Flag className="mr-2 h-4 w-4"/>Report Display</Button>
   </div>
   {reportOpen&&<ReportModal listingId={spot.id} targetType="location" onClose={()=>setReportOpen(false)}/>}
   <GuestAuthModal open={showModal} onClose={()=>setShowModal(false)} {...modalProps}/>
 </section>;
}