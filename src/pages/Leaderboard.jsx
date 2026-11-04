import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Trophy, Star, Loader2, ArrowLeft, Search } from 'lucide-react';
import { isHolidaySeason, getCurrentSeasonYear } from '@/components/holidays/SeasonCheck';
import { CHRISTMAS_SPOT_TYPES } from '@/components/holiday-lights/ChristmasDesign';
import useLeaderboardZip from '@/hooks/useLeaderboardZip';

const MIN_RATINGS = 5;
const MILES = [0, 1, 5, 10, 25, 50];
const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

function milesBetween(lat1,lng1,lat2,lng2) {
  const rad=Math.PI/180, latDelta=(lat2-lat1)*rad, lngDelta=(lng2-lng1)*rad;
  const a=Math.sin(latDelta/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(lngDelta/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
}

async function lookupZip(zip) {
  const response=await fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/'+encodeURIComponent(zip)+'.json?types=postcode&country=us&limit=5&access_token='+encodeURIComponent(MAPBOX_TOKEN));
  if(!response.ok) throw new Error('ZIP lookup is unavailable. Please try again.');
  const data=await response.json();
  const found=(data.features||[]).find(f => f.text===zip || f.place_name?.startsWith(zip+','));
  if(!found || !Array.isArray(found.center)) throw new Error('ZIP code not found. Check the five digits.');
  return {lat:found.center[1],lng:found.center[0]};
}

export default function LeaderboardPage(){
  const [radius,setRadius]=useState(10);
  const [type,setType]=useState('all');
  const seasonYear=getCurrentSeasonYear();
  const inSeason=isHolidaySeason();
  const {zip,setZip,searchedZip,setSearchedZip,isLocating,locationMessage}=useLeaderboardZip(inSeason,MAPBOX_TOKEN);
  const zipQuery=useQuery({queryKey:['christmasZipCenter',searchedZip],queryFn:()=>lookupZip(searchedZip),enabled:searchedZip.length===5 && radius>0,retry:false});
  const {data:locations=[],isLoading,isError}=useQuery({
    queryKey:['holidayLeaderboardLocations',seasonYear],
    queryFn:()=>base44.entities.Location.filter({type:'holiday_lights'}),
    enabled:inSeason
  });
  const results=useMemo(()=>{
    if(searchedZip.length!==5 || (radius>0&&!zipQuery.data))return [];
    return locations
      .filter(loc=>loc.type==='holiday_lights'&&loc.status==='active'&&loc.display_active===true&&Number(loc.ratings_count||0)>=MIN_RATINGS)
      .filter(loc=>type==='all'||loc.christmas_spot_type===type)
      .filter(loc=>{
        if(radius===0)return String(loc.zip_code||'').trim()===searchedZip;
        const a=Number(loc.latitude),b=Number(loc.longitude);
        return loc.latitude!=null&&loc.longitude!=null&&Number.isFinite(a)&&Number.isFinite(b)&&
          milesBetween(zipQuery.data.lat,zipQuery.data.lng,a,b)<=radius;
      })
      .sort((a,b)=>Number(b.average_rating||0)-Number(a.average_rating||0)||
        Number(b.ratings_count||0)-Number(a.ratings_count||0)||
        String(a.display_title||a.title||'').localeCompare(String(b.display_title||b.title||'')));
  },[locations,searchedZip,radius,zipQuery.data,type]);
  const searchZip=e=>{e.preventDefault();if(/^\d{5}$/.test(zip))setSearchedZip(zip);};
  return <div className="min-h-[calc(100vh-100px)] bg-[#f7f8f4] px-3 py-5 pb-24 sm:px-6">
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-[#174a38]"><ArrowLeft size={16}/>Back to map</Link>
      <header className="rounded-2xl bg-[#124535] p-5 text-white shadow-lg">
        <div className="flex items-center gap-3"><Trophy className="text-[#e8c46a]" size={30}/><div><h1 className="text-2xl font-bold">Christmas Leaderboard</h1><p className="text-sm text-white/75">Top-rated displays • Season {seasonYear}</p></div></div>
      </header>
      {!inSeason?<p className="mt-6 rounded-xl bg-white p-6 text-center text-gray-600">Christmas leaderboards are available November 1–January 2.</p>:<>
        <div className="mt-4 space-y-3 rounded-2xl border border-[#e0e6da] bg-white p-4 shadow-sm">
          <form onSubmit={searchZip}>
            <label className="mb-1 block text-sm font-bold text-[#124535]" htmlFor="christmas-leaderboard-zip">Search ZIP code</label>
            <div className="flex gap-2">
              <input id="christmas-leaderboard-zip" type="text" inputMode="numeric" maxLength={5} value={zip} placeholder="Enter ZIP code" onChange={e=>setZip(e.target.value.replace(/\D/g,'').slice(0,5))} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
              <button type="submit" disabled={zip.length!==5} className="flex items-center gap-1 rounded-lg bg-[#124535] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Search size={15}/>Search</button>
            </div>
          </form>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="christmas-leaderboard-radius" className="mb-1 block text-sm font-semibold text-[#124535]">Radius from ZIP center</label>
              <select id="christmas-leaderboard-radius" value={radius} onChange={e=>setRadius(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2.5 text-sm">
                {MILES.map(m=><option key={m} value={m}>{m===0?'ZIP only':m+' '+(m===1?'mile':'miles')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="christmas-leaderboard-type" className="mb-1 block text-sm font-semibold text-[#124535]">Display type</label>
              <select id="christmas-leaderboard-type" value={type} onChange={e=>setType(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2.5 text-sm">
                <option value="all">All displays</option>
                {CHRISTMAS_SPOT_TYPES.map(item=><option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground" role="status">{isLocating?'Finding your current ZIP code…':locationMessage||'Your current ZIP loads automatically with location access. You can also search another ZIP, adjust the radius, or choose a display type.'}</p>
        </div>
        {isLocating || isLoading || zipQuery.isLoading ? <div className="flex justify-center gap-2 py-10 text-muted-foreground" role="status"><Loader2 className="animate-spin"/>{isLocating?'Finding your ZIP and nearby leaders…':'Loading rankings…'}</div>
        : isError ? <p className="mt-4 rounded-xl bg-white p-5 text-red-700">Could not load Christmas rankings.</p>
        : zipQuery.isError && radius>0 ? <p className="mt-4 rounded-xl bg-white p-5 text-red-700">{zipQuery.error?.message||'Could not look up the ZIP code.'}</p>
        : <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-lg font-bold text-[#124535]">{searchedZip?'Top listings near '+searchedZip:'Choose your ZIP code'}</h2><span className="shrink-0 text-xs text-gray-600">{results.length} qualified</span></div>
          {!searchedZip?<p className="rounded-xl bg-white p-6 text-center text-gray-600">Enter a ZIP code to discover the top Christmas displays.</p>:
          results.length===0?<p className="rounded-xl bg-white p-6 text-center text-gray-600">No active displays with {MIN_RATINGS} or more ratings match these filters yet.</p>:
          <div className="space-y-3">{results.map((loc,index)=><Link to={'/?holidayLightId='+encodeURIComponent(loc.id)} key={loc.id} className="flex items-start gap-3 rounded-xl border border-[#e0e6da] bg-white p-4 shadow-sm transition hover:border-amber-400">
            <span className="w-10 shrink-0 text-center text-2xl">{index===0?'🥇':index===1?'🥈':index===2?'🥉':'#'+(index+1)}</span>
            <div className="min-w-0 flex-1"><h3 className="font-bold text-[#124535]">{loc.display_title||loc.title||'Christmas display'}</h3>
              <p className="text-xs text-gray-600">{loc.address||[loc.street_address,loc.city,loc.zip_code].filter(Boolean).join(', ')}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-sm font-bold text-[#6d5100]"><Star size={15} className="fill-amber-400 text-amber-500"/>{Number(loc.average_rating||0).toFixed(1)}/5</span>
                <span className="text-xs text-gray-600">{loc.ratings_count} ratings</span>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{CHRISTMAS_SPOT_TYPES.find(t=>t.value===loc.christmas_spot_type)?.label||'Christmas display'}</span>
              </div>
            </div>
          </Link>)}</div>}
          <p className="mt-4 text-center text-xs text-gray-500">Sorted by average stars, then rating count. Each user counts once per display per season. Minimum {MIN_RATINGS} ratings to qualify.</p>
        </section>}
      </>}
    </div>
  </div>;
}