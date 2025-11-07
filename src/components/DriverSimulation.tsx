import React, { useState, useEffect } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonRow, IonCol, IonSelect, IonSelectOption, IonIcon } from '@ionic/react';
import { swapVertical } from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';
import '../pages/Home.css';

interface DriverSimulationProps {
  onStart: (startLat: number, startLon: number, endLat: number, endLon: number, speed: number) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: (callback: () => void) => void;
}

interface SavedSimulation {
  name: string;
  startLat: string;
  startLon: string;
  endLat: string;
  endLon: string;
  speed: string;
}

const DriverSimulation: React.FC<DriverSimulationProps> = ({ onStart, onStop, onPause, onResume, onComplete }) => {
  const [simName, setSimName] = useState<string>('Simulation 1');
  const [startLat, setStartLat] = useState<string>('45.47952470582953');
  const [startLon, setStartLon] = useState<string>('-73.60287006323539');
  const [endLat, setEndLat] = useState<string>('45.482225237405856');
  const [endLon, setEndLon] = useState<string>('-73.59969906693631');
  const [speed, setSpeed] = useState<string>('60');
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [selectedSim, setSelectedSim] = useState<string>('');

  useEffect(() => {
    loadSimulations();
  }, []);

  useEffect(() => {
    // Register completion callback with parent
    onComplete(() => {
      setSimState('idle');
    });
  }, [onComplete]);

  const loadSimulations = async () => {
    const { value } = await Preferences.get({ key: 'savedSimulations' });
    if (value) {
      const sims = JSON.parse(value);
      setSavedSimulations(sims);
      // Load the first simulation automatically
      if (sims.length > 0) {
        const firstSim = sims[0];
        setSimName(firstSim.name);
        setStartLat(firstSim.startLat);
        setStartLon(firstSim.startLon);
        setEndLat(firstSim.endLat);
        setEndLon(firstSim.endLon);
        setSpeed(firstSim.speed);
        setSelectedSim(firstSim.name);
      }
    } else {
      // First run - create default simulation
      const defaultSim: SavedSimulation = {
        name: 'Simulation 1',
        startLat: '45.47952470582953',
        startLon: '-73.60287006323539',
        endLat: '45.482225237405856',
        endLon: '-73.59969906693631',
        speed: '60'
      };
      const defaultSims = [defaultSim];
      setSavedSimulations(defaultSims);
      await Preferences.set({ key: 'savedSimulations', value: JSON.stringify(defaultSims) });
      // Load the default simulation
      setSimName(defaultSim.name);
      setStartLat(defaultSim.startLat);
      setStartLon(defaultSim.startLon);
      setEndLat(defaultSim.endLat);
      setEndLon(defaultSim.endLon);
      setSpeed(defaultSim.speed);
      setSelectedSim(defaultSim.name);
    }
  };

  const handleSaveSimulation = async () => {
    if (!simName.trim()) {
      alert('Please enter a simulation name');
      return;
    }

    const newSim: SavedSimulation = {
      name: simName,
      startLat,
      startLon,
      endLat,
      endLon,
      speed
    };

    const updatedSims = [...savedSimulations.filter(s => s.name !== simName), newSim];
    setSavedSimulations(updatedSims);
    await Preferences.set({ key: 'savedSimulations', value: JSON.stringify(updatedSims) });
    alert(`Simulation "${simName}" saved!`);
  };

  const handleLoadSimulation = (simName: string) => {
    const sim = savedSimulations.find(s => s.name === simName);
    if (sim) {
      setSimName(sim.name);
      setStartLat(sim.startLat);
      setStartLon(sim.startLon);
      setEndLat(sim.endLat);
      setEndLon(sim.endLon);
      setSpeed(sim.speed);
      setSelectedSim(simName);
    }
  };

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

  const handleFlipStartEnd = () => {
    // Swap start and end coordinates
    const tempLat = startLat;
    const tempLon = startLon;
    setStartLat(endLat);
    setStartLon(endLon);
    setEndLat(tempLat);
    setEndLon(tempLon);
  };

  return (
    <>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Simulation</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem>
            <IonLabel position="stacked">Name</IonLabel>
            <IonInput
              type="text"
              value={simName}
              onIonInput={(e) => setSimName(e.detail.value!)}
              disabled={simState !== 'idle'}
            />
          </IonItem>
          <IonRow style={{ marginTop: '8px' }}>
            <IonCol size="6">
              <IonButton expand="block" onClick={handleSaveSimulation} disabled={simState !== 'idle'}>
                Save
              </IonButton>
            </IonCol>
            <IonCol size="6">
              <IonItem>
                <IonSelect
                  value={selectedSim}
                  placeholder="Load saved"
                  onIonChange={(e) => handleLoadSimulation(e.detail.value)}
                  disabled={simState !== 'idle'}
                >
                  {savedSimulations.map((sim) => (
                    <IonSelectOption key={sim.name} value={sim.name}>
                      {sim.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </IonCol>
          </IonRow>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Start Location</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonRow>
            <IonCol size="6">
              <IonItem>
                <IonLabel position="stacked">Latitude</IonLabel>
                <IonInput
                  type="number"
                  value={startLat}
                  onIonInput={(e) => setStartLat(e.detail.value!)}
                  disabled={simState !== 'idle'}
                />
              </IonItem>
            </IonCol>
            <IonCol size="6">
              <IonItem>
                <IonLabel position="stacked">Longitude</IonLabel>
                <IonInput
                  type="number"
                  value={startLon}
                  onIonInput={(e) => setStartLon(e.detail.value!)}
                  disabled={simState !== 'idle'}
                />
              </IonItem>
            </IonCol>
          </IonRow>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>End Location</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonRow>
            <IonCol size="6">
              <IonItem>
                <IonLabel position="stacked">Latitude</IonLabel>
                <IonInput
                  type="number"
                  value={endLat}
                  onIonInput={(e) => setEndLat(e.detail.value!)}
                  disabled={simState !== 'idle'}
                />
              </IonItem>
            </IonCol>
            <IonCol size="6">
              <IonItem>
                <IonLabel position="stacked">Longitude</IonLabel>
                <IonInput
                  type="number"
                  value={endLon}
                  onIonInput={(e) => setEndLon(e.detail.value!)}
                  disabled={simState !== 'idle'}
                />
              </IonItem>
            </IonCol>
          </IonRow>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Speed</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonRow style={{ alignItems: 'flex-end' }}>
            <IonCol size="9">
              <IonItem>
                <IonLabel position="stacked">Speed (km/h)</IonLabel>
                <IonInput
                  type="number"
                  value={speed}
                  onIonInput={(e) => setSpeed(e.detail.value!)}
                  disabled={simState !== 'idle'}
                />
              </IonItem>
            </IonCol>
            <IonCol size="3">
              <IonButton
                expand="block"
                fill="outline"
                onClick={handleFlipStartEnd}
                disabled={simState !== 'idle'}
                style={{ margin: 0 }}
              >
                <IonIcon icon={swapVertical} />
              </IonButton>
            </IonCol>
          </IonRow>
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
