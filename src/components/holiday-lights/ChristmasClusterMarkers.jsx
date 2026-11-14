import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { clusterHalloweenPoints, getHalloweenClusterRadius } from '@/lib/halloweenPixelClustering';

const clusterIcon = count => L.divIcon({
  className: 'yardit-christmas-cluster',
  html: '<div style="width:42px;height:42px;border-radius:50%;background:#123f30;border:3px solid #e9c36b;display:flex;align-items:center;justify-content:center;gap:3px;color:#fff;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 0 0 3px rgba(233,195,107,.25),0 3px 9px rgba(18,63,48,.4);"><span style="font-size:13px;color:#e9c36b;">✦</span>' + count + '</div>',
  iconSize: [42,42],
  iconAnchor: [21,21],
});

export function getChristmasClusters(spots, map, zoom, targetId = '', selectedId = '', clusterRadius = 40) {
  if (zoom > 10) return {clusters:[],hiddenIds:new Set()};
  const points = spots
    .filter(spot => spot?.id && spot.id !== targetId && spot.id !== selectedId &&
      typeof spot.latitude === 'number' && typeof spot.longitude === 'number' &&
      Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude))
    .map(spot => ({id:spot.id,lat:spot.latitude,lng:spot.longitude}));
  const clusters = clusterHalloweenPoints(points, map, clusterRadius);
  return {clusters, hiddenIds:new Set(clusters.flatMap(cluster => cluster.members.map(member => member.id)))};
}

function getClusterBreakZoom(map, members, radius) {
  for (let zoom = Math.ceil(map.getZoom()) + 1; zoom <= map.getMaxZoom(); zoom++) {
    const projected = members.map(({lat,lng}) => map.project([lat,lng],zoom));
    const threshold = getHalloweenClusterRadius(zoom,radius);
    let separated = true;
    for (let i=0;i<projected.length && separated;i++) {
      for (let j=i+1;j<projected.length;j++) {
        if (projected[i].distanceTo(projected[j])<=threshold) {separated=false;break;}
      }
    }
    if (separated) return zoom;
  }
  return map.getMaxZoom();
}

// Same architecture as HalloweenClusterGroup: leave individual markers mounted,
// toggle their visibility, and draw cluster counts in an independent Leaflet layer.
export default function ChristmasClusterMarkers({spots, markerRefsMap, targetId = '', selectedId = '', clusterRadius = 40}) {
  const map = useMap();
  const layerRef = useRef(L.layerGroup());
  const currentRef = useRef({spots,targetId,selectedId,clusterRadius});
  const updateRef = useRef(()=>{});
  currentRef.current = {spots,targetId,selectedId,clusterRadius};

  useEffect(()=>{
    const layer = layerRef.current;
    let active = true;
    let clickTimers = [];
    const setVisibility = ids => {
      for (const spot of currentRef.current.spots) {
        const el = markerRefsMap.current?.[spot.id]?.getElement?.();
        if (el) el.style.display = ids.has(spot.id) ? 'none' : '';
      }
    };
    const update = () => {
      if (!active) return;
      clickTimers.forEach(timer => clearTimeout(timer));
      clickTimers = [];
      layer.clearLayers();
      const {spots,targetId,selectedId,clusterRadius} = currentRef.current;
      if (map.getZoom()>10) {setVisibility(new Set());return;}
      const {clusters,hiddenIds} = getChristmasClusters(spots,map,map.getZoom(),targetId,selectedId,clusterRadius);
      setVisibility(hiddenIds);
      for (const cluster of clusters) {
        const marker=L.marker([cluster.lat,cluster.lng],{icon:clusterIcon(cluster.count),interactive:true});
        let clickTimer=null;
        marker.on('click',()=>{
          if(clickTimer)clearTimeout(clickTimer);
          clickTimer=setTimeout(()=>{
            map.flyTo([cluster.lat,cluster.lng],Math.min(map.getZoom()+2,map.getMaxZoom()),{duration:0.5});
            clickTimer=null;
          },220);
          clickTimers.push(clickTimer);
        });
        marker.on('dblclick',event=>{
          if(clickTimer){clearTimeout(clickTimer);clickTimer=null;}
          L.DomEvent.stopPropagation(event);
          const target=Math.max(11,Math.min(13,getClusterBreakZoom(map,cluster.members,clusterRadius)));
          map.flyTo([cluster.lat,cluster.lng],target,{duration:0.75});
        });
        layer.addLayer(marker);
      }
    };
    updateRef.current=update;
    layer.addTo(map);
    update();
    map.on('zoomend',update);
    map.on('moveend',update);
    return ()=>{
      active=false;
      clickTimers.forEach(timer=>clearTimeout(timer));
      map.off('zoomend',update);
      map.off('moveend',update);
      setVisibility(new Set());
      layer.clearLayers();
      layer.remove();
      updateRef.current=()=>{};
    };
  },[map,markerRefsMap]);
  useEffect(()=>updateRef.current(),[spots,targetId,selectedId,clusterRadius]);
  return null;
}
