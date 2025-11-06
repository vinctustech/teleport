import { registerPlugin } from '@capacitor/core';

export interface LocationMockerPlugin {
  /**
   * Set a mock location
   */
  setMockLocation(options: { latitude: number; longitude: number; accuracy?: number }): Promise<{ success: boolean }>;

  /**
   * Get current location (for verification)
   */
  getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }>;

  /**
   * Enable mock location mode
   */
  enableMockLocation(): Promise<{ success: boolean }>;

  /**
   * Disable mock location mode
   */
  disableMockLocation(): Promise<{ success: boolean }>;
}

const LocationMocker = registerPlugin<LocationMockerPlugin>('LocationMocker', {
  web: () => import('./LocationMockerWeb').then(m => new m.LocationMockerWeb()),
});

export default LocationMocker;
