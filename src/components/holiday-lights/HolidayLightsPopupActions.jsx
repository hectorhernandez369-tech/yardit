import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SaveListingButton from '@/components/listing/SaveListingButton';
import HolidayLightsPopupHuntButton from '@/components/holiday-lights/HolidayLightsPopupHuntButton';
import GuestAuthModal from '@/components/guest/GuestAuthModal';
import ReportModal from '@/components/ReportModal';
import { useGuestGuard } from '@/hooks/useGuestGuard';
import { useAuth } from '@/lib/AuthContext';
import { holidayListing } from '@/lib/holidayLights';

export default function HolidayLightsPopupActions({ spot }) {
  const listing = useMemo(() => holidayListing(spot), [spot]);
  const [reportOpen, setReportOpen] = useState(false);
  const { guardAction, showModal, setShowModal, modalProps, isGuest } = useGuestGuard();
  const { isAuthenticated } = useAuth();
  return <>
    <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-1 rounded-lg border-t border-holiday-gold/40 bg-christmas-green px-1 py-1" onClick={event => event.stopPropagation()}>
      <Button asChild size="sm" className="h-6 bg-christmas-red px-2 py-0 text-[10px] font-bold text-holiday-snow hover:bg-christmas-red/90"><Link to={'/HolidayLightsDetail?id=' + spot.id}>View Details</Link></Button>
      <div onClickCapture={event => { if (!isAuthenticated) { event.stopPropagation(); event.preventDefault(); guardAction(() => {}, { modal: { title: 'Create an Account to Save', description: 'Guests cannot save listings.', detail: 'Create a free account to save listings for later.' } }); } }}>
        <SaveListingButton listing={listing} iconOnly size="sm" className="h-6 w-6 border-holiday-gold/40 bg-holiday-snow p-0 text-christmas-green" />
      </div>
      <Button size="sm" variant="outline" className="h-6 border-holiday-gold/40 bg-holiday-snow px-2 py-0 text-[10px] text-christmas-red hover:bg-holiday-snow/90" onClick={() => guardAction(() => setReportOpen(true))}>Report</Button>
      <HolidayLightsPopupHuntButton listing={listing} guardAction={guardAction} isGuest={isGuest} />
    </div>
    {reportOpen && <ReportModal listingId={spot.id} targetType="location" onClose={() => setReportOpen(false)} />}
    <GuestAuthModal open={showModal} onClose={() => setShowModal(false)} {...modalProps} />
  </>;
}