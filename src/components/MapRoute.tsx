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
import { navigate, play, stop, location } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapRoute.css';

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
  onStartSimulation: (startLat: number, startLon: number, endLat: number, endLon: number, speed: number) => void;
  onStopSimulation: () => void;
  currentLocation: { latitude: number; longitude: number } | null;
  isSimulating: boolean;
}

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface AutocompleteOption {
  lat: number;
  lon: number;
  label: string;
}

interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][]; // [lat, lon] pairs
}

// Component to update map view when bounds change
const MapBoundsUpdater: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

// Component to fix map size when container becomes visible
const MapSizeInvalidator: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    // Invalidate size immediately and after delays
    map.invalidateSize();
    const timeout1 = setTimeout(() => map.invalidateSize(), 100);
    const timeout2 = setTimeout(() => map.invalidateSize(), 500);

    // Also invalidate on any resize
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    // Invalidate after move/zoom to fix tile loading issues
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
  onStartSimulation,
  onStopSimulation,
  currentLocation,
  isSimulating,
}) => {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [biasLocation, setBiasLocation] = useState('Montreal, QC');
  const [biasCoords, setBiasCoords] = useState<{ lat: number; lon: number } | null>({ lat: 45.5017, lon: -73.5673 });
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [speed, setSpeed] = useState(40);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);

  // Autocomplete state
  const [startSuggestions, setStartSuggestions] = useState<AutocompleteOption[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<AutocompleteOption[]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [biasSuggestions, setBiasSuggestions] = useState<AutocompleteOption[]>([]);
  const [showBiasSuggestions, setShowBiasSuggestions] = useState(false);

  // Refs for debouncing
  const startDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const endDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const biasDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Default center (Montreal)
  const defaultCenter: [number, number] = [45.5017, -73.5673];

  // Geocode an address using Nominatim
  const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'Teleport GPS Testing App',
          },
        }
      );
      const results = await response.json();
      if (results && results.length > 0) {
        return results[0];
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  // Extract short location name from full address for query biasing
  const getShortBiasName = useCallback((): string => {
    if (!biasLocation) return '';
    // Get first part before comma (usually city name)
    const parts = biasLocation.split(',');
    return parts[0].trim();
  }, [biasLocation]);

  // Fetch autocomplete suggestions from Nominatim (with optional bias)
  const fetchSuggestions = useCallback(async (query: string, useBias: boolean = true): Promise<AutocompleteOption[]> => {
    if (query.length < 3) {
      return [];
    }
    try {
      // Append bias location name to query for better local results
      let searchQuery = query;
      if (useBias && biasCoords) {
        const biasName = getShortBiasName();
        if (biasName && !query.toLowerCase().includes(biasName.toLowerCase())) {
          searchQuery = `${query} ${biasName}`;
        }
      }
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Teleport GPS Testing App' },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        return data.map((item: GeocodingResult) => ({
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          label: item.display_name,
        }));
      }
      return [];
    } catch (err) {
      console.error('Autocomplete error:', err);
      return [];
    }
  }, [biasCoords, getShortBiasName]);

  // Debounced autocomplete for bias location (unbiased search)
  const handleBiasAddressChange = (value: string) => {
    setBiasLocation(value);
    setBiasCoords(null); // Clear coords when typing

    if (biasDebounceRef.current) {
      clearTimeout(biasDebounceRef.current);
    }

    if (value.length >= 3) {
      biasDebounceRef.current = setTimeout(async () => {
        const suggestions = await fetchSuggestions(value, false); // unbiased
        setBiasSuggestions(suggestions);
        setShowBiasSuggestions(suggestions.length > 0);
      }, 150);
    } else {
      setBiasSuggestions([]);
      setShowBiasSuggestions(false);
    }
  };

  // Handle selecting a bias suggestion
  const handleBiasSelect = (option: AutocompleteOption) => {
    setBiasLocation(option.label);
    setBiasCoords({ lat: option.lat, lon: option.lon });
    setShowBiasSuggestions(false);
    setBiasSuggestions([]);
  };

  // Debounced autocomplete for start address
  const handleStartAddressChange = (value: string) => {
    setStartAddress(value);
    setStartCoords(null); // Clear coords when typing

    if (startDebounceRef.current) {
      clearTimeout(startDebounceRef.current);
    }

    if (value.length >= 3) {
      startDebounceRef.current = setTimeout(async () => {
        const suggestions = await fetchSuggestions(value);
        setStartSuggestions(suggestions);
        setShowStartSuggestions(suggestions.length > 0);
      }, 150);
    } else {
      setStartSuggestions([]);
      setShowStartSuggestions(false);
    }
  };

  // Debounced autocomplete for end address
  const handleEndAddressChange = (value: string) => {
    setEndAddress(value);
    setEndCoords(null); // Clear coords when typing

    if (endDebounceRef.current) {
      clearTimeout(endDebounceRef.current);
    }

    if (value.length >= 3) {
      endDebounceRef.current = setTimeout(async () => {
        const suggestions = await fetchSuggestions(value);
        setEndSuggestions(suggestions);
        setShowEndSuggestions(suggestions.length > 0);
      }, 150);
    } else {
      setEndSuggestions([]);
      setShowEndSuggestions(false);
    }
  };

  // Handle selecting a start suggestion
  const handleStartSelect = (option: AutocompleteOption) => {
    setStartAddress(option.label);
    setStartCoords({ lat: option.lat, lon: option.lon });
    setShowStartSuggestions(false);
    setStartSuggestions([]);
  };

  // Handle selecting an end suggestion
  const handleEndSelect = (option: AutocompleteOption) => {
    setEndAddress(option.label);
    setEndCoords({ lat: option.lat, lon: option.lon });
    setShowEndSuggestions(false);
    setEndSuggestions([]);
  };

  // Get route from OSRM
  const getRoute = async (
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): Promise<RouteInfo | null> => {
    try {
      // Using public OSRM demo server
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Convert GeoJSON coordinates [lon, lat] to [lat, lon] for Leaflet
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
        const route = await getRoute(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon);
        if (route) {
          setRouteInfo(route);
          // Update map bounds to fit route
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

  const handleStartSimulation = () => {
    if (startCoords && endCoords) {
      onStartSimulation(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon, speed);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
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
          {/* Location Bias Field with Autocomplete */}
          <div className="autocomplete-container">
            <IonItem>
              <IonIcon icon={location} slot="start" color="medium" />
              <IonLabel position="stacked">Search Bias (city/region)</IonLabel>
              <IonInput
                value={biasLocation}
                onIonInput={(e) => handleBiasAddressChange(e.detail.value || '')}
                placeholder="e.g., Montreal, QC"
                disabled={isSimulating}
                onIonFocus={() => biasSuggestions.length > 0 && setShowBiasSuggestions(true)}
                onIonBlur={() => setTimeout(() => setShowBiasSuggestions(false), 200)}
              />
              {biasCoords && (
                <IonText slot="end" color="success" style={{ fontSize: '0.8em' }}>
                  ✓
                </IonText>
              )}
            </IonItem>
            {showBiasSuggestions && biasSuggestions.length > 0 && (
              <IonList className="suggestions-list">
                {biasSuggestions.map((option, index) => (
                  <IonItem
                    key={index}
                    button
                    onClick={() => handleBiasSelect(option)}
                    className="suggestion-item"
                  >
                    <IonLabel className="suggestion-label">{option.label}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </div>

          {/* Start Address with Autocomplete */}
          <div className="autocomplete-container">
            <IonItem>
              <IonLabel position="stacked">Start Address</IonLabel>
              <IonInput
                value={startAddress}
                onIonInput={(e) => handleStartAddressChange(e.detail.value || '')}
                placeholder="Type to search..."
                disabled={isSimulating}
                onIonFocus={() => startSuggestions.length > 0 && setShowStartSuggestions(true)}
                onIonBlur={() => setTimeout(() => setShowStartSuggestions(false), 200)}
              />
              {startCoords && (
                <IonText slot="end" color="success" style={{ fontSize: '0.8em' }}>
                  ✓
                </IonText>
              )}
            </IonItem>
            {showStartSuggestions && startSuggestions.length > 0 && (
              <IonList className="suggestions-list">
                {startSuggestions.map((option, index) => (
                  <IonItem
                    key={index}
                    button
                    onClick={() => handleStartSelect(option)}
                    className="suggestion-item"
                  >
                    <IonLabel className="suggestion-label">{option.label}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </div>

          {/* End Address with Autocomplete */}
          <div className="autocomplete-container">
            <IonItem>
              <IonLabel position="stacked">End Address</IonLabel>
              <IonInput
                value={endAddress}
                onIonInput={(e) => handleEndAddressChange(e.detail.value || '')}
                placeholder="Type to search..."
                disabled={isSimulating}
                onIonFocus={() => endSuggestions.length > 0 && setShowEndSuggestions(true)}
                onIonBlur={() => setTimeout(() => setShowEndSuggestions(false), 200)}
              />
              {endCoords && (
                <IonText slot="end" color="success" style={{ fontSize: '0.8em' }}>
                  ✓
                </IonText>
              )}
            </IonItem>
            {showEndSuggestions && endSuggestions.length > 0 && (
              <IonList className="suggestions-list">
                {endSuggestions.map((option, index) => (
                  <IonItem
                    key={index}
                    button
                    onClick={() => handleEndSelect(option)}
                    className="suggestion-item"
                  >
                    <IonLabel className="suggestion-label">{option.label}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </div>

          <IonItem>
            <IonLabel position="stacked">Speed (km/h)</IonLabel>
            <IonInput
              type="number"
              value={speed}
              onIonInput={(e) => setSpeed(parseInt(e.detail.value || '40', 10))}
              disabled={isSimulating}
            />
          </IonItem>

          {error && (
            <IonText color="danger">
              <p style={{ margin: '8px 0' }}>{error}</p>
            </IonText>
          )}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
              <IonSpinner />
            </div>
          )}

          {routeInfo && (
            <div className="route-info">
              <IonText color="primary">
                <p>
                  <IonIcon icon={navigate} /> {formatDistance(routeInfo.distance)} •{' '}
                  {formatDuration(routeInfo.duration)} (OSRM)
                </p>
              </IonText>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {!isSimulating ? (
              <IonButton
                expand="block"
                onClick={handleStartSimulation}
                disabled={!startCoords || !endCoords || loading}
                style={{ flex: 1 }}
              >
                <IonIcon icon={play} slot="start" />
                Start Simulation
              </IonButton>
            ) : (
              <IonButton
                expand="block"
                color="danger"
                onClick={onStopSimulation}
                style={{ flex: 1 }}
              >
                <IonIcon icon={stop} slot="start" />
                Stop
              </IonButton>
            )}
          </div>
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
              {currentLocation && isSimulating && (
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
