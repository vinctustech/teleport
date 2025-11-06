import { WebPlugin } from '@capacitor/core';
import type { LocationMockerPlugin } from './LocationMocker';

export class LocationMockerWeb extends WebPlugin implements LocationMockerPlugin {
  async setMockLocation(options: { latitude: number; longitude: number; accuracy?: number }): Promise<{ success: boolean }> {
    console.log('Web mock location:', options);
    return { success: true };
  }

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    // Use browser's geolocation API
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            reject(error);
          }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  async enableMockLocation(): Promise<{ success: boolean }> {
    console.log('Web: enableMockLocation (no-op)');
    return { success: true };
  }

  async disableMockLocation(): Promise<{ success: boolean }> {
    console.log('Web: disableMockLocation (no-op)');
    return { success: true };
  }
}
