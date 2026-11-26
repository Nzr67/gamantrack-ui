export interface Route { id: number; route_number: string; start_name: string; end_name: string; }
export interface Stop { id: number; stop_name: string; latitude: number; longitude: number; }
export interface NearbyStop extends Stop { distance_km: number; }
export interface RouteStop { route_id: number; stop_id: number; stop_sequence: number; fare_stage: number | null; }
export interface Timetable { id: number; route_id: number; departure_time: string; day_type: string; direction: string; }
export interface Paginated<T> { items: T[]; total: number; limit: number; offset: number; has_more: boolean; }
export interface FareCalc { origin_stop: Stop; destination_stop: Stop; stage_difference: number; fare: string; }

// New types for stage-based fare calculation (public.fare_stages)
export interface PublicRouteStop { stage_number: number; stop_name: string; stop_order: number; }
export interface PublicRouteDetail { id: number; route_number: string; start_name: string; end_name: string; service_type: string | null; }
export interface FareCalculateResponse {
  route_number: string;
  start_name: string;
  end_name: string;
  from_stage: number;
  to_stage: number;
  stage_difference: number;
  fare: number;
  currency: string;
}

// Auth types
export interface Token { access_token: string; token_type: string; username: string; role: string; }
export interface LoginRequest { username: string; password: string; }

// Admin types
export interface AdminUser { id: number; username: string; role: string; }
export interface FareMatrixRow { stage_difference: number; normal_fare: string; semi_luxury_fare: string; ac_fare: string; }
export interface AuditLog { id: number; admin_id: number; admin_username: string; action_summary: string; percentage_change: string; }