// frontend/src/services/courierApi.ts

import axios from 'axios';
import { CourierRoute, CourierStatus, CourierLocation } from '../types/courier';

const API_BASE = '/api/courier';

export const courierApi = {
  // Получить маршрут для курьера
  async getRoute(courierId: number): Promise<CourierRoute> {
    const response = await axios.get(`${API_BASE}/${courierId}/route`);
    return response.data;
  },

  // Обновить статус заказа
  async updateOrderStatus(
    courierId: number, 
    orderId: number, 
    status: 'picked_up' | 'delivered'
  ): Promise<{ success: boolean }> {
    const response = await axios.post(`${API_BASE}/${courierId}/orders/${orderId}/status`, {
      status,
      timestamp: new Date().toISOString()
    });
    return response.data;
  },

  // Отправить текущую локацию
  async updateLocation(courierId: number, location: CourierLocation): Promise<{ success: boolean }> {
    const response = await axios.post(`${API_BASE}/${courierId}/location`, location);
    return response.data;
  },

  // Получить статус курьера
  async getStatus(courierId: number): Promise<CourierStatus> {
    const response = await axios.get(`${API_BASE}/${courierId}/status`);
    return response.data;
  },

  // Активировать/деактивировать курьера
  async setActive(courierId: number, active: boolean): Promise<{ success: boolean }> {
    const response = await axios.post(`${API_BASE}/${courierId}/active`, { active });
    return response.data;
  }
};