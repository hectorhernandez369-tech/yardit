import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation, Plus, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ListingShareButton from '@/components/listing/ListingShareButton';
import { useHunt, HUNT_ENABLED } from '@/components/hunt/HuntContext';
import { useGuestGuard } from '@/hooks/useGuestGuard';
import GuestAuthModal from '@/components/guest/GuestAuthModal';
import ReportModal from '@/components/ReportModal';
import { holidayListing } from '@/lib/holidayLights';

export default function HolidayLightsActions({ spot, user }) {
  const listing = holidayListing(spot);
  const hunt = useHunt();
  const { guardAction, showModal, setShowModal, modalProps } = useGuestGuard();
  const [reportOpen, setReportOpen] = React.useState(false);
  const added = hunt?.huntStops.some(stop => stop.id === spot.id);
  return <section className="space-y-3 rounded-xl border bg-card p-5 text-card-foreground">
    <h2 className="font-semibold">Plan your stop</h2>
    <Button asChild className="w-full"><a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`} target="_blank" rel="noopener noreferrer"><Navigation className="mr-2 h-4 w-4" />Directions</a></Button>
    {HUNT_ENABLED && hunt && <Button variant="outline" className="w-full" disabled={added} onClick={() => guardAction(() => hunt.addToHunt(listing))}><Plus className="mr-2 h-4 w-4" />{added ? 'Already in Hunt' : 'Add to Hunt'}</Button>}
    <ListingShareButton listing={listing} listingUrl={`${window.location.origin}/HolidayLightsDetail?id=${spot.id}`} buttonLabel="Share display" className="w-full" />
    {user?.id === spot.owner_user_id && <Button asChild variant="outline" className="w-full"><Link to={`/CreateHolidayLights?id=${spot.id}`}>Edit my display</Link></Button>}
    <Button variant="ghost" className="w-full" onClick={() => guardAction(() => setReportOpen(true))}><Flag className="mr-2 h-4 w-4" />Report display</Button>
    {reportOpen && <ReportModal listingId={spot.id} targetType="location" onClose={() => setReportOpen(false)} />}
    <GuestAuthModal open={showModal} onClose={() => setShowModal(false)} {...modalProps} />
  </section>;
}