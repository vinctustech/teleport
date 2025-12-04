import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  IonSpinner,
  IonIcon,
  IonList,
} from '@ionic/react';
import { navigate } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapRoute.css';
import { SearchBoxCore, SessionToken } from '@mapbox/search-js-core';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZWRhZG1hLXRlbGVwb3J0IiwiYSI6ImNtaXJtc29nbjA4d3czZW9kYjVsOW8xNjkifQ.iX4d_eQkCMZ2N52GxMMVLg';

// Fix Leaflet default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom marker icons
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const currentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapRouteProps {
  onStart: (routeGeometry: [number, number][], totalDistance: number, speed: number) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: (callback: () => void) => void;
  currentLocation: { latitude: number; longitude: number } | null;
  distanceTraveled: number; // meters traveled so far
}

interface Suggestion {
  mapbox_id: string;
  name: string;
  full_address?: string;
  place_formatted?: string;
  context?: {
    place?: { name: string };
    region?: { name: string };
    country?: { name: string };
  };
}

interface RouteInfo {
  distance: number;
  duration: number;
  geometry: [number, number][];
}

// Component to update map view when bounds change
const MapBoundsUpdater: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [bounds, map]);
  return null;
};

// Component to fix map size when container becomes visible
const MapSizeInvalidator: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timeout1 = setTimeout(() => map.invalidateSize(), 100);
    const timeout2 = setTimeout(() => map.invalidateSize(), 500);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    const handleMoveEnd = () => {
      setTimeout(() => map.invalidateSize(), 50);
    };
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      window.removeEventListener('resize', handleResize);
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map]);
  return null;
};

const MapRoute: React.FC<MapRouteProps> = ({
  onStart,
  onStop,
  onPause,
  onResume,
  onComplete,
  currentLocation,
  distanceTraveled,
}) => {
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused'>('idle');

  useEffect(() => {
    // Register completion callback with parent
    onComplete(() => {
      setSimState('idle');
    });
  }, [onComplete]);
  // Coordinates state
  const [biasCoords, setBiasCoords] = useState<{ lat: number; lon: number }>({ lat: 45.5017, lon: -73.5673 });
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Input values
  const [biasInput, setBiasInput] = useState('Montreal, QC');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  // Suggestions state
  const [biasSuggestions, setBiasSuggestions] = useState<Suggestion[]>([]);
  const [startSuggestions, setStartSuggestions] = useState<Suggestion[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<Suggestion[]>([]);
  const [showBiasSuggestions, setShowBiasSuggestions] = useState(false);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);

  // Other state
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [speed, setSpeed] = useState(40);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);

  // Refs
  const searchBoxRef = useRef<SearchBoxCore | null>(null);
  const sessionTokenRef = useRef<SessionToken | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Default center (Montreal)
  const defaultCenter: [number, number] = [45.5017, -73.5673];

  // Initialize Mapbox search
  useEffect(() => {
    searchBoxRef.current = new SearchBoxCore({ accessToken: MAPBOX_TOKEN });
    sessionTokenRef.current = new SessionToken();
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (
    query: string,
    proximity: { lat: number; lon: number } | null,
    types?: string
  ): Promise<Suggestion[]> => {
    if (query.length < 2 || !searchBoxRef.current || !sessionTokenRef.current) {
      return [];
    }

    try {
      const options: Parameters<SearchBoxCore['suggest']>[1] = {
        sessionToken: sessionTokenRef.current,
        language: 'en',
        limit: 5,
      };

      if (proximity) {
        // Set proximity for ranking bias
        options.proximity = [proximity.lon, proximity.lat];
        // Add bounding box to restrict results (~150km radius around bias point)
        const latOffset = 1.35; // ~150km
        const lonOffset = 1.8;  // ~150km at mid-latitudes
        options.bbox = [
          proximity.lon - lonOffset, // west
          proximity.lat - latOffset, // south
          proximity.lon + lonOffset, // east
          proximity.lat + latOffset, // north
        ];
      }

      if (types) {
        options.types = types;
      }

      const response = await searchBoxRef.current.suggest(query, options);
      return response.suggestions || [];
    } catch (err) {
      console.error('Mapbox suggest error:', err);
      return [];
    }
  }, []);

  // Retrieve coordinates for a suggestion
  const retrieveCoordinates = useCallback(async (mapboxId: string): Promise<{ lat: number; lon: number } | null> => {
    if (!searchBoxRef.current || !sessionTokenRef.current) return null;

    try {
      const result = await searchBoxRef.current.retrieve(
        { mapbox_id: mapboxId } as Parameters<SearchBoxCore['retrieve']>[0],
        { sessionToken: sessionTokenRef.current }
      );

      if (result.features && result.features.length > 0) {
        const [lon, lat] = result.features[0].geometry.coordinates;
        sessionTokenRef.current = new SessionToken();
        return { lat, lon };
      }
      return null;
    } catch (err) {
      console.error('Mapbox retrieve error:', err);
      return null;
    }
  }, []);

  // Debounced search handler
  const handleSearch = useCallback((
    value: string,
    setSuggestions: React.Dispatch<React.SetStateAction<Suggestion[]>>,
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
    proximity: { lat: number; lon: number } | null,
    types?: string
  ) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setSuggestions([]);
      setShow(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const suggestions = await fetchSuggestions(value, proximity, types);
      setSuggestions(suggestions);
      setShow(suggestions.length > 0);
    }, 200);
  }, [fetchSuggestions]);

  // Handle suggestion selection
  const handleSelect = useCallback(async (
    suggestion: Suggestion,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    setCoords: React.Dispatch<React.SetStateAction<{ lat: number; lon: number } | null>> | React.Dispatch<React.SetStateAction<{ lat: number; lon: number }>>,
    setSuggestions: React.Dispatch<React.SetStateAction<Suggestion[]>>,
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
    isBiasField?: boolean
  ) => {
    let displayName: string;
    if (isBiasField) {
      // For bias field, show "City, Region, Country" format
      const parts = [suggestion.name];
      if (suggestion.context?.region?.name) {
        parts.push(suggestion.context.region.name);
      }
      if (suggestion.context?.country?.name) {
        parts.push(suggestion.context.country.name);
      }
      displayName = parts.join(', ');
    } else {
      // For addresses, show full address
      displayName = suggestion.full_address || suggestion.place_formatted || suggestion.name;
    }
    setInput(displayName);
    setSuggestions([]);
    setShow(false);

    const coords = await retrieveCoordinates(suggestion.mapbox_id);
    if (coords) {
      setCoords(coords);
    }
  }, [retrieveCoordinates]);

  // Get route from OSRM
  const getRoute = async (
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): Promise<RouteInfo | null> => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const geometry: [number, number][] = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );
        return {
          distance: route.distance,
          duration: route.duration,
          geometry,
        };
      }
      return null;
    } catch (err) {
      console.error('Routing error:', err);
      return null;
    }
  };

  // Fetch route when both coordinates are set
  useEffect(() => {
    const fetchRoute = async () => {
      if (startCoords && endCoords) {
        setLoading(true);
        setError(null);
        const route = await getRoute(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon);
        if (route) {
          setRouteInfo(route);
          const bounds = L.latLngBounds(route.geometry);
          setMapBounds(bounds);
        } else {
          setError('Could not calculate route');
        }
        setLoading(false);
      }
    };
    fetchRoute();
  }, [startCoords, endCoords]);

  // Update bounds when markers change
  useEffect(() => {
    if (startCoords && !endCoords) {
      setMapBounds([[startCoords.lat, startCoords.lon], [startCoords.lat, startCoords.lon]]);
    } else if (!startCoords && endCoords) {
      setMapBounds([[endCoords.lat, endCoords.lon], [endCoords.lat, endCoords.lon]]);
    }
  }, [startCoords, endCoords]);

  const handleStart = () => {
    if (startCoords && endCoords && routeInfo) {
      setSimState('running');
      onStart(routeInfo.geometry, routeInfo.distance, speed);
    }
  };

  const handleStop = () => {
    setSimState('idle');
    onStop();
  };

  const handlePause = () => {
    setSimState('paused');
    onPause();
  };

  const handleResume = () => {
    setSimState('running');
    onResume();
  };

  const formatDuration = (seconds: number): string => {
    const totalSeconds = Math.round(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins} min ${secs} sec`;
    }
    if (mins > 0) {
      return `${mins} min ${secs} sec`;
    }
    return `${secs} sec`;
  };

  // Calculate remaining time based on distance and speed (no API calls)
  const calculateRemainingTime = (remainingMeters: number, speedKmh: number): string => {
    if (speedKmh <= 0) return '0 sec';
    const remainingKm = remainingMeters / 1000;
    const hoursRemaining = remainingKm / speedKmh;
    const secondsRemaining = hoursRemaining * 3600;
    return formatDuration(secondsRemaining);
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Route Planning</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          {/* Location Bias Field */}
          <div className="search-field">
            <IonItem>
              <IonLabel position="stacked">Search Bias (city/region)</IonLabel>
              <IonInput
                value={biasInput}
                placeholder="e.g., Montreal, QC"
                onIonInput={(e) => {
                  const value = e.detail.value || '';
                  setBiasInput(value);
                  handleSearch(value, setBiasSuggestions, setShowBiasSuggestions, null, 'place,locality,neighborhood');
                }}
                onIonFocus={() => biasSuggestions.length > 0 && setShowBiasSuggestions(true)}
                onIonBlur={() => setTimeout(() => setShowBiasSuggestions(false), 200)}
                disabled={simState !== 'idle'}
              />
            </IonItem>
            {showBiasSuggestions && biasSuggestions.length > 0 && (
              <IonList className="suggestions-list">
                {biasSuggestions.map((suggestion) => (
                  <IonItem
                    key={suggestion.mapbox_id}
                    button
                    onClick={() => handleSelect(suggestion, setBiasInput, setBiasCoords, setBiasSuggestions, setShowBiasSuggestions, true)}
                  >
                    <IonLabel>
                      <h3>{suggestion.name}</h3>
                      <p>{suggestion.place_formatted}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </div>

          {/* Start Address */}
          <div className="search-field">
            <IonItem>
              <IonLabel position="stacked">
                Start Address {startCoords && <IonText color="success">✓</IonText>}
              </IonLabel>
              <IonInput
                value={startInput}
                placeholder="Type to search..."
                onIonInput={(e) => {
                  const value = e.detail.value || '';
                  setStartInput(value);
                  setStartCoords(null);
                  handleSearch(value, setStartSuggestions, setShowStartSuggestions, biasCoords);
                }}
                onIonFocus={() => startSuggestions.length > 0 && setShowStartSuggestions(true)}
                onIonBlur={() => setTimeout(() => setShowStartSuggestions(false), 200)}
                disabled={simState !== 'idle'}
              />
            </IonItem>
            {showStartSuggestions && startSuggestions.length > 0 && (
              <IonList className="suggestions-list">
                {startSuggestions.map((suggestion) => {
                  const city = suggestion.context?.place?.name;
                  const subtitle = city
                    ? `${city}, ${suggestion.place_formatted || suggestion.full_address || ''}`
                    : (suggestion.place_formatted || suggestion.full_address);
                  return (
                    <IonItem
                      key={suggestion.mapbox_id}
                      button
                      onClick={() => handleSelect(suggestion, setStartInput, setStartCoords, setStartSuggestions, setShowStartSuggestions)}
                    >
                      <IonLabel>
                        <h3>{suggestion.name}</h3>
                        <p>{subtitle}</p>
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
            )}
          </div>

          {/* End Address */}
          <div className="search-field">
            <IonItem>
              <IonLabel position="stacked">
                End Address {endCoords && <IonText color="success">✓</IonText>}
              </IonLabel>
              <IonInput
                value={endInput}
                placeholder="Type to search..."
                onIonInput={(e) => {
                  const value = e.detail.value || '';
                  setEndInput(value);
                  setEndCoords(null);
                  handleSearch(value, setEndSuggestions, setShowEndSuggestions, biasCoords);
                }}
                onIonFocus={() => endSuggestions.length > 0 && setShowEndSuggestions(true)}
                onIonBlur={() => setTimeout(() => setShowEndSuggestions(false), 200)}
                disabled={simState !== 'idle'}
              />
            </IonItem>
            {showEndSuggestions && endSuggestions.length > 0 && (
              <IonList className="suggestions-list">
                {endSuggestions.map((suggestion) => {
                  const city = suggestion.context?.place?.name;
                  const subtitle = city
                    ? `${city}, ${suggestion.place_formatted || suggestion.full_address || ''}`
                    : (suggestion.place_formatted || suggestion.full_address);
                  return (
                    <IonItem
                      key={suggestion.mapbox_id}
                      button
                      onClick={() => handleSelect(suggestion, setEndInput, setEndCoords, setEndSuggestions, setShowEndSuggestions)}
                    >
                      <IonLabel>
                        <h3>{suggestion.name}</h3>
                        <p>{subtitle}</p>
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
            )}
          </div>

          <IonItem>
            <IonLabel position="stacked">Speed (km/h)</IonLabel>
            <IonInput
              type="number"
              value={speed}
              onIonInput={(e) => setSpeed(parseInt(e.detail.value || '40', 10))}
              disabled={simState !== 'idle'}
            />
          </IonItem>

          {error && (
            <IonText color="danger">
              <p style={{ margin: '8px 0' }}>{error}</p>
            </IonText>
          )}

          {/* Reserved space for route info to prevent layout shift */}
          <div className="route-info-container">
            {loading ? (
              <div className="route-info-loading">
                <IonSpinner name="dots" />
              </div>
            ) : routeInfo ? (
              <div className="route-info">
                <IonText color="primary">
                  <p>
                    <IonIcon icon={navigate} />{' '}
                    {formatDistance(routeInfo.distance)} • {calculateRemainingTime(routeInfo.distance, speed)}
                    {simState !== 'idle' && (
                      <> • ETA {calculateRemainingTime(Math.max(0, routeInfo.distance - distanceTraveled), speed)}</>
                    )}
                  </p>
                </IonText>
              </div>
            ) : (
              <div className="route-info-placeholder">
                <IonText color="medium">
                  <p>Enter start and end addresses</p>
                </IonText>
              </div>
            )}
          </div>

          {simState === 'idle' && (
            <div className="button-container">
              <IonButton
                expand="block"
                color="success"
                onClick={handleStart}
                disabled={!startCoords || !endCoords || !routeInfo || loading}
                style={{ flex: 1, margin: 0 }}
              >
                Start
              </IonButton>
            </div>
          )}
          {simState === 'paused' && (
            <div className="button-container">
              <IonButton expand="block" color="primary" onClick={handleResume} style={{ flex: 1, margin: 0 }}>
                Resume
              </IonButton>
              <IonButton expand="block" color="danger" onClick={handleStop} style={{ flex: 1, margin: 0 }}>
                Stop
              </IonButton>
            </div>
          )}
          {simState === 'running' && (
            <div className="button-container">
              <IonButton expand="block" color="warning" onClick={handlePause} style={{ flex: 1, margin: 0 }}>
                Pause
              </IonButton>
              <IonButton expand="block" color="danger" onClick={handleStop} style={{ flex: 1, margin: 0 }}>
                Stop
              </IonButton>
            </div>
          )}
        </IonCardContent>
      </IonCard>

      <IonCard className="map-card">
        <IonCardContent style={{ padding: 0 }}>
          <div className="map-container">
            <MapContainer
              center={defaultCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapSizeInvalidator />
              <MapBoundsUpdater bounds={mapBounds} />

              {startCoords && (
                <Marker position={[startCoords.lat, startCoords.lon]} icon={startIcon} />
              )}
              {endCoords && (
                <Marker position={[endCoords.lat, endCoords.lon]} icon={endIcon} />
              )}
              {currentLocation && simState !== 'idle' && (
                <Marker
                  position={[currentLocation.latitude, currentLocation.longitude]}
                  icon={currentIcon}
                />
              )}
              {routeInfo && (
                <Polyline positions={routeInfo.geometry} color="#3880ff" weight={4} />
              )}
            </MapContainer>
          </div>
        </IonCardContent>
      </IonCard>
    </>
  );
};

export default MapRoute;
