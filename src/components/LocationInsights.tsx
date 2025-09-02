import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from "../lib/supabase";

// Marker icons for landlord properties vs comps
const landlordIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const compIcon = new L.DivIcon({
  className: 'bg-white rounded-full ring-2 ring-indigo-600 text-indigo-700 font-semibold flex items-center justify-center',
  html: '<div style="width:22px;height:22px;line-height:22px;border-radius:50%;text-align:center;">$</div>',
  iconSize: [22, 22], iconAnchor: [11, 11]
});

export type Insight = {
  property: string;
  tenant_score?: number;
  rent_amount?: number | string;
  lat?: number; lng?: number;
  beds?: number; baths?: number; sqft?: number;
};

export type LocationSummary = {
  property: string;
  units: number;
  avgScore: number;
  totalRevenue: number;
  lat?: number; lng?: number;
  currentAvgRent?: number;
  compMedian?: number; compP25?: number; compP75?: number; compCount?: number;
  suggestedLow?: number; suggestedHigh?: number; deltaPct?: number;
  comps?: Comp[];
};

export type Comp = {
  id: string; address: string; lat: number; lng: number; rent: number;
  beds?: number; baths?: number; sqft?: number; distance_mi?: number;
  property_type?: string; url?: string; source: string;
};

const usd = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const toNum = (x:any) => typeof x==='number'?x:typeof x==='string'?Number(x.replace(/[$,]/g,''))||0:0;
const hasCoords = (lat?:number,lng?:number)=> Number.isFinite(lat)&&Number.isFinite(lng);

function quantiles(nums: number[]) {
  const a = [...nums].sort((x,y)=>x-y);
  if (!a.length) return { p25: 0, p50: 0, p75: 0 };
  const q = (p:number)=>{
    const idx = (a.length-1)*p; const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo===hi) return a[lo];
    const w = idx - lo; return a[lo]*(1-w) + a[hi]*w;
  };
  return { p25: Math.round(q(0.25)), p50: Math.round(q(0.5)), p75: Math.round(q(0.75)) };
}

async function fetchComps(
  lat: number,
  lng: number,
  beds?: number,
  baths?: number,
  radiusMiles = 3,
  limit = 40
): Promise<Comp[]> {
  // Check if a user is logged in
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please log in to load comps.");
  }

  const { data, error } = await supabase.functions.invoke('get-market-comp', {
    body: { lat, lng, beds, baths, radiusMiles, limit },
  });

  if (error) throw new Error(error.message);

  return (data?.comps ?? []) as Comp[];
}

function FitToAll({ coords }:{ coords: Array<[number,number]> }){
  const map = useMap();
  useEffect(()=>{
    if(!coords.length) return;
    if(coords.length===1){ map.setView(coords[0], 15); return; }
    const b = L.latLngBounds(coords.map(([a,b])=>L.latLng(a,b)));
    map.fitBounds(b,{ padding:[32,32] });
  },[coords,map]);
  return null;
}

export default function LocationInsights({ insights, propertyLatLng }:{ insights: Insight[]; propertyLatLng: Record<string,{latitude:number;longitude:number}> }){
  const [radiusMi, setRadiusMi] = useState(3);
  const [bedsFilter, setBedsFilter] = useState<number|undefined>(undefined);
  const [bathsFilter, setBathsFilter] = useState<number|undefined>(undefined);
  const [loadingKey, setLoadingKey] = useState<string|null>(null);

  const summaries: LocationSummary[] = useMemo(()=>{
    const groups: Record<string, Insight[]> = {};
    for (const t of insights||[]) {
      const prop = (t.property||'').trim(); if (!prop) continue;
      (groups[prop] ||= []).push(t);
    }
    return Object.entries(groups).map(([property, tenants])=>{
      const latLng = propertyLatLng[property];
      const firstWithCoords = tenants.find(t=>hasCoords(t.lat,t.lng));
      const lat = firstWithCoords?.lat ?? latLng?.latitude;
      const lng = firstWithCoords?.lng ?? latLng?.longitude;
      const currentAvgRent = tenants.length ? Math.round( tenants.reduce((s,t)=> s + toNum(t.rent_amount), 0) / tenants.length ) : 0;
      const sumScore = tenants.reduce((s,t)=> s + (Number.isFinite(t.tenant_score)? (t.tenant_score as number) : 0), 0);
      const avgScore = tenants.length ? Math.round((sumScore/tenants.length)*10)/10 : 0;
      const totalRevenue = tenants.reduce((s,t)=> s + toNum(t.rent_amount), 0);
      return { property, units: tenants.length, avgScore, totalRevenue, lat, lng, currentAvgRent };
    });
  },[insights, propertyLatLng]);

  const [compMap, setCompMap] = useState<Record<string, Comp[]>>({});
  const [errorMap, setErrorMap] = useState<Record<string,string>>({});

  async function loadCompsFor(property:string, lat:number, lng:number){
    try{
      setLoadingKey(property);
      setErrorMap((m)=>({ ...m, [property]: '' }));
      const comps = await fetchComps(lat, lng, bedsFilter, bathsFilter, radiusMi, 50);
      setCompMap((m)=>({ ...m, [property]: comps }));
    }catch(e:any){
      setErrorMap((m)=>({ ...m, [property]: e?.message || 'Failed to load comps' }));
    }finally{
      setLoadingKey(null);
    }
  }

  const enriched = useMemo(()=>{
    return summaries.map((s)=>{
      const comps = compMap[s.property] || [];
      const rents = comps.map(c=>c.rent).filter((n)=>Number.isFinite(n) && n>0);
      const q = quantiles(rents);
      const compCount = rents.length;
      const suggestedLow = q.p25;
      const suggestedHigh = q.p75;
      const compMedian = q.p50;
      const deltaPct = s.currentAvgRent ? Math.round(((compMedian - s.currentAvgRent)/s.currentAvgRent)*100) : 0;
      return { ...s, comps, compCount, compMedian, compP25: q.p25, compP75: q.p75, suggestedLow, suggestedHigh, deltaPct } as LocationSummary;
    });
  },[summaries, compMap]);

  const allCoords: Array<[number,number]> = useMemo(()=>{
    const landlordCoords = enriched.filter(e=>hasCoords(e.lat,e.lng)).map(e=>[e.lat as number, e.lng as number]);
    const compCoords = Object.values(compMap).flat().filter(c=>hasCoords(c.lat,c.lng)).map(c=>[c.lat,c.lng]);
    return [...landlordCoords, ...compCoords];
  },[enriched, compMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Radius (miles)</label>
          <input type="number" min={1} max={15} step={0.5} value={radiusMi}
                 onChange={(e)=>setRadiusMi(Number(e.target.value))}
                 className="border rounded px-2 py-1 w-28"/>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Beds (optional)</label>
          <input type="number" min={0} max={6} step={1} value={bedsFilter ?? ''}
                 onChange={(e)=>setBedsFilter(e.target.value===''? undefined : Number(e.target.value))}
                 className="border rounded px-2 py-1 w-28"/>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Baths (optional)</label>
          <input type="number" min={0} max={6} step={0.5} value={bathsFilter ?? ''}
                 onChange={(e)=>setBathsFilter(e.target.value===''? undefined : Number(e.target.value))}
                 className="border rounded px-2 py-1 w-28"/>
        </div>
        <div className="text-xs text-gray-500">Set filters, then click “Load Comps” on each property card.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {enriched.map((loc)=>{
          const hasLatLng = hasCoords(loc.lat, loc.lng);
          return (
            <div key={loc.property} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold truncate" title={loc.property}>{loc.property}</h3>
                  <div className="text-gray-500 text-sm">{loc.units} units • Avg tenant score {loc.avgScore || 0}</div>
                  <div className="text-gray-500 text-sm">Current Avg Rent: {usd(loc.currentAvgRent || 0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold">{usd(loc.totalRevenue)}</div>
                  <div className="text-xs text-gray-500">Monthly Revenue</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-500">P25</div>
                  <div className="font-semibold">{loc.compCount? usd(loc.compP25||0) : '—'}</div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-500">Median</div>
                  <div className="font-semibold">{loc.compCount? usd(loc.compMedian||0) : '—'}</div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-500">P75</div>
                  <div className="font-semibold">{loc.compCount? usd(loc.compP75||0) : '—'}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">Suggested Band:</div>
                <div className="font-semibold">{loc.compCount? `${usd(loc.suggestedLow||0)} - ${usd(loc.suggestedHigh||0)}` : '—'}</div>
              </div>
              <div className={`text-sm ${loc.deltaPct&&loc.compCount? (loc.deltaPct>0?'text-green-600':'text-red-600'):'text-gray-500'}`}>
                {loc.compCount? (loc.deltaPct>0? `Market +${loc.deltaPct}% vs current avg` : `Market ${loc.deltaPct}% vs current avg`) : 'Load comps to compare'}
              </div>

              <div className="flex items-center gap-3 mt-1">
                <button
                  disabled={!hasLatLng || loadingKey===loc.property}
                  onClick={()=> hasLatLng && loadCompsFor(loc.property, loc.lat as number, loc.lng as number)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${hasLatLng? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                  {loadingKey===loc.property? 'Loading…' : 'Load Comps'}
                </button>
                {!hasLatLng && (
                  <span className="text-xs text-amber-600">Add coordinates for this property</span>
                )}
                {errorMap[loc.property] && (
                  <span className="text-xs text-red-600">{errorMap[loc.property]}</span>
                )}
              </div>

              {loc.comps && loc.comps.length>0 && (
                <div className="mt-2 border-t pt-2 max-h-48 overflow-auto text-sm divide-y">
                  {loc.comps.slice(0,6).map((c)=> (
                    <div key={c.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate" title={c.address}>{c.address}</div>
                        <div className="text-xs text-gray-500">{[c.beds?`${c.beds}bd`:null, c.baths?`${c.baths}ba`:null, c.distance_mi?`${c.distance_mi.toFixed?.(1)} mi`:null].filter(Boolean).join(' • ')}</div>
                      </div>
                      <div className="font-semibold">{usd(c.rent)}</div>
                    </div>
                  ))}
                  {loc.comps.length>6 && <div className="text-xs text-gray-500 py-1">+{loc.comps.length-6} more…</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="h-[30rem] w-full rounded-xl overflow-hidden shadow ring-1 ring-black/5">
        <MapContainer center={[35.7596, -79.0193]} zoom={8} style={{height:'100%', width:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <FitToAll coords={allCoords} />

          {enriched.filter(e=>hasCoords(e.lat,e.lng)).map((e)=> (
            <Marker key={`landlord-${e.property}`} position={[e.lat as number, e.lng as number]} icon={landlordIcon}>
              <Popup>
                <b>{e.property}</b><br/>
                {e.units} units<br/>
                Current Avg: {usd(e.currentAvgRent||0)}<br/>
                Market Median: {Number.isFinite(e.compMedian)? usd(e.compMedian||0) : '—'}<br/>
                Suggested: {e.compCount? `${usd(e.suggestedLow||0)} - ${usd(e.suggestedHigh||0)}`:'—'}
              </Popup>
            </Marker>
          ))}

          {Object.entries(compMap).flatMap(([prop, list]) =>
            list.map((c) => (
              <Marker key={`comp-${prop}-${c.id}`} position={[c.lat, c.lng]} icon={compIcon}>
                <Popup>
                  <b>{c.address}</b>
                  <br />
                  {[c.beds ? `${c.beds}bd` : null, c.baths ? `${c.baths}ba` : null, c.sqft ? `${c.sqft} sqft` : null]
                    .filter(Boolean)
                    .join(' • ')}
                  <br />
                  Rent: {usd(c.rent)}
                  {c.distance_mi ? ` • ${c.distance_mi.toFixed?.(1)} mi` : ''}
                  <br />
                  Source: {c.source}
                  {c.url ? (
                    <>
                      {' '}
                      •{' '}
                      <a href={c.url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </>
                  ) : null}
                </Popup>
              </Marker>
            ))
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-indigo-600 inline-block rounded-sm" /> Comparable Listing
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-gray-600 inline-block rounded-sm" /> Landlord Property
        </div>
      </div>
    </div>
  );
}

export { LocationInsights };

/*
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Map property name to latitude/longitude
const propertyLatLng = {
  // Add your properties here:
  'The Villas at Park Terrace - 301 Walkertown Ave Winston Salem, NC 27105': { latitude: 36.1170555787963, longitude: -80.20638809515557}
};

export function LocationInsights({ insights }) {
  // Group by property and summarize stats
  const locationSummaries = useMemo(() => {
    const groups = {};
    for (const t of insights) {
      if (!t.property) continue;
      if (!groups[t.property]) groups[t.property] = [];
      groups[t.property].push(t);
    }
    return Object.entries(groups).map(([property, tenants]) => {
      const avgScore =
        tenants.reduce((s, t) => s + (t.tenant_score || 0), 0) / tenants.length;
      const totalRevenue = tenants.reduce(
        (sum, t) =>
          sum +
          (typeof t.rent_amount === 'number'
            ? t.rent_amount
            : Number(t.rent_amount) || 0),
        0
      );
      // Use hardcoded lat/lng for the property if available
      const latLng = propertyLatLng[property] || {};
      return {
        property,
        units: tenants.length,
        avgScore: Math.round(avgScore * 10) / 10,
        totalRevenue,
        lat: latLng.latitude,
        lng: latLng.longitude,
      };
    });
  }, [insights]);

  // For the map, pick first valid lat/lng or default (NC center)
  const mapCenter = useMemo(() => {
    const withCoords = locationSummaries.find(
      l => typeof l.lat === 'number' && typeof l.lng === 'number'
    );
    return withCoords
      ? [withCoords.lat, withCoords.lng]
      : [35.7596, -79.0193];
  }, [locationSummaries]);

  const mapZoom = locationSummaries.length === 1 ? 16 : 12;
  
  return (
    <div className="space-y-8">
      {/* Property cards }
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locationSummaries.map(loc => (
          <div
            key={loc.property}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col gap-2"
          >
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-lg font-bold">{loc.property}</h3>
                <div className="text-gray-500 text-sm">{loc.units} units</div>
              </div>
              <div className="text-right">
                <div className="text-green-600 text-2xl font-bold">
                  ${loc.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Total Revenue</div>
              </div>
            </div>
            <div>
              <span className="font-medium">Avg Score: </span>
              <span
                className={
                  loc.avgScore >= 80
                    ? 'text-green-500'
                    : loc.avgScore >= 60
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }
              >
                {loc.avgScore}
              </span>
            </div>
          </div>
        ))}
      </div>
      {/* Interactive map }
      {locationSummaries.some(l => l.lat && l.lng) && (
        <div className="h-96 w-full rounded-lg overflow-hidden shadow">
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {locationSummaries
              .filter(l => l.lat && l.lng)
              .map(l => (
                <Marker position={[l.lat, l.lng]} key={l.property}>
                  <Popup>
                    <strong>{l.property}</strong>
                    <br />
                    Units: {l.units}
                    <br />
                    Total Revenue: ${l.totalRevenue.toLocaleString()}
                    <br />
                    Avg Score: {l.avgScore}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      )}
      {!locationSummaries.some(l => l.lat && l.lng) && (
        <div className="p-6 bg-gray-100 text-gray-600 rounded-lg text-center">
          <p>
            No property coordinates provided. Add entries to <code>propertyLatLng</code> above to see properties on the map.
          </p>
        </div>
      )}
    </div>
  );
}
*/

/*
import React, { useState, useEffect, useMemo } from 'react';
import { LocationInsight } from '../types';
import { Building2, Loader2, TrendingUp, Users, Construction, ArrowUpRight, Brain, Search, MapPin, Newspaper, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const customIcon = new L.Icon({
  iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationInsightsProps {
  insights: any[];
}

export function LocationInsights({ insights }: LocationInsightsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInsights, setLocationInsights] = useState<LocationInsight[]>([]);
  const [generatingProgress, setGeneratingProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationInsight | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.7596, -79.0193]);
  const [mapZoom, setMapZoom] = useState(7);

  useEffect(() => {
    if (locationInsights.length > 0) {
      const firstLocation = locationInsights[0];
      if (isValidLatLng(firstLocation.latitude, firstLocation.longitude)) {
        setMapCenter([firstLocation.latitude, firstLocation.longitude]);
      }
    }
  }, [locationInsights]);

  const isValidLatLng = (lat: number | undefined, lng: number | undefined): boolean => {
    return typeof lat === 'number' && 
           typeof lng === 'number' && 
           !isNaN(lat) && 
           !isNaN(lng) && 
           lat >= -90 && 
           lat <= 90 && 
           lng >= -180 && 
           lng <= 180;
  };

  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locationInsights;
    const query = searchQuery.toLowerCase();
    return locationInsights.filter(location => 
      location.property.toLowerCase().includes(query)
    );
  }, [locationInsights, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchLocationInsights();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && generatingProgress < 95) {
      interval = setInterval(() => {
        setGeneratingProgress(prev => {
          const increment = Math.random() * 15;
          const newProgress = prev + increment;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, generatingProgress]);

  const fetchLocationInsights = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('location_insights')
        .select('*')
        .eq('user_id', user?.id);

      if (fetchError) throw fetchError;
      if (data) {
        setLocationInsights(data);
      }
    } catch (err) {
      console.error('Error fetching location insights:', err);
    }
  };

  const generateLocationInsights = async () => {
    if (!user) {
      setError('Please log in to generate insights');
      return;
    }

    const uniqueProperties = [...new Set(insights.map(insight => insight.property))];
    setLoading(true);
    setError(null);
    setIsGenerating(true);
    setGeneratingProgress(0);

    try {
      // Assume you want to use the user's access token for protected functions
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/generate-location-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabase.supabaseKey}`
        },
        body: JSON.stringify({
          properties: uniqueProperties,
          user_id: user.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate insights: ${errorText}`);
      }

      const data = await response.json();
      setGeneratingProgress(100);
      
      setTimeout(() => {
        fetchLocationInsights();
        setIsGenerating(false);
        setGeneratingProgress(0);
      }, 500);
    } catch (err) {
      console.error('Error generating location insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate location insights');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getVacancyColor = (rate: string) => {
    const percentage = parseFloat(rate);
    if (percentage <= 5) return 'text-green-500';
    if (percentage <= 10) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMarketStrengthDisplay = (score: number) => {
    const percentage = (score / 10) * 100;
    const getColor = () => {
      if (score >= 8) return 'bg-green-500';
      if (score >= 6) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="relative pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Market Strength</span>
          <span className={`text-xs font-bold ${getScoreColor(score)}`}>{score}/10</span>
        </div>
        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: `${percentage}%` }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getColor()}`}
          />
        </div>
      </div>
    );
  };

  const getVacancyDisplay = (rate: string) => {
    const percentage = parseFloat(rate);
    const width = Math.min(percentage * 2, 100);
    
    const getColor = () => {
      if (percentage <= 5) return 'bg-green-500';
      if (percentage <= 10) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="relative pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Vacancy Rate</span>
          <span className={`text-xs font-bold ${getVacancyColor(rate)}`}>{rate}</span>
        </div>
        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: `${width}%` }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getColor()}`}
          />
        </div>
      </div>
    );
  };

  const getTrendDisplay = (trend: string) => {
    const getTrendIcon = () => {
      switch (trend.toLowerCase()) {
        case 'increasing':
          return <TrendingUp className="w-4 h-4 text-green-500" />;
        case 'stable':
          return <ArrowUpRight className="w-4 h-4 text-yellow-500" />;
        default:
          return <ArrowDown className="w-4 h-4 text-red-500" />;
      }
    };

    const getTrendColor = () => {
      switch (trend.toLowerCase()) {
        case 'increasing':
          return 'text-green-500';
        case 'stable':
          return 'text-yellow-500';
        default:
          return 'text-red-500';
      }
    };

    return (
      <div className="flex-1">
        <div className="text-xs font-semibold text-gray-700 mb-1">Rent Trend</div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>{trend}</span>
        </div>
      </div>
    );
  };

  const getConstructionDisplay = (supply: string) => {
    const getSupplyIcon = () => {
      switch (supply.toLowerCase()) {
        case 'low':
          return <Construction className="w-4 h-4 text-green-500" />;
        case 'moderate':
          return <Construction className="w-4 h-4 text-yellow-500" />;
        default:
          return <Construction className="w-4 h-4 text-red-500" />;
      }
    };

    const getSupplyColor = () => {
      switch (supply.toLowerCase()) {
        case 'low':
          return 'text-green-500';
        case 'moderate':
          return 'text-yellow-500';
        default:
          return 'text-red-500';
      }
    };

    return (
      <div className="flex-1">
        <div className="text-xs font-semibold text-gray-700 mb-1">Construction</div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          {getSupplyIcon()}
          <span className={`text-sm font-medium ${getSupplyColor()}`}>{supply}</span>
        </div>
      </div>
    );
  };

  const handleMarkerClick = (location: LocationInsight) => {
    setSelectedLocation(location);
  };

  const resetMapView = () => {
    if (locationInsights.length > 0) {
      const validLocations = locationInsights.filter(loc => 
        isValidLatLng(loc.latitude, loc.longitude)
      );

      if (validLocations.length > 0) {
        const firstLoc = validLocations[0];
        setMapCenter([firstLoc.latitude, firstLoc.longitude]);
        setMapZoom(7);
      } else {
        setMapCenter([35.7596, -79.0193]);
        setMapZoom(7);
      }
    }
  };

  function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
  }

  return (
    <div className="space-y-6">
    </div>
  );
}
*/