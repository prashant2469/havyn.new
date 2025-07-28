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
      const response = await fetch(${supabase.supabaseUrl}/functions/v1/generate-location-insights, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': Bearer ${supabase.supabaseKey}
        },
        body: JSON.stringify({
          properties: uniqueProperties,
          user_id: user.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(Failed to generate insights: ${errorText});
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

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'increasing':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'stable':
        return <ArrowUpRight className="w-5 h-5 text-yellow-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-red-500 transform rotate-180" />;
    }
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
          <span className={text-xs font-bold ${getScoreColor(score)}}>{score}/10</span>
        </div>
        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: ${percentage}% }}
            className={shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getColor()}}
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
          <span className={text-xs font-bold ${getVacancyColor(rate)}}>{rate}</span>
        </div>
        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: ${width}% }}
            className={shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getColor()}}
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
          <span className={text-sm font-medium ${getTrendColor()}}>{trend}</span>
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
          <span className={text-sm font-medium ${getSupplyColor()}}>{supply}</span>
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Location Analysis</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 
                focus:outline-none focus:ring-2 focus:ring-havyn-primary dark:focus:ring-green-400
                w-64"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
          <button
            onClick={generateLocationInsights}
            disabled={loading || isGenerating}
            className="px-4 py-2 bg-havyn-primary text-white rounded-lg hover:bg-havyn-dark 
              disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5" />
                <span>Generate Location Insights</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {isGenerating && generatingProgress > 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-havyn-primary dark:text-green-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-havyn-primary dark:text-green-400">
              Analyzing Locations
            </h3>
          </div>
          <div className="space-y-4">
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-havyn-primary dark:bg-green-400 rounded-full transition-all duration-300"
                style={{ width: ${generatingProgress}% }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {generatingProgress < 30 && "Analyzing market data..."}
              {generatingProgress >= 30 && generatingProgress < 60 && "Calculating market trends..."}
              {generatingProgress >= 60 && generatingProgress < 90 && "Generating recommendations..."}
              {generatingProgress >= 90 && "Finalizing analysis..."}
            </p>
          </div>
        </div>
      )}

      {locationInsights.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-h-[600px] overflow-y-auto">
            <div className="space-y-2">
              {filteredLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    setSelectedLocation(location);
                    if (isValidLatLng(location.latitude, location.longitude)) {
                      setMapCenter([location.latitude, location.longitude]);
                      setMapZoom(15);
                    }
                  }}
                  className={w-full text-left p-3 rounded-lg transition-colors ${
                    selectedLocation?.id === location.id
                      ? 'bg-havyn-primary bg-opacity-10 dark:bg-opacity-20'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className={w-5 h-5 flex-shrink-0 ${
                      selectedLocation?.id === location.id
                        ? 'text-havyn-primary dark:text-green-400'
                        : 'text-gray-400'
                    }} />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {location.property}
                      </div>
                      <div className={text-sm font-medium ${getScoreColor(location.rental_market_strength_score)}}>
                        Score: {location.rental_market_strength_score}/10
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="relative h-[600px] w-full">
              <button
                onClick={resetMapView}
                className="absolute top-4 right-4 z-[1000] px-3 py-2 bg-white dark:bg-gray-800 
                  rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 
                  text-gray-700 dark:text-gray-300 text-sm font-medium
                  border border-gray-200 dark:border-gray-600
                  transition-colors flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Reset View</span>
              </button>

              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <MapUpdater center={mapCenter} zoom={mapZoom} />
                {filteredLocations.map((location) => {
                  if (isValidLatLng(location.latitude, location.longitude)) {
                    return (
                      <Marker 
                        key={location.id} 
                        position={[location.latitude, location.longitude]}
                        icon={customIcon}
                        eventHandlers={{
                          click: () => handleMarkerClick(location)
                        }}
                      >
                        <Popup maxWidth={400} maxHeight={400}>
                          <div className="p-4 space-y-4">
                            <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                              <div className="w-full">
                                <h3 className="text-lg font-semibold text-gray-900">{location.property}</h3>
                                {getMarketStrengthDisplay(location.rental_market_strength_score)}
                              </div>
                            </div>

                            <div className="space-y-4">
                              {getVacancyDisplay(location.vacancy_rate)}
                              
                              <div className="flex gap-3">
                                {getTrendDisplay(location.rent_trend)}
                                {getConstructionDisplay(location.new_construction_supply)}
                              </div>
                            </div>

                            {location.competitor_summary && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-gray-600" />
                                  Competition Analysis
                                </h4>
                                <p className="text-sm text-gray-600">{location.competitor_summary}</p>
                              </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-gray-600" />
                                Market Summary
                              </h4>
                              <p className="text-sm text-gray-600">{location.overall_market_summary}</p>
                            </div>

                            {location.recent_news_summary && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                  <Newspaper className="w-4 h-4 text-gray-600" />
                                  Recent News
                                </h4>
                                <p className="text-sm text-gray-600">{location.recent_news_summary}</p>
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }
                  return null;
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


