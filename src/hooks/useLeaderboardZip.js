import { useEffect, useRef, useState } from 'react';

export default function useLeaderboardZip(enabled, mapboxToken) {
  const [zip, setZip] = useState('');
  const [searchedZip, setSearchedZip] = useState('');
  const [isLocating, setIsLocating] = useState(enabled);
  const [locationMessage, setLocationMessage] = useState('');
  const manual = useRef(false);
  const stop = useRef(() => {});

  useEffect(() => {
    if (!enabled || manual.current) return;
    let cancelled = false, timeout;
    const controller = new AbortController();
    stop.current = () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
    const locate = async () => {
      setIsLocating(true);
      try {
        if (!navigator.geolocation) throw new Error('Location unavailable');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 60000, timeout: 10000, enableHighAccuracy: false }));
        if (cancelled) return;
        const { latitude, longitude } = position.coords;
        timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=postcode&country=us&limit=1&access_token=${encodeURIComponent(mapboxToken)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('ZIP lookup unavailable');
        const data = await response.json();
        const detectedZip = data.features?.find(feature => feature.place_type?.includes('postcode'))?.text?.match(/^\d{5}(?:-\d{4})?$/)?.[0]?.slice(0, 5);
        if (!detectedZip) throw new Error('ZIP not found');
        if (!cancelled) { setZip(detectedZip); setSearchedZip(detectedZip); }
      } catch (error) {
        if (!cancelled) setLocationMessage(error.code === 1
          ? 'Location access is off. Enter a ZIP code to see local leaders.'
          : 'Could not find your current ZIP code. Enter one to see local leaders.');
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setIsLocating(false);
      }
    };
    locate();
    return () => stop.current();
  }, [enabled, mapboxToken]);

  const changeZip = value => {
    manual.current = true;
    stop.current();
    setIsLocating(false);
    setLocationMessage('');
    setZip(value);
  };
  return { zip, setZip: changeZip, searchedZip, setSearchedZip, isLocating, locationMessage };
}