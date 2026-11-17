import React from 'react';
import {Navigate} from 'react-router-dom';

// Kept as a backwards-compatible link only. All AI conversations now open
// inside Step One of the existing posting page.
export default function CreateListingAI() {
  const id=new URLSearchParams(window.location.search).get('id');
  return <Navigate to={id?'/CreateListing?aiDraft='+encodeURIComponent(id):'/CreateListing'} replace />;
}
