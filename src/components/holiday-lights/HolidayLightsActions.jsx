import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation, Plus, Flag, MapPin, ChevronDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SaveListingButton from '@/components/listing/SaveListingButton';
import ListingShareButton from '@/components/listing/ListingShareButton';
import { useHunt, HUNT_ENABLED } from '@/components/hunt/HuntContext';
import { useGuestGuard } from '@/hooks/useGuestGuard';
import GuestAuthModal from '@/components/guest/GuestAuthModal';
import ReportModal from '@/components/ReportModal';
import { holidayListing } from '@/lib/holidayLights';

export default function HolidayLightsActions({ spot, user }) {
  const listing = holidayListing(spot);
  const hunt = useHunt();
  const { guardAction, showModal, setShowModal, modalProps, isGuest } = useGuestGuard();
  const [reportOpen, setReportOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const added = !!hunt?.huntStops?.some(stop => stop.id === spot.id);
  const shareUrl = window.location.origin + '/HolidayLightsDetail?id=' + spot.id;
  const isOwner = user?.id === spot.owner_user_id;

  return <section aria-label="Display actions" className="min-w-0 rounded-2xl border border-holiday-gold/50 bg-gradient-to-b from-christmas-green to-christmas-red p-3 text-holiday-snow shadow-lg sm:p-4">
    <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-amber-200">Plan Your Stop</h2>

    {/* The two navigation actions are the most important while visiting a display. */}
    <div className="grid grid-cols-2 gap-2">
      <Button asChild className="h-11 min-w-0 gap-1.5 rounded-xl bg-holiday-snow px-2 text-xs font-bold text-christmas-green hover:bg-holiday-snow/90 sm:text-sm">
        <Link to={'/?holidayLightId=' + encodeURIComponent(spot.id) + '&lat=' + spot.latitude + '&lng=' + spot.longitude}>
          <MapPin className="h-4 w-4 shrink-0" /><span>Show on Map</span>
        </Link>
      </Button>
      <Button asChild className="h-11 min-w-0 gap-1.5 rounded-xl bg-red-700 px-2 text-xs font-bold text-white hover:bg-red-600 sm:text-sm">
        <a href={'https://www.google.com/maps/dir/?api=1&destination=' + spot.latitude + ',' + spot.longitude} target="_blank" rel="noopener noreferrer">
          <Navigation className="h-4 w-4 shrink-0" /><span>Directions</span>
        </a>
      </Button>
    </div>

    <div className="mt-2 grid grid-cols-2 gap-2">
      <SaveListingButton listing={listing} className="h-10 w-full justify-center rounded-xl border-amber-300/30 bg-white/10 text-xs text-white hover:bg-white/20 sm:text-sm" />
      <ListingShareButton
        listing={{ ...listing, description: spot.description || 'Check out this Christmas display on Yardit.' }}
        listingUrl={shareUrl}
        mainImage={spot.photos?.[0] || ''}
        buttonLabel="Share"
        className="h-10 w-full justify-center rounded-xl border border-amber-300/30 bg-white/10 text-xs text-white hover:bg-white/20 sm:text-sm"
      />
    </div>

    <div className="mt-3 border-t border-white/20 pt-2">
      <button
        type="button"
        aria-expanded={moreOpen}
        aria-controls={'christmas-extra-actions-' + spot.id}
        onClick={() => setMoreOpen(open => !open)}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold text-holiday-snow/90 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        More options <ChevronDown className={'h-4 w-4 transition-transform ' + (moreOpen ? 'rotate-180' : '')} />
      </button>
      {moreOpen && <div id={'christmas-extra-actions-' + spot.id} className="grid gap-2 pt-2">
        {HUNT_ENABLED && hunt && <Button variant="outline" className="h-10 w-full justify-center border-white/20 bg-white/5 text-xs text-white hover:bg-white/10 sm:text-sm" disabled={added}
          onClick={() => guardAction(() => hunt.addToHunt(listing), {
            allowGuest: isGuest && hunt.huntStops.length < 2,
            modal: { title: 'Create a Free Account to Save More Stops', description: 'Guests can preview up to 2 Hunt stops.' }
          })}>
          <Plus className="mr-1.5 h-4 w-4" /> {added ? 'Already in Hunt' : 'Add to Hunt'}
        </Button>}
        {isOwner && <Button asChild variant="outline" className="h-10 w-full justify-center border-amber-300/40 bg-white/5 text-xs text-white hover:bg-white/10 sm:text-sm">
          <Link to={'/CreateHolidayLights?id=' + spot.id}><Pencil className="mr-1.5 h-4 w-4" />Edit My Display</Link>
        </Button>}
        <Button variant="ghost" className="h-10 w-full justify-center text-xs text-red-100 hover:bg-red-600/20 hover:text-white sm:text-sm" onClick={() => guardAction(() => setReportOpen(true))}>
          <Flag className="mr-1.5 h-4 w-4" />Report Display
        </Button>
      </div>}
    </div>
    {reportOpen && <ReportModal listingId={spot.id} targetType="location" onClose={() => setReportOpen(false)} />}
    <GuestAuthModal open={showModal} onClose={() => setShowModal(false)} {...modalProps} />
  </section>;
}
