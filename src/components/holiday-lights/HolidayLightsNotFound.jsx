import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function HolidayLightsNotFound() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code'; meta.content = '404';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return <div className="mx-auto max-w-xl space-y-4 p-8 text-center text-foreground"><h1 className="text-2xl font-bold">Holiday Lights display not found</h1><p className="text-muted-foreground">It may be out of season, removed, or no longer publicly available.</p><Button asChild><Link to="/">Back to Map</Link></Button></div>;
}