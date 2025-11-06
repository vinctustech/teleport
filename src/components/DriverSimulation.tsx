import React, { useState } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/react';

interface DriverSimulationProps {
  onStart: (startLat: number, startLon: number, endLat: number, endLon: number, speed: number) => void;
  onStop: () => void;
}

const DriverSimulation: React.FC<DriverSimulationProps> = ({ onStart, onStop }) => {
  const [startLat, setStartLat] = useState<string>('40.758');
  const [startLon, setStartLon] = useState<string>('-73.9855');
  const [endLat, setEndLat] = useState<string>('40.748');
  const [endLon, setEndLon] = useState<string>('-73.9855');
  const [speed, setSpeed] = useState<string>('60');
  const [isRunning, setIsRunning] = useState(false);

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

    setIsRunning(true);
    onStart(sLat, sLon, eLat, eLon, spd);
  };

  const handleStop = () => {
    setIsRunning(false);
    onStop();
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
              disabled={isRunning}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Longitude</IonLabel>
            <IonInput
              type="number"
              value={startLon}
              onIonInput={(e) => setStartLon(e.detail.value!)}
              disabled={isRunning}
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
              disabled={isRunning}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Longitude</IonLabel>
            <IonInput
              type="number"
              value={endLon}
              onIonInput={(e) => setEndLon(e.detail.value!)}
              disabled={isRunning}
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
              disabled={isRunning}
            />
          </IonItem>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardContent>
          {!isRunning ? (
            <IonButton expand="block" color="success" onClick={handleStart}>
              Start Simulation
            </IonButton>
          ) : (
            <IonButton expand="block" color="danger" onClick={handleStop}>
              Stop Simulation
            </IonButton>
          )}
        </IonCardContent>
      </IonCard>
    </>
  );
};

export default DriverSimulation;
