import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonText, IonButtons, IonIcon, IonProgressBar } from '@ionic/react';
import { useState } from 'react';
import { flask, car } from 'ionicons/icons';
import LocationMocker from '../plugins/LocationMocker';
import DriverSimulation from '../components/DriverSimulation';
import './Home.css';

const Home: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [error, setError] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'test' | 'simulation'>('test');
  const [progress, setProgress] = useState<number>(0);

  // Hardcoded test location: Times Square, NYC
  const TEST_LAT = 40.758;
  const TEST_LON = -73.9855;

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
    } catch (err: any) {
      setError(err.message || 'Failed to enable mock location');
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
    } catch (err: any) {
      setError(err.message || 'Failed to set mock location');
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
    } catch (err: any) {
      setError(err.message || 'Failed to get current location');
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
    } catch (err: any) {
      setError(err.message || 'Failed to disable mock location');
      setStatus('Error');
      setProgress(0);
    }
  };

  const handleSimulationStart = async (startLat: number, startLon: number, endLat: number, endLon: number, speed: number) => {
    try {
      setStatus('Starting driver simulation...');
      setError(null);
      setProgress(0.2);
      // Enable mock location first
      await LocationMocker.enableMockLocation();
      setProgress(0.4);
      // Set starting position
      await LocationMocker.setMockLocation({
        latitude: startLat,
        longitude: startLon,
        accuracy: 1.0,
      });
      setCurrentLocation({ latitude: startLat, longitude: startLon, accuracy: 1.0 });
      setProgress(0.6);
      setStatus(`Simulation started from (${startLat}, ${startLon}) to (${endLat}, ${endLon}) at ${speed} km/h`);
      // TODO: Implement movement logic
    } catch (err: any) {
      setError(err.message || 'Failed to start simulation');
      setStatus('Error');
      setProgress(0);
    }
  };

  const handleSimulationStop = async () => {
    try {
      setStatus('Stopping simulation...');
      setError(null);
      setProgress(0.5);
      await LocationMocker.disableMockLocation();
      setStatus('Simulation stopped');
      setProgress(0);
      setCurrentLocation(null);
    } catch (err: any) {
      setError(err.message || 'Failed to stop simulation');
      setStatus('Error');
      setProgress(0);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="teleport-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/logo.png" alt="teleport logo" style={{ width: '32px', height: '32px' }} />
              teleport
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setActiveScreen('test')} color={activeScreen === 'test' ? 'primary' : 'medium'}>
              <IonIcon slot="icon-only" icon={flask} />
            </IonButton>
            <IonButton onClick={() => setActiveScreen('simulation')} color={activeScreen === 'simulation' ? 'primary' : 'medium'}>
              <IonIcon slot="icon-only" icon={car} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen style={{ '--padding-start': '8px', '--padding-end': '8px', '--padding-top': '8px', '--padding-bottom': '8px' }}>
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
                  2. Set Mock Location (Times Square)
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
                  <li>Click "Set Mock Location" to set to Times Square, NYC (40.758, -73.9855)</li>
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
            <DriverSimulation onStart={handleSimulationStart} onStop={handleSimulationStop} />

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Progress</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonProgressBar value={progress} color={error ? 'danger' : 'primary'}></IonProgressBar>
                <IonText color={error ? 'danger' : 'primary'}>
                  <p style={{ margin: '8px 0 4px 0' }}><strong>Status:</strong> {status}</p>
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
      </IonContent>
    </IonPage>
  );
};

export default Home;
