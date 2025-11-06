import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonText } from '@ionic/react';
import { useState } from 'react';
import LocationMocker from '../plugins/LocationMocker';
import './Home.css';

const Home: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [error, setError] = useState<string | null>(null);

  // Hardcoded test location: Times Square, NYC
  const TEST_LAT = 40.758;
  const TEST_LON = -73.9855;

  const handleEnableMockLocation = async () => {
    try {
      setStatus('Enabling mock location...');
      setError(null);
      const result = await LocationMocker.enableMockLocation();
      if (result.success) {
        setStatus('Mock location enabled');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to enable mock location');
      setStatus('Error');
    }
  };

  const handleSetMockLocation = async () => {
    try {
      setStatus('Setting mock location...');
      setError(null);
      const result = await LocationMocker.setMockLocation({
        latitude: TEST_LAT,
        longitude: TEST_LON,
        accuracy: 1.0,
      });
      if (result.success) {
        setStatus(`Mock location set to: ${TEST_LAT}, ${TEST_LON}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set mock location');
      setStatus('Error');
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setStatus('Getting current location...');
      setError(null);
      const location = await LocationMocker.getCurrentLocation();
      setCurrentLocation(location);
      setStatus('Location retrieved');
    } catch (err: any) {
      setError(err.message || 'Failed to get current location');
      setStatus('Error');
    }
  };

  const handleDisableMockLocation = async () => {
    try {
      setStatus('Disabling mock location...');
      setError(null);
      const result = await LocationMocker.disableMockLocation();
      if (result.success) {
        setStatus('Mock location disabled');
        setCurrentLocation(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disable mock location');
      setStatus('Error');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="teleport-title">teleport</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large" className="teleport-title-large">teleport</IonTitle>
          </IonToolbar>
        </IonHeader>

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
      </IonContent>
    </IonPage>
  );
};

export default Home;
