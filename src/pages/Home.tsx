import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonText, IonButtons, IonIcon, IonProgressBar } from '@ionic/react';
import { useState, useRef } from 'react';
import { flask, car, map } from 'ionicons/icons';
import LocationMocker from '../plugins/LocationMocker';
import DriverSimulation from '../components/DriverSimulation';
import MapRoute from '../components/MapRoute';
import { version } from '../../package.json';
import './Home.css';

const Home: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [error, setError] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'test' | 'simulation' | 'map'>('test');
  const [progress, setProgress] = useState<number>(0);
  const [distanceTraveled, setDistanceTraveled] = useState<number>(0);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const simulationState = useRef<{
    startLat: number;
    startLon: number;
    endLat: number;
    endLon: number;
    speed: number;
    totalDistance: number;
    currentDistance: number;
  } | null>(null);
  // Route-based simulation state for map view
  const routeSimulationState = useRef<{
    geometry: [number, number][]; // [lat, lon] pairs
    segmentDistances: number[];   // distance of each segment in meters
    totalDistance: number;        // total distance in meters
    speed: number;                // km/h
    currentDistance: number;      // meters traveled
  } | null>(null);
  const onSimulationCompleteRef = useRef<(() => void) | null>(null);

  // Hardcoded test location: Westmount Public Library, Montreal
  const TEST_LAT = 45.481643899716715;
  const TEST_LON = -73.59967887004866;

  // Calculate bearing between two points (returns degrees from north, 0-360)
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const λ1 = toRad(lon1);
    const λ2 = toRad(lon2);

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);

    return (toDeg(θ) + 360) % 360; // Normalize to 0-360
  };

  // Calculate distance between two points in meters using Haversine formula
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get position along route geometry at a given distance
  const getPositionAlongRoute = (
    geometry: [number, number][],
    segmentDistances: number[],
    distanceTraveled: number
  ): { lat: number; lon: number; bearing: number } => {
    let accumulated = 0;
    for (let i = 0; i < segmentDistances.length; i++) {
      const segmentDist = segmentDistances[i];
      if (accumulated + segmentDist >= distanceTraveled) {
        // We're on this segment
        const segmentProgress = (distanceTraveled - accumulated) / segmentDist;
        const [lat1, lon1] = geometry[i];
        const [lat2, lon2] = geometry[i + 1];
        const lat = lat1 + (lat2 - lat1) * segmentProgress;
        const lon = lon1 + (lon2 - lon1) * segmentProgress;
        const bearing = calculateBearing(lat1, lon1, lat2, lon2);
        return { lat, lon, bearing };
      }
      accumulated += segmentDist;
    }
    // Past the end, return last point
    const lastIdx = geometry.length - 1;
    const [lat, lon] = geometry[lastIdx];
    const bearing = lastIdx > 0
      ? calculateBearing(geometry[lastIdx - 1][0], geometry[lastIdx - 1][1], lat, lon)
      : 0;
    return { lat, lon, bearing };
  };

  const handleEnableMockLocation = async () => {
    try {
      setStatus('Enabling mock location...');
      setError(null);
      setProgress(0.3);
      const result = await LocationMocker.enableMockLocation();
      if (result.success) {
        setStatus('Mock location enabled');
        setProgress(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable mock location');
      setStatus('Error');
      setProgress(0);
    }
  };

  const handleSetMockLocation = async () => {
    try {
      setStatus('Setting mock location...');
      setError(null);
      setProgress(0.5);
      const result = await LocationMocker.setMockLocation({
        latitude: TEST_LAT,
        longitude: TEST_LON,
        accuracy: 1.0,
      });
      if (result.success) {
        setStatus(`Mock location set to: ${TEST_LAT}, ${TEST_LON}`);
        setProgress(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set mock location');
      setStatus('Error');
      setProgress(0);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setStatus('Getting current location...');
      setError(null);
      setProgress(0.7);
      const location = await LocationMocker.getCurrentLocation();
      setCurrentLocation(location);
      setStatus('Location retrieved');
      setProgress(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get current location');
      setStatus('Error');
      setProgress(0);
    }
  };

  const handleDisableMockLocation = async () => {
    try {
      setStatus('Disabling mock location...');
      setError(null);
      setProgress(0.5);
      const result = await LocationMocker.disableMockLocation();
      if (result.success) {
        setStatus('Mock location disabled');
        setCurrentLocation(null);
        setProgress(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable mock location');
      setStatus('Error');
      setProgress(0);
    }
  };

  const startSimulationInterval = () => {
    if (!simulationState.current) return;

    const { startLat, startLon, endLat, endLon, speed, totalDistance } = simulationState.current;

    // Update interval in milliseconds (update every 250ms)
    const updateInterval = 250;
    // Distance traveled per update (speed is km/h, convert to km/s)
    const distancePerUpdate = (speed / 3600) * (updateInterval / 1000);

    // Clear any existing interval
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }

    simulationInterval.current = setInterval(async () => {
      if (!simulationState.current) return;

      simulationState.current.currentDistance += distancePerUpdate;
      const progressValue = Math.min(simulationState.current.currentDistance / totalDistance, 1);
      setProgress(progressValue);

      if (simulationState.current.currentDistance >= totalDistance) {
        // Calculate bearing from start to end
        const bearing = calculateBearing(startLat, startLon, endLat, endLon);
        const toRad = (deg: number) => deg * Math.PI / 180;
        const toDeg = (rad: number) => rad * 180 / Math.PI;

        const φ2 = toRad(endLat);
        const λ2 = toRad(endLon);

        // Calculate point 20m (0.02 km) beyond endpoint
        const R = 6371; // Earth's radius in km
        const d = 0.02; // 20 meters in km
        const bearingRad = toRad(bearing);

        const φ3 = Math.asin(Math.sin(φ2) * Math.cos(d / R) + Math.cos(φ2) * Math.sin(d / R) * Math.cos(bearingRad));
        const λ3 = λ2 + Math.atan2(Math.sin(bearingRad) * Math.sin(d / R) * Math.cos(φ2), Math.cos(d / R) - Math.sin(φ2) * Math.sin(φ3));

        const finalLat = toDeg(φ3);
        const finalLon = toDeg(λ3);

        // Reached destination - set final location 10m beyond endpoint
        await LocationMocker.setMockLocation({
          latitude: finalLat,
          longitude: finalLon,
          accuracy: 1.0,
          bearing: bearing,
        });
        setCurrentLocation({ latitude: finalLat, longitude: finalLon, accuracy: 1.0 });
        setStatus('Arrived at destination');
        setProgress(1);

        // Clear interval first
        if (simulationInterval.current) {
          clearInterval(simulationInterval.current);
          simulationInterval.current = null;
        }
        simulationState.current = null;

        // Wait a bit to ensure location propagates, then set it again to be certain
        setTimeout(async () => {
          await LocationMocker.setMockLocation({
            latitude: finalLat,
            longitude: finalLon,
            accuracy: 1.0,
            bearing: bearing,
          });
          // Notify DriverSimulation component to return to idle state
          if (onSimulationCompleteRef.current) {
            onSimulationCompleteRef.current();
          }
        }, 200);
      } else {
        // Interpolate current position
        const fraction = simulationState.current.currentDistance / totalDistance;
        const currentLat = startLat + (endLat - startLat) * fraction;
        const currentLon = startLon + (endLon - startLon) * fraction;

        // Calculate bearing from start to end
        const bearing = calculateBearing(startLat, startLon, endLat, endLon);

        await LocationMocker.setMockLocation({
          latitude: currentLat,
          longitude: currentLon,
          accuracy: 1.0,
          bearing: bearing,
        });
        setCurrentLocation({ latitude: currentLat, longitude: currentLon, accuracy: 1.0 });
      }
    }, updateInterval);
  };

  const handleSimulationStart = async (startLat: number, startLon: number, endLat: number, endLon: number, speed: number) => {
    try {
      setStatus('Starting driver simulation...');
      setError(null);
      setProgress(0);

      // Enable mock location first
      await LocationMocker.enableMockLocation();

      // Set starting position
      await LocationMocker.setMockLocation({
        latitude: startLat,
        longitude: startLon,
        accuracy: 1.0,
      });
      setCurrentLocation({ latitude: startLat, longitude: startLon, accuracy: 1.0 });

      // Calculate distance using Haversine formula (in km)
      const toRad = (deg: number) => deg * Math.PI / 180;
      const R = 6371; // Earth's radius in km
      const dLat = toRad(endLat - startLat);
      const dLon = toRad(endLon - startLon);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(startLat)) * Math.cos(toRad(endLat)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const totalDistance = R * c; // in km

      // Store simulation state
      simulationState.current = {
        startLat,
        startLon,
        endLat,
        endLon,
        speed,
        totalDistance,
        currentDistance: 0
      };

      setStatus(`Driving ${totalDistance.toFixed(2)} km at ${speed} km/h`);

      // Start the simulation interval
      startSimulationInterval();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation');
      setStatus('Error');
      setProgress(0);
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
      simulationState.current = null;
    }
  };

  const handleSimulationStop = async () => {
    try {
      setStatus('Stopping simulation...');
      setError(null);

      // Clear the simulation interval
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }

      // Clear simulation state
      simulationState.current = null;

      await LocationMocker.disableMockLocation();
      setStatus('Simulation stopped');
      setProgress(0);
      setCurrentLocation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop simulation');
      setStatus('Error');
      setProgress(0);
    }
  };

  const handleSimulationPause = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
    setStatus('Simulation paused');
  };

  const handleSimulationResume = () => {
    if (!simulationState.current) return;

    setStatus(`Driving ${simulationState.current.totalDistance.toFixed(2)} km at ${simulationState.current.speed} km/h`);
    startSimulationInterval();
  };

  const handleSimulationComplete = (callback: () => void) => {
    onSimulationCompleteRef.current = callback;
  };

  // Route-based simulation interval (for map view)
  const startRouteSimulationInterval = () => {
    if (!routeSimulationState.current) return;

    const { geometry, segmentDistances, totalDistance, speed } = routeSimulationState.current;

    // Update interval in milliseconds (update every 250ms)
    const updateInterval = 250;
    // Distance traveled per update in meters (speed is km/h)
    const distancePerUpdate = (speed * 1000 / 3600) * (updateInterval / 1000);

    // Clear any existing interval
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }

    simulationInterval.current = setInterval(async () => {
      if (!routeSimulationState.current) return;

      routeSimulationState.current.currentDistance += distancePerUpdate;
      const progressValue = Math.min(routeSimulationState.current.currentDistance / totalDistance, 1);
      setProgress(progressValue);
      setDistanceTraveled(routeSimulationState.current.currentDistance);

      if (routeSimulationState.current.currentDistance >= totalDistance) {
        // Reached destination
        const { lat, lon, bearing } = getPositionAlongRoute(geometry, segmentDistances, totalDistance);

        await LocationMocker.setMockLocation({
          latitude: lat,
          longitude: lon,
          accuracy: 1.0,
          bearing: bearing,
        });
        setCurrentLocation({ latitude: lat, longitude: lon, accuracy: 1.0 });
        setDistanceTraveled(totalDistance);
        setStatus('Arrived at destination');
        setProgress(1);

        // Clear interval
        if (simulationInterval.current) {
          clearInterval(simulationInterval.current);
          simulationInterval.current = null;
        }
        routeSimulationState.current = null;

        // Notify completion
        setTimeout(() => {
          if (onSimulationCompleteRef.current) {
            onSimulationCompleteRef.current();
          }
        }, 200);
      } else {
        // Get current position along route
        const { lat, lon, bearing } = getPositionAlongRoute(
          geometry,
          segmentDistances,
          routeSimulationState.current.currentDistance
        );

        await LocationMocker.setMockLocation({
          latitude: lat,
          longitude: lon,
          accuracy: 1.0,
          bearing: bearing,
        });
        setCurrentLocation({ latitude: lat, longitude: lon, accuracy: 1.0 });
      }
    }, updateInterval);
  };

  // Handler for map route simulation start
  const handleMapRouteStart = async (routeGeometry: [number, number][], totalDistanceMeters: number, speed: number) => {
    try {
      setStatus('Starting route simulation...');
      setError(null);
      setProgress(0);
      setDistanceTraveled(0);

      // Enable mock location first
      await LocationMocker.enableMockLocation();

      // Calculate segment distances
      const segmentDistances: number[] = [];
      for (let i = 0; i < routeGeometry.length - 1; i++) {
        const [lat1, lon1] = routeGeometry[i];
        const [lat2, lon2] = routeGeometry[i + 1];
        segmentDistances.push(calculateDistanceMeters(lat1, lon1, lat2, lon2));
      }

      // Set starting position
      const [startLat, startLon] = routeGeometry[0];
      await LocationMocker.setMockLocation({
        latitude: startLat,
        longitude: startLon,
        accuracy: 1.0,
      });
      setCurrentLocation({ latitude: startLat, longitude: startLon, accuracy: 1.0 });

      // Store route simulation state
      routeSimulationState.current = {
        geometry: routeGeometry,
        segmentDistances,
        totalDistance: totalDistanceMeters,
        speed,
        currentDistance: 0
      };

      setStatus(`Driving ${(totalDistanceMeters / 1000).toFixed(2)} km at ${speed} km/h`);

      // Start the simulation interval
      startRouteSimulationInterval();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation');
      setStatus('Error');
      setProgress(0);
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
      routeSimulationState.current = null;
    }
  };

  // Updated stop to handle both simulation types
  const handleMapRouteStop = async () => {
    try {
      setStatus('Stopping simulation...');
      setError(null);

      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }

      routeSimulationState.current = null;

      await LocationMocker.disableMockLocation();
      setStatus('Simulation stopped');
      setProgress(0);
      setDistanceTraveled(0);
      setCurrentLocation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop simulation');
      setStatus('Error');
      setProgress(0);
    }
  };

  const handleMapRoutePause = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
    setStatus('Simulation paused');
  };

  const handleMapRouteResume = () => {
    if (!routeSimulationState.current) return;

    setStatus(`Driving ${(routeSimulationState.current.totalDistance / 1000).toFixed(2)} km at ${routeSimulationState.current.speed} km/h`);
    startRouteSimulationInterval();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="teleport-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/logo.png" alt="teleport logo" style={{ width: '32px', height: '32px' }} />
                teleport
              </span>
              <span style={{ fontSize: '0.9em', fontWeight: '400', opacity: '0.7', alignSelf: 'flex-end', marginBottom: '2px' }}>v{version}</span>
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setActiveScreen('test')} color={activeScreen === 'test' ? 'primary' : 'medium'}>
              <IonIcon slot="icon-only" icon={flask} />
            </IonButton>
            <IonButton onClick={() => setActiveScreen('simulation')} color={activeScreen === 'simulation' ? 'primary' : 'medium'}>
              <IonIcon slot="icon-only" icon={car} />
            </IonButton>
            <IonButton onClick={() => setActiveScreen('map')} color={activeScreen === 'map' ? 'primary' : 'medium'}>
              <IonIcon slot="icon-only" icon={map} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen style={{ '--padding-start': '8px', '--padding-end': '8px', '--padding-top': '6px', '--padding-bottom': '8px' }}>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large" className="teleport-title-large">teleport</IonTitle>
          </IonToolbar>
        </IonHeader>

        {activeScreen === 'test' && (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Test Controls</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonButton expand="block" onClick={handleEnableMockLocation}>
                  1. Enable Mock Location
                </IonButton>
                <IonButton expand="block" onClick={handleSetMockLocation} color="secondary">
                  2. Set Mock Location (Westmount Library)
                </IonButton>
                <IonButton expand="block" onClick={handleGetCurrentLocation} color="success">
                  3. Get Current Location
                </IonButton>
                <IonButton expand="block" onClick={handleDisableMockLocation} color="warning">
                  Disable Mock Location
                </IonButton>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Status</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText color={error ? 'danger' : 'primary'}>
                  <p><strong>Status:</strong> {status}</p>
                </IonText>
                {error && (
                  <IonText color="danger">
                    <p><strong>Error:</strong> {error}</p>
                  </IonText>
                )}
              </IonCardContent>
            </IonCard>

            {currentLocation && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Current Location</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p><strong>Latitude:</strong> {currentLocation.latitude.toFixed(6)}</p>
                  <p><strong>Longitude:</strong> {currentLocation.longitude.toFixed(6)}</p>
                  <p><strong>Accuracy:</strong> {currentLocation.accuracy.toFixed(2)}m</p>
                  <IonText color={
                    currentLocation.latitude === TEST_LAT && currentLocation.longitude === TEST_LON
                      ? 'success'
                      : 'warning'
                  }>
                    <p>
                      <strong>
                        {currentLocation.latitude === TEST_LAT && currentLocation.longitude === TEST_LON
                          ? '✓ Location matches test coordinates!'
                          : '⚠ Location does not match test coordinates'}
                      </strong>
                    </p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            )}

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Instructions</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <ol>
                  <li>Click "Enable Mock Location" first</li>
                  <li>Click "Set Mock Location" to set to Westmount Public Library, Montreal (45.482, -73.600)</li>
                  <li>Click "Get Current Location" to verify the mock location was set</li>
                </ol>
                <IonText color="medium">
                  <p><em>Note: You may need to enable "Allow mock locations" in Android Developer Options</em></p>
                </IonText>
              </IonCardContent>
            </IonCard>
          </>
        )}

        {activeScreen === 'simulation' && (
          <>
            <DriverSimulation
              onStart={handleSimulationStart}
              onStop={handleSimulationStop}
              onPause={handleSimulationPause}
              onResume={handleSimulationResume}
              onComplete={handleSimulationComplete}
            />

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Progress</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonProgressBar value={progress} color={error ? 'danger' : 'primary'}></IonProgressBar>
                <IonText color={error ? 'danger' : 'primary'}>
                  <p style={{ margin: '8px 0 4px 0' }}>
                    <strong>Status:</strong> {status}
                    {simulationState.current && (
                      <span style={{ marginLeft: '8px', fontSize: '0.9em' }}>
                        ({simulationState.current.currentDistance.toFixed(2)} / {((simulationState.current.totalDistance - simulationState.current.currentDistance)).toFixed(2)} km)
                      </span>
                    )}
                  </p>
                </IonText>
                {currentLocation && (
                  <IonText color="medium">
                    <p style={{ margin: '4px 0', fontSize: '0.9em' }}>
                      <strong>Current:</strong> {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </p>
                  </IonText>
                )}
                {error && (
                  <IonText color="danger">
                    <p style={{ margin: '4px 0 0 0' }}><strong>Error:</strong> {error}</p>
                  </IonText>
                )}
              </IonCardContent>
            </IonCard>
          </>
        )}

        {activeScreen === 'map' && (
          <MapRoute
            onStart={handleMapRouteStart}
            onStop={handleMapRouteStop}
            onPause={handleMapRoutePause}
            onResume={handleMapRouteResume}
            onComplete={handleSimulationComplete}
            currentLocation={currentLocation}
            distanceTraveled={distanceTraveled}
          />
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
