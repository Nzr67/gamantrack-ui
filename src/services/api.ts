import type { Route, Stop, NearbyStop, RouteStop, Timetable, FareCalc, AdminUser, FareMatrixRow, AuditLog, Paginated, Token, FareCalculateResponse, PublicRouteStop, PublicRouteDetail } from '../types';

const BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:8000';

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = BASE.endsWith('/') ? BASE.slice(0, -1) + path : BASE + path;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> || {}),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  try {
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      let detail: string | null = null;
      try {
        const body = await res.json();
        detail = body?.detail ?? body?.message ?? (typeof body === 'string' ? body : JSON.stringify(body));
      } catch {
        detail = await res.text().catch(() => '');
      }
      throw new Error(`HTTP ${res.status}: ${detail || res.statusText}`);
    }
    return res.json();
  } catch (err: any) {
    if (err instanceof TypeError || (err.message && err.message.includes('Failed to fetch'))) {
      throw new Error(`Cannot reach GamanTrack API at ${BASE}. Make sure the FastAPI server is running and CORS is enabled.`);
    }
    throw err;
  }
}

export const api = {
  health: () => request<{status:string;database:string;routes_seeded:number}>('/api/health'),
  stops: (search?: string, limit=100) => request<{items: Stop[];total:number;limit:number;offset:number;has_more:boolean}>(`/api/stops/?${new URLSearchParams({ ...(search?{search}:{}), limit:String(limit) })}`),
  stop: (id: number) => request<Stop>(`/api/stops/${id}`),
  nearby: (lat: number, lng: number, radius=1) => request<NearbyStop[]>(`/api/stops/nearby?lat=${lat}&lng=${lng}&radius_km=${radius}`),
  routes: (search?: string) => request<Route[]>(`/api/routes/${search?`?search=${encodeURIComponent(search)}`:''}`),
  route: (id: number) => request<Route>(`/api/routes/${id}`),
  routeStops: (id: number) => request<RouteStop[]>(`/api/routes/${id}/stops`),
  // New endpoint for getting route stops by route_number (GET /api/routes/{route_number}/stops)
  routeStopsByNumber: (routeNumber: string) => request<{route: PublicRouteDetail, stops: PublicRouteStop[]}>(`/api/routes/${encodeURIComponent(routeNumber)}/stops`),
  schedules: (route_id?: number, day_type?: string, direction?: string) => {
    const p = new URLSearchParams();
    if (route_id) p.set('route_id', String(route_id));
    if (day_type) p.set('day_type', day_type);
    if (direction) p.set('direction', direction);
    return request<{items: Timetable[];total:number;limit:number;offset:number;has_more:boolean}>(`/api/schedules/?${p}`);
  },
  fare: (origin: number, dest: number) => request<FareCalc>(`/api/fare/?origin_stop_id=${origin}&destination_stop_id=${dest}`),

  // New stage-based fare calculation endpoint (GET /api/fare/calculate)
  fareCalculate: (routeNumber: string, fromStage: number, toStage: number) =>
    request<FareCalculateResponse>(`/api/fare/calculate?route_number=${encodeURIComponent(routeNumber)}&from_stage=${fromStage}&to_stage=${toStage}`),

  // Auth endpoints
  login: (username: string, password: string) => request<Token>(`/api/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Admin endpoints
  adminMe: () => request<AdminUser>(`/api/admin/me`),
  adminFareMatrix: () => request<FareMatrixRow[]>(`/api/admin/fare-matrix`),
  adminUpdateFareMatrix: (stage: number, normal: number, semi: number, ac: number) => request<{status:string}>(`/api/admin/fare-matrix`, { method: 'POST', body: new URLSearchParams({ stage_difference: String(stage), normal_fare: String(normal), semi_luxury_fare: String(semi), ac_fare: String(ac) }) }),
  adminTimetables: () => request<Timetable[]>(`/api/admin/timetables`),
  adminAddTimetable: (route_id: number, departure_time: string, day_type: string, direction: string) => request<{status:string}>(`/api/admin/timetables`, { method: 'POST', body: new URLSearchParams({ route_id: String(route_id), departure_time, day_type, direction }) }),
  adminAuditLogs: (limit=50, offset=0) => request<Paginated<AuditLog>>(`/api/admin/audit-logs?limit=${limit}&offset=${offset}`),
};