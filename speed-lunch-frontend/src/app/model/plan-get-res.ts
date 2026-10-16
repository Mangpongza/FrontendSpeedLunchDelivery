export interface PlanGetResponse {
  shop?: { shop_latitude: number; shop_longitude: number };
  id: number;
  delivery_date: string;
  revision: number;
  status: string;
  departure_time: string;
  deadline_time: string;
  rider_count: number;
  total_orders: number;
  total_boxes: number;
  distance_km: number;
  delivery_cost: number;
  revenue: number;
  food_cost: number;
  late_orders: number;
  late_penalty: number;
  profit: number;
  last_arrival_time: string;
  all_on_time: boolean;
  routes: RiderRoute[];
}

export interface RiderRoute {
  rider_id: number;
  shop?: { shop_latitude: number; shop_longitude: number };
  route_id: number;
  job_code: string;
  rider_number: number;
  rider_name: string;
  rider_phone: string;
  total_boxes: number;
  total_orders: number;
  distance_km: number;
  duration_minutes: number;
  delivery_cost: number;
  navigation_url: string;
  status: string;
  departure_time: string;
  stops: RouteStop[];
  instructions?: string[];
}

export interface RouteStop {
  stop_id: number;
  stop_sequence: number;
  arrival_time: string;
  status: string;
  quantity: number;
  customer_name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
}

export type PlanSummary = Omit<PlanGetResponse, 'routes'>;
