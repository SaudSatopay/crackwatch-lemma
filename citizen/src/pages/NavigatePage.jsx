import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, MapPin, AlertTriangle, Route, X, Search, Shield, ChevronUp, Clock, Ruler } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEMO_POTHOLES = [
  { id: 'P1', lat: 19.0330, lng: 73.0297, severity: 82, type: 'Pothole', status: 'submitted' },
  { id: 'P2', lat: 19.0176, lng: 73.0596, severity: 65, type: 'Alligator Crack', status: 'in_progress' },
  { id: 'P3', lat: 19.0450, lng: 73.0200, severity: 91, type: 'Pothole', status: 'submitted' },
  { id: 'P4', lat: 19.0280, lng: 73.0450, severity: 28, type: 'Transverse Crack', status: 'fixed' },
  { id: 'P5', lat: 19.0550, lng: 73.0100, severity: 73, type: 'Pothole', status: 'submitted' },
  { id: 'P6', lat: 19.0100, lng: 73.0700, severity: 87, type: 'Alligator Crack', status: 'submitted' },
  { id: 'P7', lat: 19.0380, lng: 73.0350, severity: 45, type: 'Spalling', status: 'in_progress' },
  { id: 'P8', lat: 19.0600, lng: 73.0050, severity: 38, type: 'Crack', status: 'fixed' },
];

function RoutingControl({ from, to, potholes, avoidPotholes, onRoutesFound }) {
  const map = useMap();
  const routeRef = useRef(null);

  useEffect(() => {
    if (!from || !to) return;
    if (routeRef.current) { try { map.removeControl(routeRef.current); } catch {} }

    const control = L.Routing.control({
      waypoints: [L.latLng(from.lat, from.lng), L.latLng(to.lat, to.lng)],
      routeWhileDragging: false,
      addWaypoints: false,
      showAlternatives: true,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving',
        useHints: false,
        // Request max alternatives
      }),
      // Color ALL routes gray initially — we recolor after analysis
      lineOptions: { styles: [{ color: '#ffffff', weight: 4, opacity: 0.15 }] },
      altLineOptions: { styles: [{ color: '#ffffff', weight: 3, opacity: 0.1, dashArray: '6 6' }] },
      createMarker: () => null,
      show: false,
      fitSelectedRoutes: true,
    });

    control.on('routesfound', (e) => {
      const unfixed = potholes.filter(p => p.status !== 'fixed');
      const analyzed = e.routes.map((route, idx) => {
        const coords = route.coordinates;
        let hazards = [];
        let totalSeverity = 0;

        unfixed.forEach(pothole => {
          for (const coord of coords) {
            const dist = map.distance(L.latLng(coord.lat, coord.lng), L.latLng(pothole.lat, pothole.lng));
            if (dist < 100) {
              hazards.push({ ...pothole, distFromRoute: Math.round(dist) });
              totalSeverity += pothole.severity;
              break;
            }
          }
        });

        const safetyScore = Math.max(0, 100 - (hazards.length * 15) - (totalSeverity / 10));
        return {
          index: idx,
          name: idx === 0 ? 'Route A' : idx === 1 ? 'Route B' : `Route ${String.fromCharCode(65 + idx)}`,
          distance: (route.summary.totalDistance / 1000).toFixed(1),
          time: Math.round(route.summary.totalTime / 60),
          hazards,
          hazardCount: hazards.length,
          totalSeverity,
          safetyScore: Math.round(safetyScore),
          isSafest: false,
          coordinates: coords,
        };
      });

      // Mark safest
      if (analyzed.length > 0) {
        const safest = analyzed.reduce((a, b) => a.safetyScore > b.safetyScore ? a : b);
        safest.isSafest = true;
      }

      // Draw colored routes on map — safest = green, dangerous = red/orange
      analyzed.forEach(route => {
        const color = route.isSafest ? '#4edea3' : route.safetyScore >= 50 ? '#5de6ff' : '#ff6b6b';
        const weight = route.isSafest ? 6 : 4;
        const opacity = route.isSafest ? 0.9 : 0.4;
        const latlngs = route.coordinates.map(c => [c.lat, c.lng]);
        const polyline = L.polyline(latlngs, {
          color, weight, opacity,
          dashArray: route.isSafest ? null : '8 8',
        }).addTo(map);
        // Store for cleanup
        if (!routeRef.current._polylines) routeRef.current._polylines = [];
        routeRef.current._polylines.push(polyline);
      });

      onRoutesFound(analyzed);
    });

    control.addTo(map);
    routeRef.current = control;
    routeRef.current._polylines = [];
    return () => {
      if (routeRef.current) {
        if (routeRef.current._polylines) {
          routeRef.current._polylines.forEach(p => map.removeLayer(p));
        }
        try { map.removeControl(routeRef.current); } catch {}
      }
    };
  }, [from, to, avoidPotholes]);

  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng, name: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}` }) });
  return null;
}

function LocationSearch({ placeholder, onSelect, value }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);

  const search = async () => {
    if (!query.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`);
      setResults((await res.json()).map(r => ({ name: r.display_name.split(',').slice(0, 3).join(', '), lat: parseFloat(r.lat), lng: parseFloat(r.lon) })));
    } catch {}
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()} placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] text-white text-sm outline-none placeholder-white/20 border border-white/[0.06] focus:border-[#4edea3]/30" />
        </div>
        <button onClick={search} className="px-4 rounded-xl bg-white/[0.05] text-white/40 text-sm font-medium">Go</button>
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1c1b1d] rounded-xl border border-white/[0.06] overflow-hidden z-50 shadow-xl">
          {results.map((r, i) => (
            <button key={i} onClick={() => { onSelect(r); setQuery(r.name); setResults([]); }}
              className="w-full px-4 py-2.5 text-left text-xs text-white/70 hover:bg-white/[0.05] transition-colors border-b border-white/[0.03] last:border-0">
              <MapPin className="w-3 h-3 inline mr-2 text-[#4edea3]" />{r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavigatePage() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [pickingPoint, setPickingPoint] = useState(null); // 'from' | 'to' | null
  const [avoidPotholes, setAvoidPotholes] = useState(true);
  const [potholes, setPotholes] = useState(DEMO_POTHOLES);
  const [showRoute, setShowRoute] = useState(false);
  const [routeResults, setRouteResults] = useState([]);
  const [showRoutePanel, setShowRoutePanel] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/public/reports/map`).then(r => r.json()).then(d => {
      if (d.reports?.length) {
        setPotholes(prev => [...prev, ...d.reports.map(r => ({
          id: r.id, lat: r.latitude, lng: r.longitude,
          severity: r.severity, type: r.damage_type, status: r.status,
        }))]);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setFrom({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'My Location' }),
      () => setFrom({ lat: 19.033, lng: 73.030, name: 'Navi Mumbai' })
    );
  }, []);

  const handleMapClick = (loc) => {
    if (pickingPoint === 'from') { setFrom(loc); setPickingPoint(null); }
    else if (pickingPoint === 'to') { setTo(loc); setPickingPoint(null); }
  };

  const startNavigation = () => {
    if (from && to) { setShowRoute(true); setShowRoutePanel(true); setRouteResults([]); }
  };

  const unfixed = potholes.filter(p => p.status !== 'fixed');
  const safestRoute = routeResults.find(r => r.isSafest);

  return (
    <div className="h-full flex flex-col relative">
      {/* Top panel */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-3 pb-3 bg-gradient-to-b from-[#131315] via-[#131315]/95 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            <Route className="w-4 h-4 inline mr-1.5 text-[#4edea3]" />Navigate
          </h1>
          <div className="flex items-center gap-2">
            {pickingPoint && (
              <span className="px-2 py-1 rounded-full bg-[#5de6ff]/10 text-[#5de6ff] text-[10px] font-bold animate-pulse">
                Tap map to set {pickingPoint === 'from' ? 'start' : 'destination'}
              </span>
            )}
            <span className="px-2 py-1 rounded-full bg-[#ffa94d]/10 text-[10px] text-[#ffa94d] font-bold">
              {unfixed.length} hazards
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <LocationSearch placeholder="From" value={from?.name} onSelect={setFrom} />
            </div>
            <button onClick={() => setPickingPoint('from')}
              className={`px-3 rounded-xl text-xs font-bold ${pickingPoint === 'from' ? 'bg-[#4edea3] text-black' : 'bg-white/[0.05] text-white/40'}`}>
              📍
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <LocationSearch placeholder="Where to?" onSelect={setTo} />
            </div>
            <button onClick={() => setPickingPoint('to')}
              className={`px-3 rounded-xl text-xs font-bold ${pickingPoint === 'to' ? 'bg-[#5de6ff] text-black' : 'bg-white/[0.05] text-white/40'}`}>
              📍
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setAvoidPotholes(!avoidPotholes)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              avoidPotholes ? 'bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20' : 'bg-white/[0.03] text-white/30'
            }`}>
            <Shield className="w-3.5 h-3.5" /> {avoidPotholes ? 'Avoiding hazards ✓' : 'Avoid hazards'}
          </button>
          <motion.button onClick={startNavigation} disabled={!from || !to}
            className={`px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 ${
              from && to ? 'bg-gradient-to-r from-[#4edea3] to-[#10b981] text-[#002113]' : 'bg-white/[0.04] text-white/20'
            }`} whileTap={from && to ? { scale: 0.97 } : {}}>
            <Navigation className="w-4 h-4" /> Route
          </motion.button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer center={[19.035, 73.035]} zoom={13} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Potholes */}
          {unfixed.map(p => (
            <CircleMarker key={p.id} center={[p.lat, p.lng]}
              radius={p.severity > 70 ? 10 : 7}
              pathOptions={{ color: p.severity > 70 ? '#ff6b6b' : '#ffa94d', fillColor: p.severity > 70 ? '#ff6b6b' : '#ffa94d', fillOpacity: 0.2, weight: 1.5 }}>
              <Popup><div style={{ fontFamily: 'Inter', fontSize: 11, color: '#e5e1e4', background: '#1c1b1d', padding: 8, margin: '-14px -20px' }}>
                <b style={{ color: p.severity > 70 ? '#ff6b6b' : '#ffa94d' }}>⚠ {p.type}</b>
                <div style={{ fontSize: 10, color: '#bbcabf', marginTop: 4 }}>Severity: {p.severity}%</div>
              </div></Popup>
            </CircleMarker>
          ))}

          {/* Danger radius */}
          {unfixed.filter(p => p.severity > 70).map(p => (
            <CircleMarker key={`z-${p.id}`} center={[p.lat, p.lng]} radius={18}
              pathOptions={{ color: '#ff6b6b', fillColor: '#ff6b6b', fillOpacity: 0.04, weight: 0.5, dashArray: '4 4' }} />
          ))}

          {/* From/To markers */}
          {from && <Marker position={[from.lat, from.lng]} icon={L.divIcon({
            html: '<div style="width:16px;height:16px;background:#4edea3;border-radius:50%;border:3px solid #131315;box-shadow:0 0 10px #4edea366"></div>',
            className: '', iconSize: [16, 16], iconAnchor: [8, 8] })} />}
          {to && <Marker position={[to.lat, to.lng]} icon={L.divIcon({
            html: '<div style="width:16px;height:16px;background:#5de6ff;border-radius:50%;border:3px solid #131315;box-shadow:0 0 10px #5de6ff66"></div>',
            className: '', iconSize: [16, 16], iconAnchor: [8, 8] })} />}

          {showRoute && from && to && (
            <RoutingControl from={from} to={to} potholes={potholes} avoidPotholes={avoidPotholes}
              onRoutesFound={(routes) => { setRouteResults(routes); setShowRoutePanel(true); }} />
          )}
        </MapContainer>
      </div>

      {/* Route results panel */}
      <AnimatePresence>
        {showRoutePanel && routeResults.length > 0 && (
          <motion.div
            initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
            transition={{ type: 'spring', damping: 25 }}
            className="absolute bottom-14 left-0 right-0 z-[1000] mx-3"
          >
            <div className="bg-[#1c1b1d]/95 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-xs font-bold text-white">{routeResults.length} route{routeResults.length > 1 ? 's' : ''} found</span>
                <button onClick={() => setShowRoutePanel(false)}><X className="w-4 h-4 text-white/30" /></button>
              </div>

              <div className="px-4 pb-4 space-y-2 max-h-56 overflow-y-auto">
                {routeResults.sort((a, b) => b.safetyScore - a.safetyScore).map((route) => (
                  <div key={route.index}
                    className={`p-3 rounded-xl border transition-all ${
                      route.isSafest ? 'bg-[#4edea3]/[0.06] border-[#4edea3]/20' : 'bg-white/[0.02] border-white/[0.04]'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{route.name}</span>
                        {route.isSafest && (
                          <span className="px-1.5 py-0.5 rounded bg-[#4edea3]/15 text-[#4edea3] text-[8px] font-bold">SAFEST</span>
                        )}
                      </div>
                      <div className={`text-sm font-bold ${
                        route.safetyScore >= 70 ? 'text-[#69db7c]' : route.safetyScore >= 40 ? 'text-[#ffa94d]' : 'text-[#ff6b6b]'
                      }`}>
                        {route.safetyScore}%
                        <span className="text-[8px] text-white/30 ml-1">safe</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-white/40">
                      <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{route.distance} km</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.time} min</span>
                      <span className="flex items-center gap-1" style={{ color: route.hazardCount > 0 ? '#ff6b6b' : '#69db7c' }}>
                        <AlertTriangle className="w-3 h-3" />{route.hazardCount} hazard{route.hazardCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {route.hazards.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {route.hazards.map((h, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-[#ff6b6b]/10 text-[#ff6b6b] text-[8px] font-medium">
                            {h.type} ({h.severity}%)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-14 left-3 right-3 z-[999]" style={{ display: showRoutePanel && routeResults.length > 0 ? 'none' : 'block' }}>
        <div className="bg-[#131315]/90 backdrop-blur-md rounded-xl px-4 py-2 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3 text-[9px] text-white/40">
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff6b6b] mr-1" />High risk</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#ffa94d] mr-1" />Moderate</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#4edea3] mr-1" />Start</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#5de6ff] mr-1" />End</span>
          </div>
          <span className="text-[8px] text-white/15">Tap 📍 to pick on map</span>
        </div>
      </div>
    </div>
  );
}
