import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, X, Navigation, AlertTriangle, Clock, CheckCircle, ChevronUp, Camera, Send, Loader2, MapPinPlus } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS = {
  submitted:    { color: '#ff6b6b', bg: '#ff6b6b15', label: 'Not Fixed',    icon: AlertTriangle, dot: '🔴' },
  acknowledged: { color: '#ffa94d', bg: '#ffa94d15', label: 'Acknowledged', icon: Clock,         dot: '🟠' },
  in_progress:  { color: '#74c0fc', bg: '#74c0fc15', label: 'In Progress',  icon: Clock,         dot: '🔵' },
  fixed:        { color: '#69db7c', bg: '#69db7c15', label: 'Fixed',        icon: CheckCircle,   dot: '🟢' },
};

function severityColor(s) {
  if (s >= 70) return '#ff6b6b';
  if (s >= 40) return '#ffa94d';
  return '#69db7c';
}

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 15, { duration: 0.8 }); }, [center]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [flyTo, setFlyTo] = useState(null);
  const [upvoted, setUpvoted] = useState(new Set());
  const [quickReport, setQuickReport] = useState(null); // {lat, lng}
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickSector, setQuickSector] = useState(null);
  const [quickDesc, setQuickDesc] = useState('');
  const [quickFile, setQuickFile] = useState(null);
  const quickFileRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/public/reports/map/detail`).then(r => r.json()).then(d => {
      if (d.reports?.length) setReports(d.reports);
    }).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const counts = {
    all: reports.length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    in_progress: reports.filter(r => r.status === 'in_progress' || r.status === 'acknowledged').length,
    fixed: reports.filter(r => r.status === 'fixed').length,
  };

  // Load upvoted IDs from localStorage
  useEffect(() => {
    const savedIds = localStorage.getItem('crackwatch_upvotes');
    if (savedIds) setUpvoted(new Set(JSON.parse(savedIds)));
  }, []);

  // Apply saved upvote values whenever reports change
  useEffect(() => {
    const savedVotes = JSON.parse(localStorage.getItem('crackwatch_upvote_values') || '{}');
    if (Object.keys(savedVotes).length > 0) {
      setReports(prev => prev.map(r => savedVotes[r.id] !== undefined ? { ...r, upvotes: savedVotes[r.id] } : r));
    }
  }, [reports.length]); // re-apply when report count changes (API loaded)

  const handleUpvote = async (report) => {
    if (upvoted.has(report.id)) return;
    const newCount = report.upvotes + 1;
    // Update UI
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, upvotes: newCount } : r));
    setSelected(prev => prev?.id === report.id ? { ...prev, upvotes: newCount } : prev);
    // Save upvoted IDs
    const newUpvoted = new Set([...upvoted, report.id]);
    setUpvoted(newUpvoted);
    localStorage.setItem('crackwatch_upvotes', JSON.stringify([...newUpvoted]));
    // Save exact upvote VALUE (not increment — prevents double counting)
    const savedVotes = JSON.parse(localStorage.getItem('crackwatch_upvote_values') || '{}');
    savedVotes[report.id] = newCount;
    localStorage.setItem('crackwatch_upvote_values', JSON.stringify(savedVotes));
    // Try API
    try { await fetch(`${API_URL}/public/reports/${report.id}/upvote`, { method: 'POST' }); } catch {}
  };

  const daysAgo = (ts) => {
    const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
    return d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`;
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-3 pb-2 bg-gradient-to-b from-[#131315] via-[#131315]/90 to-transparent">
        <div className="relative flex items-center mb-2.5">
          <h1 className="text-lg font-bold text-white tracking-tight w-full text-center" style={{ fontFamily: 'Space Grotesk' }}>
            CRACK<span className="text-[#4edea3]">WATCH</span>
          </h1>
          <div className="absolute right-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
            <span className="text-[10px] text-[#4edea3] font-bold">LIVE</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'submitted', label: 'Unfixed', count: counts.submitted, color: '#ff6b6b' },
            { key: 'in_progress', label: 'In Progress', count: counts.in_progress, color: '#74c0fc' },
            { key: 'fixed', label: 'Fixed', count: counts.fixed, color: '#69db7c' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                filter === f.key ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-white/40'
              }`}
            >
              {f.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />}
              {f.count} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer center={[19.035, 73.035]} zoom={13} className="h-full w-full" zoomControl={false}>
          <FlyTo center={flyTo} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapClickHandler onMapClick={(loc) => { setSelected(null); setQuickReport(loc); setQuickSector(null); setQuickDesc(''); setQuickFile(null); }} />

          {/* Quick report pin */}
          {quickReport && (
            <Marker
              position={[quickReport.lat, quickReport.lng]}
              icon={L.divIcon({
                html: '<div style="width:20px;height:20px;background:#5de6ff;border-radius:50%;border:3px solid #131315;box-shadow:0 0 15px #5de6ff88;animation:pulse 1.5s infinite"></div>',
                className: '', iconSize: [20, 20], iconAnchor: [10, 10],
              })}
            />
          )}

          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: `<div style="background:#4edea3;color:#002113;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;border:2px solid #131315;box-shadow:0 0 12px rgba(78,222,163,0.4)">${count}</div>`,
                className: '',
                iconSize: [36, 36],
              });
            }}
          >
            {filtered.map(r => {
              const cfg = STATUS[r.status] || STATUS.submitted;
              const isSelected = selected?.id === r.id;
              const size = isSelected ? 18 : r.severity > 70 ? 14 : r.severity > 40 ? 12 : 10;
              const icon = L.divIcon({
                html: `<div style="width:${size}px;height:${size}px;background:${cfg.color};border-radius:50%;border:2px solid ${isSelected ? '#fff' : '#131315'};box-shadow:0 0 ${isSelected ? '12' : '6'}px ${cfg.color}66;transition:all 0.2s"></div>`,
                className: '',
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
              });
              return (
                <Marker
                  key={r.id}
                  position={[r.latitude, r.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      setSelected(r);
                      setFlyTo([r.latitude, r.longitude]);
                    },
                  }}
                />
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Selected report bottom sheet */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-14 left-0 right-0 z-[1000] mx-3"
          >
            <div className="bg-[#1c1b1d]/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/50">
              {/* Handle + Close */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="w-8 h-1 rounded-full bg-white/10 mx-auto" />
                <button onClick={() => setSelected(null)} className="absolute right-3 top-3 p-1 rounded-full bg-white/5">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              <div className="px-4 pb-4">
                {/* Photo */}
                {selected.annotated_image && (
                  <div className="rounded-xl overflow-hidden mb-3 h-36 bg-[#0e0e10]">
                    <img
                      src={`data:image/jpeg;base64,${selected.annotated_image}`}
                      alt="Damage"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Type + Status */}
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>{selected.damage_type}</h3>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: STATUS[selected.status]?.bg, color: STATUS[selected.status]?.color }}>
                    {STATUS[selected.status]?.dot} {STATUS[selected.status]?.label}
                  </span>
                </div>

                {/* Location + time */}
                <p className="text-[12px] text-white/50 mb-3">{selected.location_name} · {daysAgo(selected.timestamp)}</p>

                {/* Description */}
                {selected.description && (
                  <p className="text-[12px] text-white/60 mb-3 leading-relaxed">{selected.description}</p>
                )}

                {/* Cost estimate */}
                {selected.cost_estimated > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#ffa94d]/[0.06] mb-3">
                    <span className="text-[11px] text-white/40">Est. Repair Cost</span>
                    <span className="text-sm font-bold text-[#ffa94d]">₹{selected.cost_estimated?.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {/* Severity bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Severity</span>
                    <span className="text-sm font-bold" style={{ color: severityColor(selected.severity) }}>{selected.severity}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${severityColor(selected.severity)}88, ${severityColor(selected.severity)})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${selected.severity}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                    <div className="text-lg font-bold text-white">{selected.defect_count}</div>
                    <div className="text-[9px] text-white/30 font-medium uppercase">Defects</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                    <div className="text-lg font-bold text-[#4edea3]">{selected.upvotes}</div>
                    <div className="text-[9px] text-white/30 font-medium uppercase">Upvotes</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                    <div className="text-lg font-bold text-white/70">{selected.reporter?.split(' ')[0]}</div>
                    <div className="text-[9px] text-white/30 font-medium uppercase">Reporter</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => handleUpvote(selected)}
                    disabled={upvoted.has(selected.id)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      upvoted.has(selected.id)
                        ? 'bg-[#4edea3]/10 text-[#4edea3]'
                        : 'bg-gradient-to-r from-[#4edea3] to-[#10b981] text-[#002113]'
                    }`}
                    whileTap={{ scale: 0.97 }}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    {upvoted.has(selected.id) ? 'Upvoted!' : 'Upvote This'}
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`, '_blank');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-white/70 font-medium text-sm flex items-center gap-1.5"
                    whileTap={{ scale: 0.97 }}
                  >
                    <Navigation className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick report from map tap */}
      <AnimatePresence>
        {quickReport && !selected && (
          <motion.div
            initial={{ y: 400, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-14 left-0 right-0 z-[1000] mx-3"
          >
            <div className="bg-[#1c1b1d]/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <MapPinPlus className="w-4 h-4 text-[#5de6ff]" />
                  <span className="text-xs font-bold text-white">Quick Report</span>
                </div>
                <button onClick={() => setQuickReport(null)} className="p-1 rounded-full bg-white/5">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              <div className="px-4 pb-4 space-y-3">
                <p className="text-[11px] text-white/40 font-mono">
                  📍 {quickReport.lat.toFixed(5)}, {quickReport.lng.toFixed(5)}
                </p>

                {/* Sector pick */}
                {!quickSector ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'road', emoji: '🛣️', label: 'Road' },
                      { id: 'building', emoji: '🏢', label: 'Building' },
                      { id: 'pipeline', emoji: '🔧', label: 'Pipeline' },
                      { id: 'bridge', emoji: '🌉', label: 'Bridge' },
                    ].map(s => (
                      <button key={s.id} onClick={() => setQuickSector(s.id)}
                        className="py-2 rounded-lg bg-white/[0.04] text-center hover:bg-[#4edea3]/10 transition-colors">
                        <span className="text-lg block">{s.emoji}</span>
                        <span className="text-[9px] text-white/40">{s.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-[#4edea3]/10 text-[#4edea3] text-[10px] font-bold">
                        {quickSector === 'road' ? '🛣️ Road' : quickSector === 'building' ? '🏢 Building' : quickSector === 'pipeline' ? '🔧 Pipeline' : '🌉 Bridge'}
                      </span>
                      <button onClick={() => setQuickSector(null)} className="text-[10px] text-white/30 underline">change</button>
                    </div>

                    {/* Photo */}
                    <div className="flex gap-2">
                      <button onClick={() => quickFileRef.current?.click()}
                        className="flex-1 py-2.5 rounded-lg bg-white/[0.04] text-xs text-white/50 flex items-center justify-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        {quickFile ? '✓ Photo ready' : 'Add photo'}
                      </button>
                      <input ref={quickFileRef} type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={e => setQuickFile(e.target.files?.[0])} />
                    </div>

                    {/* Description */}
                    <input type="text" value={quickDesc} onChange={e => setQuickDesc(e.target.value)}
                      placeholder="Brief description (optional)"
                      className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] text-xs text-white outline-none placeholder-white/15" />

                    {/* Submit */}
                    <motion.button
                      onClick={async () => {
                        if (!quickFile) { alert('Please add a photo'); return; }
                        setQuickSubmitting(true);
                        const fd = new FormData();
                        fd.append('file', quickFile);
                        fd.append('latitude', quickReport.lat);
                        fd.append('longitude', quickReport.lng);
                        fd.append('sector', quickSector);
                        fd.append('description', quickDesc || `Quick report at ${quickReport.lat.toFixed(4)}, ${quickReport.lng.toFixed(4)}`);
                        fd.append('reporter_name', 'Citizen');
                        fd.append('location_name', 'Map tap report');
                        try {
                          const res = await fetch(`${API_URL}/public/report`, { method: 'POST', body: fd });
                          const data = await res.json();
                          if (data.id) {
                            // Add to local reports
                            setReports(prev => [...prev, {
                              id: data.id, latitude: quickReport.lat, longitude: quickReport.lng,
                              damage_type: 'Reported', severity: 50, status: 'submitted',
                              upvotes: 1, defect_count: data.detections_count || 1,
                              reporter: 'You', description: quickDesc, timestamp: new Date().toISOString(),
                            }]);
                            setQuickReport(null);
                          }
                        } catch { alert('Server not reachable'); }
                        setQuickSubmitting(false);
                      }}
                      disabled={!quickFile || quickSubmitting}
                      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                        quickFile && !quickSubmitting
                          ? 'bg-gradient-to-r from-[#4edea3] to-[#10b981] text-[#002113]'
                          : 'bg-white/[0.04] text-white/20'
                      }`}
                      whileTap={quickFile ? { scale: 0.97 } : {}}
                    >
                      {quickSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Report</>}
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
