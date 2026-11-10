import React, { useEffect, useMemo, useRef } from 'react';
import { Marker, useMap } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { TreePine } from 'lucide-react';
import { clusterHalloweenPoints, getHalloweenClusterRadius } from '@/lib/halloweenPixelClustering';

const iconCache = new Map();
function clusterIcon(count) {
  if (iconCache.has(count)) return iconCache.get(count);
  const html = renderToStaticMarkup(
    <div className="flex h-[42px] w-[42px] items-center justify-center gap-0.5 rounded-full border-[3px] border-[#e9c36b] bg-[#123f30] text-[14px] font-extrabold text-white shadow-lg">
      <TreePine size={13} className="text-[#e9c36b]" />
      <span>{count}</span>
    </div>
  );
  const icon = L.divIcon({
    className: 'yardit-christmas-cluster',
    html,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
  iconCache.set(count, icon);
  return icon;
}

function getClusterBreakZoom(map, members, radius) {
  for (let zoom = Math.ceil(map.getZoom()) + 1; zoom <= map.getMaxZoom(); zoom += 1) {
    const projected = members.map(({lat, lng}) => map.project([lat, lng], zoom));
    const separationRadius = getHalloweenClusterRadius(zoom, radius);
    let separated = true;
    for (let i = 0; i < projected.length && separated; i += 1) {
      for (let j = i + 1; j < projected.length; j += 1) {
        if (projected[i].distanceTo(projected[j]) <= separationRadius) {
          separated = false;
          break;
        }
      }
    }
    if (separated) return zoom;
  }
  return map.getMaxZoom();
}

// Uses exactly the same pixel-distance grouping rule as Halloween:
// nearby pairs are grouped only at zoom <= 10; all individual pins return at zoom 11+.
export function getChristmasClusters(spots, map, zoom, targetId = '', selectedId = '', clusterRadius = 40) {
  if (zoom > 10) return {clusters: [], hiddenIds: new Set()};
  const points = spots
    .filter(spot => spot?.id && spot.id !== targetId && spot.id !== selectedId &&
      Number.isFinite(Number(spot.latitude)) && Number.isFinite(Number(spot.longitude)))
    .map(spot => ({
      id: spot.id, lat: Number(spot.latitude), lng: Number(spot.longitude),
    }));
  const clusters = clusterHalloweenPoints(points, map, clusterRadius);
  return {clusters, hiddenIds: new Set(clusters.flatMap(cluster => cluster.members.map(member => member.id)))};
}

function ChristmasClusterMarker({cluster, clusterRadius = 40}) {
  const map = useMap();
  const timer = useRef(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  const handlers = useMemo(() => ({
    click: event => {
      L.DomEvent.stopPropagation(event.originalEvent);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        map.flyTo([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, map.getMaxZoom()), {duration: 0.5});
        timer.current = null;
      }, 220);
    },
    dblclick: event => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      L.DomEvent.stopPropagation(event.originalEvent);
      const targetZoom = Math.max(11, Math.min(13, getClusterBreakZoom(map, cluster.members, clusterRadius)));
      map.flyTo([cluster.lat, cluster.lng], targetZoom, {duration: 0.75});
    },
  }), [map, cluster, clusterRadius]);
  return <Marker
    position={[cluster.lat, cluster.lng]}
    icon={clusterIcon(cluster.count)}
    eventHandlers={handlers}
    title={cluster.count + ' Christmas displays — tap to zoom'}
  />;
}

export default function ChristmasClusterMarkers({clusters, clusterRadius = 40}) {
  return <>{clusters.map(cluster => <ChristmasClusterMarker
    key={cluster.members.map(member => member.id).sort().join('-')}
    cluster={cluster}
    clusterRadius={clusterRadius}
  />)}</>;
}
