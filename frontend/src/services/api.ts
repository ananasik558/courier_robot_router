// frontend/src/services/api.ts

import axios from 'axios';

const API_BASE_URL = '/api';

// === Интерфейсы ===

export interface Order {
  id?: number;
  order_id?: string;
  latitude: number;
  longitude: number;
  address?: string;
  ready_time: string;
  deadline: string;
  weight: number;
  status?: string;
  courier_id?: number | null;
  created_at?: string;
  delivered_at?: string | null;
}

export interface Courier {
  id?: number;
  courier_id: number;
  courier_type: string;
  capacity: number;
  speed_kmh: number;
  is_active?: boolean;
}

export interface RoutePoint {
  order_id: number;
  latitude: number;
  longitude: number;
  arrival_time: string;
  departure_time: string;
}

export interface OptimizedRoute {
  courier_id: number;
  courier_type: string;
  points: RoutePoint[];
  total_distance_m: number;
  total_time_min: number;
  orders_count: number;
}

export interface OptimizationRequest {
  orders: Array<{
    latitude: number;
    longitude: number;
    address?: string;
    ready_time: string;
    deadline: string;
    weight: number;
  }>;
  couriers: Array<{
    courier_id: number;
    courier_type: string;
    capacity: number;
    speed_kmh: number;
  }>;
  depot_latitude: number;
  depot_longitude: number;
}

export interface OptimizationResponse {
  routes: OptimizedRoute[];
  total_time_min: number;
  total_distance_m: number;
  computation_time_ms: number;
}

// === API Методы ===

export const api = {
  // --- ORDERS ---
  async getOrders(): Promise<Order[]> {
    const response = await axios.get(`${API_BASE_URL}/orders/`);
    return response.data;
  },

  async createOrder(order: Omit<Order, 'id' | 'order_id' | 'created_at'>): Promise<Order> {
    const response = await axios.post(`${API_BASE_URL}/orders/`, order);
    return response.data;
  },

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    const response = await axios.put(`${API_BASE_URL}/orders/${orderId}`, updates);
    return response.data;
  },

  async deleteOrder(orderId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/orders/${orderId}`);
  },

  async getDeliveryStats() {
    const response = await axios.get(`${API_BASE_URL}/orders/stats/delivery`);
    return response.data;
  },

  // --- COURIERS ---
  async getCouriers(): Promise<Courier[]> {
    const response = await axios.get(`${API_BASE_URL}/couriers/`);
    return response.data;
  },

  async createCourier(courier: Omit<Courier, 'id'>): Promise<Courier> {
    const response = await axios.post(`${API_BASE_URL}/couriers/`, courier);
    return response.data;
  },

  async deleteCourier(courierId: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/couriers/${courierId}`);
  },

  // --- OPTIMIZATION ---
  async optimizeRoutes(request: OptimizationRequest): Promise<OptimizationResponse> {
    const response = await axios.post(`${API_BASE_URL}/optimize`, request);
    return response.data;
  },

  // --- ROUTE GEOMETRY ---
  async getRouteGeometry(coordinates: string, profile: string = 'bicycle') {
    const response = await axios.get(`${API_BASE_URL}/route/geometry`, {
      params: { coordinates, profile }
    });
    return response.data;
  },

  // --- WEATHER ---
  async getWeather(lat: number, lon: number) {
    const response = await axios.get(`${API_BASE_URL}/weather`, { params: { lat, lon } });
    return response.data;
  },

  // --- OBSTACLES ---
  async getObstacles(lat: number, lon: number, radius_km: number = 5) {
    const response = await axios.get(`${API_BASE_URL}/obstacles`, { params: { lat, lon, radius_km } });
    return response.data;
  },

  async addObstacle(obstacle: { latitude: number; longitude: number; radius_m?: number; description: string; days_duration?: number }) {
    const response = await axios.post(`${API_BASE_URL}/obstacles`, obstacle);
    return response.data;
  },

  // --- DELIVERY ROUTES (DB) ---
  async createRoute(route: {
    courier_id: number;
    total_distance_m: number;
    total_time_min: number;
    orders_count: number;
    route_points?: any[];
  }) {
    const response = await axios.post(`${API_BASE_URL}/routes/`, route);
    return response.data;
  }
};