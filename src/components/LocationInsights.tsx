import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Map property name to latitude/longitude
const propertyLatLng = {
  // Add your properties here:
  'The Villas at Park Terrace - 301 Walkertown Ave Winston Salem, NC 27105': { latitude: 36.1170555787963, longitude: -80.20638809515557}
};

const mapZoom = locationSummaries.length === 1 ? 16 : 12;

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

  return (
    <div className="space-y-8">
      {/* Property cards */}
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
      {/* Interactive map */}
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