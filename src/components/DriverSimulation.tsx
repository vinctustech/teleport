import React, { useState } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonRow, IonCol } from '@ionic/react';
import '../pages/Home.css';

interface DriverSimulationProps {
  onStart: (startLat: number, startLon: number, endLat: number, endLon: number, speed: number) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

const DriverSimulation: React.FC<DriverSimulationProps> = ({ onStart, onStop, onPause, onResume }) => {
  const [startLat, setStartLat] = useState<string>('40.758');
  const [startLon, setStartLon] = useState<string>('-73.9855');
  const [endLat, setEndLat] = useState<string>('40.748');
  const [endLon, setEndLon] = useState<string>('-73.9855');
  const [speed, setSpeed] = useState<string>('60');
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused'>('idle');

  const handleStart = () => {
    const sLat = parseFloat(startLat);
    const sLon = parseFloat(startLon);
    const eLat = parseFloat(endLat);
    const eLon = parseFloat(endLon);
    const spd = parseFloat(speed);

    if (isNaN(sLat) || isNaN(sLon) || isNaN(eLat) || isNaN(eLon) || isNaN(spd)) {
      alert('Please enter valid numbers for all fields');
      return;
    }

    setSimState('running');
    onStart(sLat, sLon, eLat, eLon, spd);
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

  return (
    <>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Start Location</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem>
            <IonLabel position="stacked">Latitude</IonLabel>
            <IonInput
              type="number"
              value={startLat}
              onIonInput={(e) => setStartLat(e.detail.value!)}
              disabled={simState !== 'idle'}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Longitude</IonLabel>
            <IonInput
              type="number"
              value={startLon}
              onIonInput={(e) => setStartLon(e.detail.value!)}
              disabled={simState !== 'idle'}
            />
          </IonItem>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>End Location</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem>
            <IonLabel position="stacked">Latitude</IonLabel>
            <IonInput
              type="number"
              value={endLat}
              onIonInput={(e) => setEndLat(e.detail.value!)}
              disabled={simState !== 'idle'}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Longitude</IonLabel>
            <IonInput
              type="number"
              value={endLon}
              onIonInput={(e) => setEndLon(e.detail.value!)}
              disabled={simState !== 'idle'}
            />
          </IonItem>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Speed</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem>
            <IonLabel position="stacked">Speed (km/h)</IonLabel>
            <IonInput
              type="number"
              value={speed}
              onIonInput={(e) => setSpeed(e.detail.value!)}
              disabled={simState !== 'idle'}
            />
          </IonItem>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardContent style={{ padding: '16px' }}>
          {simState === 'idle' && (
            <div className="button-container">
              <IonButton expand="block" color="success" onClick={handleStart} style={{ flex: 1, margin: 0 }}>
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
    </>
  );
};

export default DriverSimulation;
