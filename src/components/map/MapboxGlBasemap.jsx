import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import loadMapboxGl from '@/components/map/loadMapboxGl';

const token = 'pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA';
const credit = '<a href="https://www.mapbox.com/about/maps/">© Mapbox</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> · <a href="https://apps.mapbox.com/feedback/">Improve this map</a>';

export default function MapboxGlBasemap() {
  const map = useMap();
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true, gl;
    const host = document.createElement('div');
    host.className = 'inset-0 pointer-events-none';
    host.style.position = 'absolute';
    map.getContainer().prepend(host);
    const camera = () => ({center: [map.getCenter().lng, map.getCenter().lat], zoom: map.getZoom() - 1});
    const sync = () => gl?.jumpTo(camera());
    const resize = () => { gl?.resize(); sync(); };
    loadMapboxGl().then(lib => {
      if (!active) return;
      gl = new lib.Map({ container: host, accessToken: token, style: 'mapbox://styles/mapbox/streets-v12', ...camera(), interactive: false, attributionControl: false, maxZoom: 22, minZoom: -2 });
      gl.on('error', ({error}) => { if (active && !gl.isStyleLoaded()) setError(error?.message || 'Mapbox could not load.'); });
      map.on('move zoom viewreset', sync).on('resize', resize);
      map.attributionControl?.addAttribution(credit);
    }).catch(e => { if (active) setError(e.message); });
    return () => {
      active = false;
      map.off('move zoom viewreset', sync).off('resize', resize);
      if (gl) { map.attributionControl?.removeAttribution(credit); gl.remove(); }
      host.remove();
    };
  }, [map, attempt]);
  return error ? <div role="alert" className="absolute left-2 right-2 top-12 z-[1100] rounded bg-card p-3 text-sm">{error} <button className="underline" onClick={() => { setError(''); retry(n => n + 1); }}>Retry map</button></div> : null;
}