// frontend/src/services/geolocationService.ts

import { CourierLocation } from '../types/courier';

export class GeolocationService {
  private watchId: number | null = null;
  private callbacks: Set<(location: CourierLocation) => void> = new Set();

  startTracking(onUpdate: (location: CourierLocation) => void): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        resolve(false);
        return;
      }

      this.callbacks.add(onUpdate);

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: CourierLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            speed: position.coords.speed || undefined
          };

          // Уведомляем все подписчики
          this.callbacks.forEach(cb => cb(location));
        },
        (error) => {
          console.error('Geolocation error:', error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.error('Пользователь запретил доступ к геолокации');
              break;
            case error.POSITION_UNAVAILABLE:
              console.error('Информация о местоположении недоступна');
              break;
            case error.TIMEOUT:
              console.error('Таймаут получения местоположения');
              break;
          }
          resolve(false);
        },
        {
          enableHighAccuracy: true,  // Точный GPS
          timeout: 10000,
          maximumAge: 30000  // Кэшировать 30 сек
        }
      );

      resolve(true);
    });
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.callbacks.clear();
  }

  getCurrentPosition(): Promise<CourierLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            speed: position.coords.speed || undefined
          });
        },
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
}

export const geolocationService = new GeolocationService();