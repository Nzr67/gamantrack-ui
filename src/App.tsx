import { useEffect, useState } from 'react';
import { api, setAuthToken, clearAuthToken } from './services/api';
import type { Route, RouteStop, Timetable, FareMatrixRow, AuditLog, Token, FareCalculateResponse, PublicRouteStop } from './types';
import {
  User, Eye, EyeOff, Lock, LogIn, Calculator, Clock, Navigation, Users, Ticket,
  ShieldCheck, Search, MapPin, Bus, ArrowUpDown, Table, ClipboardList,
  Activity, Plus, Edit, ChevronUp, AlertCircle, CheckCircle,
  LayoutDashboard, ArrowLeft, Layers, Shield, LogOut,
  Loader2, AlertTriangle,
} from 'lucide-react';

type Screen = 'login'|'fare'|'sched'|'route'|'admin';

type DayType = 'Weekday' | 'Saturday' | 'Sunday / Holiday';
type Direction = 'Outbound' | 'Inbound';

export default function App() {
  const [screen, setScreen] = useState<Screen>('fare');
  const [token, setToken] = useState<string|null>(null);
  const [userRole, setUserRole] = useState<string|null>(null);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [publicRouteStops, setPublicRouteStops] = useState<PublicRouteStop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number|null>(null);
  const [selectedRouteNumber, setSelectedRouteNumber] = useState<string>('');
  const [scheds, setScheds] = useState<Timetable[]>([]);
  const [dayType, setDayType] = useState('Weekday');
  const [direction, setDirection] = useState('Outbound');
  const [originStage, setOriginStage] = useState<number|''>('');
  const [destStage, setDestStage] = useState<number|''>('');
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originOpen, setOriginOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [fare, setFare] = useState<FareCalculateResponse|null>(null);
  const [serviceType, setServiceType] = useState<'Normal'|'Semi-Luxury'|'Luxury'>('Normal');
  const [passengers, setPassengers] = useState(1);
  const [schedQuery, setSchedQuery] = useState('');
  const [routeOrigin, setRouteOrigin] = useState('');
  const [routeDest, setRouteDest] = useState('');
  const [swapped, setSwapped] = useState(false);
  const [fareLoading, setFareLoading] = useState(false);
  const [fareError, setFareError] = useState<string|null>(null);

  // Admin state
  const [adminFareMatrix, setAdminFareMatrix] = useState<FareMatrixRow[]>([]);
  const [adminTimetables, setAdminTimetables] = useState<Timetable[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AuditLog[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string|null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string|null>(null);
  const [editingStage, setEditingStage] = useState<number|null>(null);
  const [editNormal, setEditNormal] = useState('');
  const [editSemi, setEditSemi] = useState('');
  const [editAC, setEditAC] = useState('');
  const [newTimetable, setNewTimetable] = useState({ route_id: '', departure_time: '', day_type: 'Weekday' as DayType, direction: 'Outbound' as Direction });
  const [adminActiveTab, setAdminActiveTab] = useState<'matrix'|'timetables'|'audit'|'overview'>('overview');

  // Sync token with api service
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      clearAuthToken();
    }
  }, [token]);

  useEffect(() => {
    api.routes().then(setRoutes).catch(e=>setError(String(e)));
  }, []);

  const calcFare = async () => {
    if (!selectedRouteNumber || originStage === '' || destStage === '') {
      setFareError('Please select origin and destination stops');
      return;
    }
    setFareLoading(true);
    setFareError(null);
    try {
      const result = await api.fareCalculate(selectedRouteNumber, Number(originStage), Number(destStage));
      setFare(result);
    } catch (e: any) {
      setFareError(e.message || 'Failed to calculate fare');
      setFare(null);
    } finally {
      setFareLoading(false);
    }
  };

  const loadPublicRouteStops = async (routeNumber: string) => {
    setSelectedRouteNumber(routeNumber);
    try {
      const response = await api.routeStopsByNumber(routeNumber);
      setPublicRouteStops(response.stops);
    } catch (e: any) {
      setFareError(e.message || 'Failed to load route stops');
      setPublicRouteStops([]);
    }
  };

  const loadRouteStops = (id:number) => { setSelectedRoute(id); api.routeStops(id).then(setRouteStops); };
  const loadSched = () => { api.schedules(selectedRoute??undefined, dayType, direction).then(r=>setScheds(r.items)).catch(e=>setError(String(e))); };
  useEffect(()=>{ loadSched(); }, [dayType, direction, selectedRoute]);

  // Admin data loading
  const loadAdminData = async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const [matrix, timetables, logs] = await Promise.all([
        api.adminFareMatrix(),
        api.adminTimetables(),
        api.adminAuditLogs(50, 0),
      ]);
      setAdminFareMatrix(matrix);
      setAdminTimetables(timetables);
      setAdminAuditLogs(logs.items);
    } catch (e: any) {
      const msg = e.message || 'Failed to load admin data';
      setAdminError(msg);
      // Handle auth errors - redirect to login
      if (msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Forbidden')) {
        setToken(null);
        setUserRole(null);
        setScreen('login');
        setError('Admin access only. Sign in with the admin account to continue.');
      }
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (screen === 'admin') {
      if (!token || userRole !== 'ADMIN') {
        setScreen('login');
        setError('Admin access only. Sign in with the admin account to continue.');
      } else {
        loadAdminData();
      }
    }
  }, [screen]);

  const filteredScheds = scheds.filter(s => !schedQuery || String(s.route_id).includes(schedQuery));
  const filteredRoutes = routes.filter(r => !schedQuery || r.route_number.includes(schedQuery) || r.start_name.toLowerCase().includes(schedQuery.toLowerCase()) || r.end_name.toLowerCase().includes(schedQuery.toLowerCase()));

  const tierLabel = (t:'Normal'|'Semi-Luxury'|'Luxury') => t==='Normal'?'Standard (1.0x)':t==='Semi-Luxury'?'1.3x Tariff':'2.0x AC Express';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F5F7] via-[#EEF3FA] to-[#E8F4F8]">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00ADC2]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#2B308A]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: logo + NTC LIVE pill */}
          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                <Bus size={16} className="text-[#00ADC2]" />
              </div>
              <span className="font-bold tracking-tight text-sm"><span className="text-[#2B308A]">Gaman</span><span className="text-[#00ADC2]">Track</span></span>
            </div>
            {screen==='login'
              ? <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold whitespace-nowrap">AUTH</span>
              : <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold whitespace-nowrap">NTC LIVE</span>}
          </div>

          {/* Center: compact inline text nav */}
          <div className="hidden md:flex items-center gap-2 shrink-0 whitespace-nowrap">
            {[
              {id:'fare', label:'Fare Calculator', icon: Calculator},
              {id:'sched', label:'Time Schedule', icon: Clock},
              {id:'route', label:'Route Planner', icon: Navigation},
              {id:'admin', label:'Admin', icon: LayoutDashboard},
            ].map(({id,label,icon:Icon})=>(<button key={id} onClick={()=>setScreen(id as Screen)} className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${screen===id?'bg-[#FF9E53] text-white':'text-[#1E293B]'}`}><Icon size={14} className="mr-1.5"/>{label}</button>))}
          </div>

          {/* Right: user/login button */}
          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            {token && userRole === 'ADMIN'
              ? <button onClick={()=>{setToken(null); setUserRole(null); setScreen('fare');}} className="flex items-center gap-1 text-rose-600 text-xs font-medium whitespace-nowrap"><LogOut size={16}/> Sign Out</button>
              : <button onClick={()=>setScreen('login')} className="flex items-center gap-1 text-[#0B4F9C] text-xs font-medium whitespace-nowrap"><LogIn size={16}/> Log In</button>}
          </div>
        </div>
      </header>

      {error && <div className="m-3 p-3 rounded bg-rose-100 text-rose-800 text-sm max-w-md mx-auto">{error} <button onClick={()=>setError(null)} className="ml-2 underline">dismiss</button></div>}

      <main className="max-w-md lg:max-w-6xl mx-auto px-4 lg:px-6 pb-28 md:pb-0">
        {/* Screen 1 Login */}
        {screen==='login' && (
          <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-center p-4">
              {/* Brand panel */}
              <div className="hidden lg:flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-44 h-44 bg-white rounded-2xl shadow-md flex items-center justify-center">
                  <Bus size={64} className="text-[#00ADC2]" />
                </div>
                <p className="text-[#2B308A] font-bold text-[22px] text-center">Gaman<span className="text-[#00ADC2]">Track</span></p>
                <p className="text-xs text-slate-500 text-center tracking-wide">OFFICIAL TRANSIT &amp; FARE NAVIGATOR</p>
              </div>
              {/* Sign-in card */}
              <div className="bg-white rounded-[16px] border border-[#0B4F9C]/30 p-6 shadow-sm max-w-sm mx-auto lg:mx-0">
                <h2 className="text-lg font-bold text-center mb-1">Sign In to GamanTrack</h2>
                <p className="text-xs text-slate-500 text-center mb-4">{userRole === 'ADMIN' ? 'Admin access required. Sign in with admin credentials.' : 'Access saved transit cards, fare history & alerts'}</p>
                <label className="text-sm font-bold block mb-1">Username</label>
                <div className="relative mb-3">
                  <input id="login-username" className="w-full p-2.5 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none" placeholder="username" />
                  <User size={16} className="absolute right-3 top-3 text-slate-400" />
                </div>
                <label className="text-sm font-bold block mb-1">Password</label>
                <div className="relative mb-2">
                  <input id="login-password" type={showPw?'text':'password'} className="w-full p-2.5 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none" placeholder="password" />
                  <button onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-2.5 text-slate-400">{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                </div>
                <div className="text-right mb-3"><a className="text-xs text-blue-700">Forgot Password?</a></div>
                <button 
                  onClick={async () => {
                    const u = (document.getElementById('login-username') as HTMLInputElement).value;
                    const p = (document.getElementById('login-password') as HTMLInputElement).value;
                    if (!u || !p) { setError('Please enter username and password'); return; }
                    try {
                      const res: Token = await api.login(u, p);
                      setToken(res.access_token);
                      setUserRole(res.role);
                      setError(null);
                      if (res.role === 'ADMIN') {
                        setScreen('admin');
                      } else {
                        setScreen('fare');
                      }
                    } catch (e: any) {
                      setError(e.message || 'Login failed');
                    }
                  }} 
                  className="w-full py-2.5 bg-[#0B4F9C] text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                  <Lock size={16}/>Log In
                </button>
                {userRole !== 'ADMIN' && (
                  <button onClick={()=>{setScreen('fare');}} className="w-full mt-3 text-xs text-blue-700 underline text-center">Continue as guest</button>
                )}
                {userRole === 'ADMIN' && token && (
                  <button onClick={()=>{setToken(null); setUserRole(null); setScreen('fare');}} className="w-full mt-3 text-xs text-rose-600 underline text-center">Sign out (admin)</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Screen 2 Fare */}
        {screen==='fare' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
            {/* Gradient hero band */}
            <div className="w-full max-w-6xl mx-auto bg-[#F4F5F7] rounded-[24px] border border-[#E2E8F0] shadow-xl p-6 lg:p-10 flex flex-col lg:flex-row gap-8 items-start">
              {/* Left: Calculator form */}
              <div className="w-full lg:w-[42%] flex-shrink-0">
                <div className="space-y-3 mb-4">
                  <h1 className="text-[22px] font-bold text-[#1E293B]">Official NTC Fare Calculator</h1>
                  <p className="text-[13px] text-[#64748B]">Compute official ticket prices using National Transport Commission stage rates</p>
                </div>
                <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-4 space-y-3">
                  {/* Route Selection */}
                  <div>
                    <label className="text-sm font-bold block mb-1">Route <span className="text-xs text-slate-400 float-right">Bus Service</span></label>
                    <select
                      value={selectedRouteNumber}
                      onChange={(e) => {
                        const routeNum = e.target.value;
                        if (routeNum) {
                          loadPublicRouteStops(routeNum);
                        } else {
                          setSelectedRouteNumber('');
                          setPublicRouteStops([]);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none text-sm"
                    >
                      <option value="">Select a route</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.route_number}>
                          {r.route_number} — {r.start_name} → {r.end_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Origin combobox - using route stops with stage_number */}
                  <div className="relative group">
                    <label className="text-sm font-bold block mb-1">Origin <span className="text-xs text-slate-400 float-right">Boarding Stage</span></label>
                    <input
                      value={originQuery}
                      onChange={(e) => {
                        setOriginQuery(e.target.value);
                        setOriginOpen(true);
                        setOriginStage('');
                      }}
                      onFocus={() => setOriginOpen(true)}
                      onBlur={() => setTimeout(() => setOriginOpen(false), 150)}
                      className="w-full p-2.5 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none"
                      placeholder="Getting On At"
                    />
                    {originOpen && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        {publicRouteStops.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-500">
                            {selectedRouteNumber ? 'Loading stops...' : 'Select a route first'}
                          </div>
                        ) : (
                          publicRouteStops.map((s) => (
                            <button
                              key={s.stage_number}
                              onClick={() => {
                                setOriginStage(s.stage_number);
                                setOriginQuery(`${s.stop_name} (Stage ${s.stage_number})`);
                                setOriginOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-[#F4F5F7] border-b border-[#E2E8F0] last:border-0"
                            >
                              <span className="font-medium">{s.stop_name}</span>
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">Stage {s.stage_number}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Destination combobox - using route stops with stage_number */}
                  <div className="relative group">
                    <label className="text-sm font-bold block mb-1">Destination <span className="text-xs text-slate-400 float-right">Arrival Stage</span></label>
                    <input
                      value={destQuery}
                      onChange={(e) => {
                        setDestQuery(e.target.value);
                        setDestOpen(true);
                        setDestStage('');
                      }}
                      onFocus={() => setDestOpen(true)}
                      onBlur={() => setTimeout(() => setDestOpen(false), 150)}
                      className="w-full p-2.5 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none"
                      placeholder="Getting Off At"
                    />
                    {destOpen && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        {publicRouteStops.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-500">
                            {selectedRouteNumber ? 'Loading stops...' : 'Select a route first'}
                          </div>
                        ) : (
                          publicRouteStops.map((s) => (
                            <button
                              key={s.stage_number}
                              onClick={() => {
                                setDestStage(s.stage_number);
                                setDestQuery(`${s.stop_name} (Stage ${s.stage_number})`);
                                setDestOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-[#F4F5F7] border-b border-[#E2E8F0] last:border-0"
                            >
                              <span className="font-medium">{s.stop_name}</span>
                              <span className="ml-2 px-2 py-0.5 text-xs bg-rose-50 text-rose-700 rounded">Stage {s.stage_number}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Service Type */}
                  <div className="bg-[#FF9E53] rounded-xl p-1 flex">
                    {(['Normal','Semi-Luxury','Luxury'] as const).map((t: 'Normal'|'Semi-Luxury'|'Luxury')=>(
                      <button key={t} onClick={()=>setServiceType(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold ${serviceType===t?'bg-white text-[#1E293B]':'text-white'}`}>
                        {t}<br/><span className="text-[10px] font-normal">{tierLabel(t)}</span>
                      </button>
                    ))}
                  </div>

                  {/* Passengers */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2">
                    <button disabled={passengers<=1} onClick={()=>setPassengers(p=>Math.max(1,p-1))} className="w-8 h-8 rounded-full bg-white shadow text-lg disabled:opacity-40">-</button>
                    <span className="flex items-center gap-2 text-sm font-semibold"><Users size={16}/>{passengers} {passengers===1?'Person':'People'}</span>
                    <button onClick={()=>setPassengers(p=>p+1)} className="w-8 h-8 rounded-full bg-white shadow text-lg">+</button>
                  </div>

                  {/* Calculate Button */}
                  <button
                    onClick={calcFare}
                    disabled={fareLoading || !selectedRouteNumber || originStage === '' || destStage === ''}
                    className="w-full py-2.5 bg-[#FF9E53] hover:bg-[#F39144] text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fareLoading ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
                    {fareLoading ? 'Calculating...' : 'Calculate Fare'}
                  </button>

                  {/* Error Message */}
                  {fareError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      <span>{fareError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Sri Lanka NTC transit info + live estimate */}
              <div className="w-full lg:w-[56%] flex-shrink-0 space-y-4">
                <div className="bg-[#F4F5F7] rounded-[16px] border border-[#E2E8F0] p-4 space-y-3">
                  <h2 className="text-sm font-bold text-[#475569] tracking-wide uppercase">How NTC Fare Stages Work</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">Sri Lankan bus fares are set by the National Transport Commission (NTC) and scaled by stage difference between stops. Normal = 1.0x base tariff, Semi-Luxury = 1.3x, Luxury/AC = 2.0x express tariff.</p>
                </div>
                <div className="bg-[#F4F5F7] rounded-[16px] border border-[#E2E8F0] p-4 space-y-3">
                  <h2 className="text-sm font-bold text-[#475569] tracking-wide uppercase">Key Corridors</h2>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li><span className="font-semibold text-[#1E293B]">Route 120:</span> Horana ↔ Pettah</li>
                    <li><span className="font-semibold text-[#1E293B]">Route 138:</span> Homagama ↔ Pettah</li>
                    <li><span className="font-semibold text-[#1E293B]">Route 099:</span> Rakwana ↔ Rathnapura</li>
                  </ul>
                </div>
                <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>OFFICIAL NTC FARE ESTIMATE</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#0B4F9C] font-semibold">{serviceType}</span>
                  </div>
                  {fare ? (
                    <>
                      <div className="bg-[#F4F5F7] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-slate-500">Total Price ({passengers} ticket{passengers>1?'s':''})</div>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                            {fare.currency} {Number(fare.fare).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-[#0B4F9C] flex items-end gap-2">
                          {fare.currency} {Number(fare.fare * passengers).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Unit Fare: {fare.currency} {Number(fare.fare).toFixed(2)}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-slate-400 font-semibold">NTC STAGE DIFF</div>
                          <div className="font-bold text-xl text-[#0B4F9C]">{fare.stage_difference}</div>
                          <div className="text-[10px] text-slate-500">stages</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-slate-400 font-semibold">ROUTE</div>
                          <div className="font-bold text-sm">{fare.route_number}</div>
                          <div className="text-[10px] text-slate-500">{fare.start_name} → {fare.end_name}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-slate-400 font-semibold">STAGES</div>
                          <div className="font-bold text-sm">{fare.from_stage} → {fare.to_stage}</div>
                          <div className="text-[10px] text-slate-500">boarding → arrival</div>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-xs text-[#0B4F9C]">
                        Recommended Bus Service — <button onClick={()=>setScreen('route')} className="underline font-semibold">View timetable & route planner →</button>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400"><ShieldCheck size={12}/> NTC approved fare matrix</div>
                    </>
                  ) : (
                    <div className="bg-[#F4F5F7] rounded-xl p-12 text-center text-slate-400 text-xs">
                      {publicRouteStops.length > 0
                        ? 'Select origin & destination stages to calculate fare'
                        : 'Select a route to load fare stages'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Screen 3 Schedules */}
        {screen==='sched' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <h1 className="text-[22px] font-bold text-[#1E293B] mb-1 md:text-left">Bus Timetables & Schedules</h1>
              <p className="text-[13px] text-[#64748B] mb-4 md:text-left">Look up terminal departure times and service frequencies</p>
              <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-4 space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input value={schedQuery} onChange={e=>setSchedQuery(e.target.value)} className="w-full pl-9 p-2.5 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none" placeholder="Enter Route No. or Stop Name (e.g., 138 or Pettah)" />
                </div>
                <div className="text-xs text-slate-500">Quick: {['138','99','122','EX-01','Pettah','Kandy'].map(q=>(
                  <button key={q} onClick={()=>setSchedQuery(q)} className={`mr-1 px-2 py-0.5 rounded-full border ${schedQuery===q?'bg-[#FF9E53] text-white border-[#FF9E53]':'bg-white border-slate-200'}`}>{q}</button>
                ))}</div>
                <button onClick={loadSched} className="w-full py-2.5 bg-[#0B4F9C] text-white rounded-xl font-semibold flex items-center justify-center gap-2"><Clock size={16}/>Find Available Busses</button>
                <div className="flex gap-2">
                  <select value={dayType} onChange={e=>setDayType(e.target.value)} className="flex-1 p-2 rounded-xl bg-[#E8ECEF] text-xs">
                    {['Weekday','Saturday','Sunday / Holiday'].map(d=><option key={d}>{d}</option>)}
                  </select>
                  <select value={direction} onChange={e=>setDirection(e.target.value)} className="flex-1 p-2 rounded-xl bg-[#E8ECEF] text-xs">
                    {['Outbound','Inbound'].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#475569] tracking-wide uppercase">{filteredScheds.length?`MATCHING ROUTES (${filteredScheds.length})`:'POPULAR TERMINAL SCHEDULES'}</span>
                <span className="text-xs text-slate-400">Updated Daily</span>
              </div>
              <div className="space-y-3">
                {filteredScheds.length===0 && filteredRoutes.length===0 && (
                  <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-6 text-center">
                    <Bus size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">No matching schedules found</p>
                    <button onClick={()=>{setSchedQuery('');loadSched();}} className="text-xs text-blue-700 underline mt-1">Show all schedules</button>
                  </div>
                )}
                {filteredScheds.map((s,i)=>(
                  <div key={s.id} className="bg-white rounded-[16px] border border-[#E2E8F0] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-[#0B4F9C] text-white text-xs font-bold">R{s.route_id}</span>
                      <span className="text-sm font-semibold">Route {s.route_id}</span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#0B4F9C] font-semibold">Operator</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600">Origin → Destination</div>
                    <div className="flex justify-between text-xs text-slate-500"><span>Platform: —</span><span>Freq: —</span></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Upcoming Departures</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-[#FF9E53] text-white text-xs font-semibold">{s.departure_time} (Next)</span>
                        {filteredScheds.slice(i+1,i+4).map(x=>(<span key={x.id} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{x.departure_time}</span>))}
                        {filteredScheds.length>i+4 && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">+{filteredScheds.length-i-4} more</span>}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500"><span>Via: —</span><span>~Rs. —</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Screen 4 Route planner */}
        {screen==='route' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <h1 className="text-[22px] font-bold text-[#1E293B] mb-1 md:text-left">Find Your Bus Route</h1>
              <p className="text-[13px] text-[#64748B] mb-4 md:text-left">Search direct and connecting bus lines between any two stops</p>
              <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-4 space-y-3">
                <div>
                  <label className="text-sm font-bold block">Boarding Location <span className="text-xs text-slate-400 float-right">Origin Stop</span></label>
                  <div className="relative mt-1">
                    <MapPin size={16} className="absolute left-3 top-3 text-emerald-600" />
                    <input value={routeOrigin} onChange={e=>setRouteOrigin(e.target.value)} className="w-full pl-9 p-2.5 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none" placeholder="Enter starting stop (e.g., Rakwana)" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block">Destination <span className="text-xs text-slate-400 float-right">Target Stop</span></label>
                  <div className="relative mt-1">
                    <MapPin size={16} className="absolute left-3 top-3 text-rose-600" />
                    <input value={routeDest} onChange={e=>setRouteDest(e.target.value)} className="w-full pl-9 p-2.5 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none" placeholder="Enter destination stop (e.g., Rathnapura)" />
                  </div>
                </div>
                <p className="text-xs italic text-slate-400">*Select from the suggested stops for accurate route matching.</p>
                <div className="text-xs text-slate-500 mb-2 flex flex-wrap gap-1">Pairs: {['Rakwana ⇄ Rathnapura','Pettah ⇄ Maharagama','Colombo ⇄ Kandy'].map((p,i)=>(<button key={i} onClick={()=>{}} className="px-3 py-1 rounded-full border border-slate-200 bg-slate-100 hover:bg-orange-50 text-[#1E293B] text-xs font-medium">{p}</button>))}</div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>{setSwapped(!swapped); const a=routeOrigin; setRouteOrigin(routeDest); setRouteDest(a);}} className="w-12 h-12 rounded-xl bg-[#FF9E53] text-white flex items-center justify-center"><ArrowUpDown size={20} className={swapped?'rotate-180 transition-transform':'transition-transform'} /></button>
                  <button onClick={()=>{ const r = routes[0]; if(r) loadRouteStops(r.id); }} className="flex-1 py-2.5 bg-[#FF9E53] hover:bg-[#F39144] text-white rounded-xl font-semibold flex items-center justify-center gap-2"><Navigation size={16}/>Find Available Busses</button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#475569] tracking-wide uppercase">AVAILABLE LINES ({routes.length})</span>
                <span className="text-xs text-slate-400">Origin → Destination</span>
              </div>
              <div className="space-y-3">
                {routes.map(r=>(
                  <div key={r.id} onClick={()=>loadRouteStops(r.id)} className="bg-white rounded-[16px] border border-[#E2E8F0] p-5 space-y-4 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Direct Route</span>
                      <span className="font-bold text-[#0B4F9C] text-sm flex items-center gap-1"><Clock size={14}/> —</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-[#0B4F9C] text-white text-xs font-bold">{r.route_number}</span>
                      <span className="text-sm font-semibold">{r.start_name} → {r.end_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#F4F5F7] rounded-lg p-2">
                      <div><div className="text-slate-400">Distance</div><div className="font-bold">—</div></div>
                      <div><div className="text-slate-400">NTC Stages</div><div className="font-bold">—</div></div>
                      <div><div className="text-slate-400">Est. Fare</div><div className="font-bold">—</div></div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-2 mb-1"><Bus size={14} className="text-[#0B4F9C]"/><span className="font-semibold">Service</span><span className="ml-auto px-2 py-0.5 rounded-full bg-blue-50 text-[#0B4F9C] text-[10px]">Normal</span></div>
                      <div className="text-slate-600">{r.start_name} → {r.end_name}</div>
                      <div className="text-slate-400 mt-1">Operator · Freq: —</div>
                    </div>
                    {selectedRoute===r.id && routeStops.length>0 && (
                      <div className="text-xs text-slate-600">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Key Route Stops</p>
                        <div className="flex flex-wrap items-center gap-1">
                          {routeStops.sort((a,b)=>a.stop_sequence-b.stop_sequence).map((rs,idx,arr)=>(
                            <span key={rs.stop_id} className="flex items-center gap-1">
                              <span className={idx===0?'text-emerald-600 font-semibold':idx===arr.length-1?'text-rose-600 font-semibold':'text-slate-500'}>stop {rs.stop_id}</span>
                              {idx<arr.length-1 && <span className="text-slate-300">→</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Screen 5 Admin Dashboard */}
        {screen==='admin' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
            {/* Header row with back to commuter */}
            <div className="w-full max-w-3xl mx-auto mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={()=>setScreen('fare')} className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F4F5F7] transition"><ArrowLeft size={18} className="text-[#0B4F9C]"/></button>
                <div>
                  <h1 className="text-[22px] font-bold text-[#1E293B]">Admin Dashboard</h1>
                  <p className="text-[13px] text-[#64748B]">Manage NTC fare matrix, timetables & audit logs</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-xs font-semibold border border-rose-200 flex items-center gap-1"><Shield size={12}/>ADMIN MODE</span>
            </div>

            {/* Summary metrics strip */}
            <div className="w-full max-w-3xl mx-auto mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-4 space-y-1">
                <div className="flex items-center gap-2"><Layers size={16} className="text-[#0B4F9C]"/><span className="text-xs font-bold text-[#475569] tracking-wide uppercase">Active Routes</span></div>
                <div className="text-2xl font-bold text-[#1E293B]">{routes.length > 0 ? routes.length : '—'}</div>
                <div className="text-xs text-slate-500">Routes 120, 138, 099</div>
              </div>
              <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-4 space-y-1">
                <div className="flex items-center gap-2"><Table size={16} className="text-[#FF9E53]"/><span className="text-xs font-bold text-[#475569] tracking-wide uppercase">Fare Matrix Stages</span></div>
                <div className="text-2xl font-bold text-[#1E293B]">{adminFareMatrix.length > 0 ? adminFareMatrix.length : adminLoading ? '…' : '—'}</div>
                <div className="text-xs text-slate-500">Stage differences 1–30</div>
              </div>
              <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-4 space-y-1">
                <div className="flex items-center gap-2"><Activity size={16} className="text-emerald-600"/><span className="text-xs font-bold text-[#475569] tracking-wide uppercase">Recent Audit Logs</span></div>
                <div className="text-2xl font-bold text-[#1E293B]">{adminAuditLogs.length > 0 ? adminAuditLogs.length : adminLoading ? '…' : '—'}</div>
                <div className="text-xs text-slate-500">Last 50 entries</div>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="w-full max-w-3xl mx-auto mb-4 bg-white rounded-[16px] border border-[#E2E8F0] p-1">
              <div className="flex gap-1">
                {[
                  {id:'overview' as const, label:'Overview', icon: LayoutDashboard},
                  {id:'matrix' as const, label:'Fare Matrix', icon: Table},
                  {id:'timetables' as const, label:'Timetables', icon: ClipboardList},
                  {id:'audit' as const, label:'Audit Logs', icon: Activity},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setAdminActiveTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${adminActiveTab===t.id?'bg-[#FF9E53] text-white':'text-[#475569]'}`}>
                    <t.icon size={14}/>{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="w-full max-w-3xl mx-auto">
              {/* Overview Tab */}
              {adminActiveTab==='overview' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-4 space-y-3">
                    <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600"/><span className="text-sm font-bold text-[#1E293B]">System Status</span></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">API Health</div><div className="font-bold text-emerald-600">Healthy</div></div>
                      <div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Database</div><div className="font-bold text-emerald-600">Connected</div></div>
                      <div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">NTC Tariff Tiers</div><div className="font-bold text-[#0B4F9C]">3 Active</div></div>
                      <div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Admin Users</div><div className="font-bold text-[#1E293B]">1</div></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-4 space-y-3">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2"><ClipboardList size={16} className="text-[#0B4F9C]"/><span className="text-sm font-bold text-[#1E293B]">Quick Actions</span></span></div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={()=>{setAdminActiveTab('matrix');}} className="px-4 py-2 rounded-xl bg-[#0B4F9C] text-white text-xs font-semibold flex items-center gap-2"><Plus size={14}/>Edit Fare Matrix</button>
                      <button onClick={()=>{setAdminActiveTab('timetables');}} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2"><Plus size={14}/>Add Timetable</button>
                      <button onClick={()=>{setAdminActiveTab('audit');}} className="px-4 py-2 rounded-xl bg-slate-600 text-white text-xs font-semibold flex items-center gap-2"><Activity size={14}/>View Audit Logs</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-4 space-y-3">
                    <div className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-600"/><span className="text-sm font-bold text-[#1E293B]">NTC Gazette Tariff Reference</span></div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-blue-50 rounded-xl"><div className="text-xs text-slate-500">Normal</div><div className="font-bold text-blue-700">1.0x Base</div><div className="text-[10px] text-slate-500">Standard service</div></div>
                      <div className="p-3 bg-amber-50 rounded-xl"><div className="text-xs text-slate-500">Semi-Luxury</div><div className="font-bold text-amber-700">1.3x Tariff</div><div className="text-[10px] text-slate-500">Semi-luxury bus</div></div>
                      <div className="p-3 bg-rose-50 rounded-xl"><div className="text-xs text-slate-500">AC Luxury</div><div className="font-bold text-rose-700">2.0x Express</div><div className="text-[10px] text-slate-500">AC express service</div></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fare Matrix Tab */}
              {adminActiveTab==='matrix' && (
                <div className="space-y-4">
                  {adminError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 flex items-center justify-between"><AlertCircle size={16} className="mr-2"/><span>{adminError}</span><button onClick={()=>setAdminError(null)} className="text-rose-500 hover:text-rose-700">×</button></div>}
                  {adminSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center justify-between"><CheckCircle size={16} className="mr-2"/><span>{adminSuccess}</span><button onClick={()=>setAdminSuccess(null)} className="text-emerald-500 hover:text-emerald-700">×</button></div>}
                  <div className="bg-white rounded-[16px] border border-[#E2E8F0] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F4F5F7] border-b border-[#E2E8F0]">
                          <tr>
                            <th className="p-3 text-left font-semibold text-[#475569]">Stage Diff.</th>
                            <th className="p-3 text-right font-semibold text-[#475569]">Normal (1.0x)</th>
                            <th className="p-3 text-right font-semibold text-[#475569]">Semi-Luxury (1.3x)</th>
                            <th className="p-3 text-right font-semibold text-[#475569]">AC Luxury (2.0x)</th>
                            <th className="p-3 text-center font-semibold text-[#475569]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading…</td></tr>
                          ) : adminFareMatrix.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No fare matrix data</td></tr>
                          ) : (
                            adminFareMatrix.map((row, idx) => (
                              <tr key={row.stage_difference} className={idx%2===0 ? 'bg-slate-50/50' : ''}>
                                <td className="p-3 font-mono font-medium text-[#1E293B]">{row.stage_difference}</td>
                                <td className="p-3 text-right font-mono text-slate-700">Rs. {Number(row.normal_fare).toFixed(2)}</td>
                                <td className="p-3 text-right font-mono text-slate-700">Rs. {Number(row.semi_luxury_fare).toFixed(2)}</td>
                                <td className="p-3 text-right font-mono text-slate-700">Rs. {Number(row.ac_fare).toFixed(2)}</td>
                                <td className="p-3 text-center">
                                  {editingStage === row.stage_difference ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <input type="number" step="0.01" min="0" value={editNormal} onChange={e=>setEditNormal(e.target.value)} className="w-20 px-2 py-1 text-xs border border-[#E2E8F0] rounded-lg bg-white outline-none focus:border-[#FF9E53] text-right" />
                                      <input type="number" step="0.01" min="0" value={editSemi} onChange={e=>setEditSemi(e.target.value)} className="w-20 px-2 py-1 text-xs border border-[#E2E8F0] rounded-lg bg-white outline-none focus:border-[#FF9E53] text-right" />
                                      <input type="number" step="0.01" min="0" value={editAC} onChange={e=>setEditAC(e.target.value)} className="w-20 px-2 py-1 text-xs border border-[#E2E8F0] rounded-lg bg-white outline-none focus:border-[#FF9E53] text-right" />
                                      <button onClick={async () => { setAdminLoading(true); setAdminError(null); try { await api.adminUpdateFareMatrix(row.stage_difference, Number(editNormal), Number(editSemi), Number(editAC)); setAdminSuccess(`Updated stage ${row.stage_difference}`); loadAdminData(); } catch(e:any){ setAdminError(e.message); } finally { setAdminLoading(false); setEditingStage(null); } }} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle size={12}/></button>
                                      <button onClick={()=>{setEditingStage(null);}} className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"><ChevronUp size={12}/></button>
                                    </div>
                                  ) : (
                                    <button onClick={()=>{setEditingStage(row.stage_difference); setEditNormal(row.normal_fare); setEditSemi(row.semi_luxury_fare); setEditAC(row.ac_fare);}} className="p-1.5 rounded-lg bg-blue-50 text-[#0B4F9C] hover:bg-blue-100"><Edit size={12}/></button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Timetables Tab */}
              {adminActiveTab==='timetables' && (
                <div className="space-y-4">
                  {adminError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 flex items-center justify-between"><AlertCircle size={16} className="mr-2"/><span>{adminError}</span><button onClick={()=>setAdminError(null)} className="text-rose-500 hover:text-rose-700">×</button></div>}
                  {adminSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center justify-between"><CheckCircle size={16} className="mr-2"/><span>{adminSuccess}</span><button onClick={()=>setAdminSuccess(null)} className="text-emerald-500 hover:text-emerald-700">×</button></div>}
                  
                  {/* Add new timetable form */}
                  <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-4 space-y-3">
                    <div className="flex items-center gap-2"><Plus size={16} className="text-emerald-600"/><span className="text-sm font-bold text-[#1E293B]">Add New Timetable Entry</span></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Route ID</label>
                        <select value={newTimetable.route_id} onChange={e=>setNewTimetable({...newTimetable, route_id: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none text-sm">
                          <option value="">Select route</option>
                          {routes.map(r=>(<option key={r.id} value={r.id}>{r.route_number} — {r.start_name} → {r.end_name}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Departure Time</label>
                        <input type="time" value={newTimetable.departure_time} onChange={e=>setNewTimetable({...newTimetable, departure_time: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Day Type</label>
                        <select value={newTimetable.day_type} onChange={e=>setNewTimetable({...newTimetable, day_type: e.target.value as DayType})} className="w-full px-3 py-2 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none text-sm">
                          <option value="Weekday">Weekday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday / Holiday">Sunday / Holiday</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Direction</label>
                        <select value={newTimetable.direction} onChange={e=>setNewTimetable({...newTimetable, direction: e.target.value as Direction})} className="w-full px-3 py-2 rounded-xl bg-[#E8ECEF] focus:bg-white focus:border-[#FF9E53] border border-transparent outline-none text-sm">
                          <option value="Outbound">Outbound</option>
                          <option value="Inbound">Inbound</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={async () => { if(!newTimetable.route_id || !newTimetable.departure_time){ setAdminError('Please fill all fields'); return; } setAdminLoading(true); setAdminError(null); try { await api.adminAddTimetable(Number(newTimetable.route_id), newTimetable.departure_time, newTimetable.day_type, newTimetable.direction); setAdminSuccess('Timetable added'); loadAdminData(); setNewTimetable({route_id:'', departure_time:'', day_type:'Weekday', direction:'Outbound'}); } catch(e:any){ setAdminError(e.message); } finally { setAdminLoading(false); } }} disabled={adminLoading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"><Plus size={16}/>{adminLoading?'Adding…':'Add Timetable'}</button>
                  </div>

                  {/* Existing timetables list */}
                  <div className="bg-white rounded-[16px] border border-[#E2E8F0] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F4F5F7] border-b border-[#E2E8F0]">
                          <tr>
                            <th className="p-3 text-left font-semibold text-[#475569]">Route</th>
                            <th className="p-3 text-center font-semibold text-[#475569]">Time</th>
                            <th className="p-3 text-center font-semibold text-[#475569]">Day Type</th>
                            <th className="p-3 text-center font-semibold text-[#475569]">Direction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading…</td></tr>
                          ) : adminTimetables.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No timetable entries</td></tr>
                          ) : (
                            adminTimetables.map((t, idx) => (
                              <tr key={t.id} className={idx%2===0 ? 'bg-slate-50/50' : ''}>
                                <td className="p-3 font-mono font-medium text-[#1E293B]">Route {t.route_id}</td>
                                <td className="p-3 text-center font-mono text-slate-700">{t.departure_time}</td>
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#0B4F9C]">{t.day_type}</span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">{t.direction}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Logs Tab */}
              {adminActiveTab==='audit' && (
                <div className="space-y-4">
                  {adminError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 flex items-center justify-between"><AlertCircle size={16} className="mr-2"/><span>{adminError}</span><button onClick={()=>setAdminError(null)} className="text-rose-500 hover:text-rose-700">×</button></div>}
                  <div className="bg-white rounded-[16px] border border-[#E2E8F0] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F4F5F7] border-b border-[#E2E8F0]">
                          <tr>
                            <th className="p-3 text-left font-semibold text-[#475569]">Admin</th>
                            <th className="p-3 text-left font-semibold text-[#475569]">Action</th>
                            <th className="p-3 text-right font-semibold text-[#475569]">% Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminLoading ? (
                            <tr><td colSpan={3} className="p-8 text-center text-slate-500">Loading…</td></tr>
                          ) : adminAuditLogs.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-slate-500">No audit log entries</td></tr>
                          ) : (
                            adminAuditLogs.map((log, idx) => (
                              <tr key={log.id} className={idx%2===0 ? 'bg-slate-50/50' : ''}>
                                <td className="p-3 font-medium text-[#1E293B]">{log.admin_username}</td>
                                <td className="p-3 text-slate-600 max-w-md truncate">{log.action_summary}</td>
                                <td className="p-3 text-right font-mono text-slate-700">{log.percentage_change}%</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom nav (hidden on login) */}
      {screen!=='login' && (
        <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-full max-w-xs sm:max-w-sm px-4 md:hidden">
          <div className="bg-[#FF9E53] rounded-full px-4 py-2.5 shadow-xl shadow-orange-500/20 border border-orange-400/40 flex justify-around">
            {[
              {id:'fare' as Screen, icon: Calculator},
              {id:'sched' as Screen, icon: Clock},
              {id:'route' as Screen, icon: Navigation},
              {id:'admin' as Screen, icon: LayoutDashboard},
            ].map(({id,icon:Icon})=>{
              const active = screen===id;
              return (
                <button key={id} onClick={()=>setScreen(id)} className={active?'w-11 h-11 rounded-full bg-white shadow-md scale-105 flex items-center justify-center':'flex items-center justify-center'}>
                  <Icon size={20} strokeWidth={active?2.4:2} className={active?'text-[#1E293B]':'text-black'} />
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}