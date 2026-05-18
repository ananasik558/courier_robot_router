export interface Order {
  id: number;
  latitude: number;
  longitude: number;
  ready_time: string;
  deadline: string;
  weight: number;
  address?: string;
}

export interface Courier {
  id: number;
  type: 'bicycle' | 'foot';
  capacity: number;
  speed_kmh: number;
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
  points: RoutePoint[];
  total_distance_m: number;
  total_time_min: number;
  orders_count: number;
}

export interface OptimizationRequest {
  orders: Order[];
  couriers: Courier[];
  depot_latitude: number;
  depot_longitude: number;
}

export interface OptimizationResponse {
  routes: OptimizedRoute[];
  total_time_min: number;
  total_distance_m: number;
  computation_time_ms: number;
}

export interface Depot {
  latitude: number;
  longitude: number;
  address: string;
}