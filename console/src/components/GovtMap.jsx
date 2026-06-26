import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Clock, AlertTriangle, Eye, ThumbsUp, MapPin, Hammer, Camera, Send, Loader2, MapPinPlus } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS = {
  submitted:    { color: '#ff6b6b', label: 'Not Fixed',    bg: '#ff6b6b15' },
  acknowledged: { color: '#ffa94d', label: 'Acknowledged', bg: '#ffa94d15' },
  in_progress:  { color: '#74c0fc', label: 'In Progress',  bg: '#74c0fc15' },
  fixed:        { color: '#69db7c', label: 'Fixed',        bg: '#69db7c15' },
};

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 15, { duration: 0.8 }); }, [center]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function GovtMap() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [flyTo, setFlyTo] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [quickReport, setQuickReport] = useState(null);
  const [qSector, setQSector] = useState(null);
  const [qDesc, setQDesc] = useState('');
  const [qFile, setQFile] = useState(null);
  const [qSubmitting, setQSubmitting] = useState(false);
  const qFileRef = useRef(null);

  const fetchReports = () => {
    fetch(`${API_URL}/admin/reports/map`).then(r => r.json()).then(d => {
      if (d.reports) setReports(d.reports);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const counts = {
    all: reports.length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    in_progress: reports.filter(r => r.status === 'in_progress' || r.status === 'acknowledged').length,
    fixed: reports.filter(r => r.status === 'fixed').length,
  };

  const updateStatus = async (reportId, newStatus) => {
    setUpdating(true);
    try {
      const fd = new FormData();
      fd.append('status', newStatus);
      fd.append('note', `Status updated to ${newStatus} by inspector`);
      await fetch(`${API_URL}/admin/reports/${reportId}/status`, { method: 'PATCH', body: fd });
      // Update local state
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      setSelected(prev => prev?.id === reportId ? { ...prev, status: newStatus } : prev);
    } catch (e) {
      console.error('Failed to update status', e);
    }
    setUpdating(false);
  };

  const daysAgo = (ts) => {
    const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
    return d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`;
  };

  return (
    <motion.div className="h-full flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Map */}
      <div className="flex-1 relative">
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-3 pb-2 bg-gradient-to-b from-zinc-950 via-zinc-950/90 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-extrabold text-white tracking-tight">Citizen Reports Map</h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">LIVE · {reports.length} reports</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[
              { key: 'all', label: 'All', count: counts.all },
              { key: 'submitted', label: 'Unfixed', count: counts.submitted, color: '#ff6b6b' },
              { key: 'in_progress', label: 'In Progress', count: counts.in_progress, color: '#74c0fc' },
              { key: 'fixed', label: 'Fixed', count: counts.fixed, color: '#69db7c' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  filter === f.key ? 'bg-zinc-800 text-white' : 'bg-zinc-900/50 text-zinc-500'
                }`}>
                {f.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />}
                {f.count}
              </button>
            ))}
          </div>
        </div>

        <MapContainer center={[19.035, 73.035]} zoom={13} className="h-full w-full" zoomControl={false}>
          <FlyTo center={flyTo} />
          <MapClickHandler onMapClick={(loc) => { setSelected(null); setQuickReport(loc); setQSector(null); setQDesc(''); setQFile(null); }} />
          {quickReport && (
            <Marker position={[quickReport.lat, quickReport.lng]}
              icon={L.divIcon({
                html: '<div style="width:18px;height:18px;background:#5de6ff;border-radius:50%;border:3px solid #131315;box-shadow:0 0 12px #5de6ff88"></div>',
                className: '', iconSize: [18, 18], iconAnchor: [9, 9],
              })} />
          )}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={35}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: `<div style="background:#4edea3;color:#002113;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2px solid #131315;box-shadow:0 0 10px rgba(78,222,163,0.4)">${count}</div>`,
                className: '',
                iconSize: [32, 32],
              });
            }}
          >
            {filtered.map(r => {
              const cfg = STATUS[r.status] || STATUS.submitted;
              const isSelected = selected?.id === r.id;
              const size = isSelected ? 16 : 12;
              const icon = L.divIcon({
                html: `<div style="width:${size}px;height:${size}px;background:${cfg.color};border-radius:50%;border:2px solid ${isSelected ? '#fff' : '#131315'};box-shadow:0 0 8px ${cfg.color}55"></div>`,
                className: '',
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
              });
              return (
                <Marker key={r.id} position={[r.latitude, r.longitude]} icon={icon}
                  eventHandlers={{ click: () => { setSelected(r); setFlyTo([r.latitude, r.longitude]); } }}
                />
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>

        {reports.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
            <div className="text-center">
              <MapPin className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 font-medium">No citizen reports yet</p>
              <p className="text-xs text-zinc-600">Reports from the public app will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick report from map click */}
      <AnimatePresence>
        {quickReport && !selected && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="absolute bottom-4 left-4 z-[1000] w-80"
          >
            <div className="bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-800/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPinPlus className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Quick Report</span>
                </div>
                <button onClick={() => setQuickReport(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">📍 {quickReport.lat.toFixed(5)}, {quickReport.lng.toFixed(5)}</p>

              {!qSector ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'road', emoji: '🛣️', label: 'Road' },
                    { id: 'building', emoji: '🏢', label: 'Building' },
                    { id: 'pipeline', emoji: '🔧', label: 'Pipeline' },
                    { id: 'bridge', emoji: '🌉', label: 'Bridge' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setQSector(s.id)}
                      className="py-2 rounded-lg bg-zinc-800/50 text-center hover:bg-emerald-500/10 transition-colors">
                      <span className="text-base block">{s.emoji}</span>
                      <span className="text-[8px] text-zinc-500">{s.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                      {qSector === 'road' ? '🛣️' : qSector === 'building' ? '🏢' : qSector === 'pipeline' ? '🔧' : '🌉'} {qSector}
                    </span>
                    <button onClick={() => setQSector(null)} className="text-[10px] text-zinc-500 underline">change</button>
                  </div>
                  <button onClick={() => qFileRef.current?.click()}
                    className="w-full py-2 rounded-lg bg-zinc-800/50 text-xs text-zinc-400 flex items-center justify-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> {qFile ? '✓ Photo ready' : 'Add photo'}
                  </button>
                  <input ref={qFileRef} type="file" accept="image/*" className="hidden" onChange={e => setQFile(e.target.files?.[0])} />
                  <input type="text" value={qDesc} onChange={e => setQDesc(e.target.value)} placeholder="Description"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800/50 text-xs text-white outline-none placeholder-zinc-600" />
                  <motion.button
                    onClick={async () => {
                      if (!qFile) return;
                      setQSubmitting(true);
                      const fd = new FormData();
                      fd.append('file', qFile);
                      fd.append('latitude', quickReport.lat);
                      fd.append('longitude', quickReport.lng);
                      fd.append('sector', qSector);
                      fd.append('description', qDesc || 'Admin quick report');
                      fd.append('reporter_name', 'Inspector');
                      fd.append('location_name', 'Admin map report');
                      try {
                        await fetch(`${API_URL}/public/report`, { method: 'POST', body: fd });
                        fetchReports();
                        setQuickReport(null);
                      } catch {}
                      setQSubmitting(false);
                    }}
                    disabled={!qFile || qSubmitting}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 ${
                      qFile ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-600'
                    }`}
                    whileTap={qFile ? { scale: 0.97 } : {}}>
                    {qSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Submit</>}
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right panel — selected report detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ x: 350, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 350, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-[360px] bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800/30 overflow-y-auto"
          >
            {/* Close */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800/20">
              <span className="text-xs text-zinc-500 font-mono">{selected.id}</span>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo */}
            {selected.annotated_image && (
              <div className="h-44 bg-zinc-950">
                <img src={`data:image/jpeg;base64,${selected.annotated_image}`} alt="Damage" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Type + Status */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-extrabold text-white">{selected.damage_type}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: STATUS[selected.status]?.bg, color: STATUS[selected.status]?.color }}>
                    {STATUS[selected.status]?.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{selected.location_name} · {daysAgo(selected.timestamp)}</p>
              </div>

              {/* Reporter + Description */}
              <div className="bg-zinc-800/30 rounded-xl p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Citizen Report</p>
                <p className="text-xs text-zinc-400">{selected.description || 'No description provided'}</p>
                <p className="text-[10px] text-zinc-600 mt-1.5">By {selected.reporter} · 👍 {selected.upvotes} upvotes</p>
              </div>

              {/* Severity + Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/30 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Severity</p>
                  <p className="text-2xl font-bold" style={{ color: selected.severity > 70 ? '#ff6b6b' : selected.severity > 40 ? '#ffa94d' : '#69db7c' }}>
                    {selected.severity?.toFixed(0)}%
                  </p>
                </div>
                <div className="bg-zinc-800/30 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Est. Cost</p>
                  <p className="text-xl font-bold text-amber-400">₹{selected.cost_estimated?.toLocaleString('en-IN') || '—'}</p>
                </div>
              </div>

              {/* Repair method */}
              {selected.repair_method && (
                <div className="bg-zinc-800/30 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Recommended Repair</p>
                  <p className="text-xs text-zinc-300 font-medium">{selected.repair_method}</p>
                </div>
              )}

              {/* ADMIN: Status update controls */}
              <div className="border-t border-zinc-800/30 pt-4">
                <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider font-bold mb-3">🏛️ Admin Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { status: 'acknowledged', label: 'Acknowledge', icon: Eye, color: '#ffa94d' },
                    { status: 'in_progress', label: 'In Progress', icon: Clock, color: '#74c0fc' },
                    { status: 'fixed', label: 'Mark Fixed', icon: CheckCircle, color: '#69db7c' },
                    { status: 'submitted', label: 'Reopen', icon: AlertTriangle, color: '#ff6b6b' },
                  ].map(action => (
                    <motion.button
                      key={action.status}
                      onClick={() => updateStatus(selected.id, action.status)}
                      disabled={updating || selected.status === action.status}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        selected.status === action.status
                          ? 'bg-zinc-700/30 text-zinc-600 cursor-default'
                          : 'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300'
                      }`}
                      style={selected.status === action.status ? { borderColor: action.color, borderWidth: 1 } : {}}
                      whileTap={selected.status !== action.status ? { scale: 0.97 } : {}}
                    >
                      <action.icon className="w-3.5 h-3.5" style={{ color: action.color }} />
                      {action.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Status history */}
              {selected.status_history?.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Status History</p>
                  <div className="space-y-1.5">
                    {selected.status_history.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS[h.status]?.color || '#666' }} />
                        <span className="text-zinc-400 font-medium">{h.status}</span>
                        <span className="text-zinc-600 ml-auto">{new Date(h.time).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
