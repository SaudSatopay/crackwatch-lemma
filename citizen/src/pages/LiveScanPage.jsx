import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Video, Play, Pause, StopCircle, Upload, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function LiveCamera({ sector = "all" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });
      videoRef.current.srcObject = stream;
      setStreaming(true);
    } catch {
      alert('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStreaming(false);
    setDetecting(false);
  };

  const startDetection = () => {
    setDetecting(true);
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const frameData = canvas.toDataURL('image/jpeg', 0.7);
      try {
        const fd = new FormData();
        fd.append('frame_data', frameData);
        fd.append('confidence', '0.25');
        fd.append('sector', sector);
        const res = await fetch(`${API_URL}/detect/frame`, { method: 'POST', body: fd });
        if (res.ok) setLastResult(await res.json());
      } catch {}
    }, 2500);
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-[#0e0e10] aspect-[4/3]">
        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${streaming ? '' : 'hidden'}`} />
        <canvas ref={canvasRef} className="hidden" />

        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-sm text-white/30">Tap to start camera</p>
          </div>
        )}

        {streaming && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              detecting ? 'bg-[#ff6b6b]/80 text-white' : 'bg-black/60 text-white/70'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${detecting ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
              {detecting ? 'DETECTING' : 'LIVE'}
            </div>
            {lastResult && detecting && (
              <span className="px-2 py-1 rounded-full bg-black/60 text-[10px] text-[#4edea3] font-mono">
                {lastResult.inference_time_ms}ms
              </span>
            )}
          </div>
        )}

        {lastResult?.annotated_image && detecting && (
          <img src={`data:image/jpeg;base64,${lastResult.annotated_image}`} alt="Detection"
            className="absolute inset-0 w-full h-full object-cover opacity-85" />
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!streaming ? (
          <motion.button onClick={startCamera}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#4edea3] to-[#10b981] text-[#002113] font-bold text-sm flex items-center justify-center gap-2"
            whileTap={{ scale: 0.98 }}>
            <Camera className="w-4 h-4" /> Start Camera
          </motion.button>
        ) : (
          <>
            {!detecting ? (
              <motion.button onClick={startDetection}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#4edea3] to-[#10b981] text-[#002113] font-bold text-sm flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}>
                <Play className="w-4 h-4" /> Detect
              </motion.button>
            ) : (
              <motion.button onClick={() => { clearInterval(intervalRef.current); setDetecting(false); }}
                className="flex-1 py-3.5 rounded-xl bg-[#ffa94d] text-black font-bold text-sm flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}>
                <Pause className="w-4 h-4" /> Pause
              </motion.button>
            )}
            <motion.button onClick={stopCamera}
              className="px-5 py-3.5 rounded-xl bg-white/[0.06] text-white/60 text-sm flex items-center gap-2"
              whileTap={{ scale: 0.98 }}>
              <StopCircle className="w-4 h-4" />
            </motion.button>
          </>
        )}
      </div>

      {/* Live results */}
      {lastResult && lastResult.detection_count > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.03] rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Live Results</span>
            <span className="text-xs text-[#4edea3] font-bold">{lastResult.detection_count} found</span>
          </div>
          {lastResult.detections?.slice(0, 4).map((det, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  det.severity_label === 'critical' ? 'bg-[#ff6b6b]' : det.severity_label === 'warning' ? 'bg-[#ffa94d]' : 'bg-white/20'
                }`} />
                <span className="text-xs text-white/70">{det.display_name}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: det.severity_label === 'critical' ? '#ff6b6b' : det.severity_label === 'warning' ? '#ffa94d' : '#69db7c' }}>
                {det.severity?.toFixed(0)}%
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function VideoUpload({ sector = "all" }) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('confidence', '0.25');
    fd.append('frame_interval', '30');
    fd.append('sector', sector);
    try {
      const res = await fetch(`${API_URL}/detect/video`, { method: 'POST', body: fd });
      if (res.ok) { setResult(await res.json()); setCurrentFrame(0); }
    } catch {}
    setProcessing(false);
  };

  if (processing) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-[#4edea3] animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#4edea3] font-medium">Analyzing video frames...</p>
        <p className="text-xs text-white/30 mt-1">This may take a minute</p>
      </div>
    );
  }

  if (result) {
    const frame = result.frame_results[currentFrame];
    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Frames', value: result.video_info.frames_analyzed },
            { label: 'Detections', value: result.total_detections, color: '#ffa94d' },
            { label: 'Time', value: `${(result.processing_time_ms / 1000).toFixed(1)}s` },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 text-center">
              <div className="text-lg font-bold" style={{ color: s.color || '#e5e1e4', fontFamily: 'Space Grotesk' }}>{s.value}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Frame viewer */}
        {frame && (
          <>
            <div className="rounded-xl overflow-hidden relative">
              <img src={`data:image/jpeg;base64,${frame.annotated_image}`} alt="Frame" className="w-full" />
              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/70 text-[10px] text-white font-mono">
                {frame.timestamp_display} · {frame.detection_count} detects
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))} disabled={currentFrame === 0}
                className="p-2 rounded-lg bg-white/[0.06] text-white/40 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white/40">{currentFrame + 1} / {result.frame_results.length}</span>
              <button onClick={() => setCurrentFrame(Math.min(result.frame_results.length - 1, currentFrame + 1))}
                disabled={currentFrame === result.frame_results.length - 1}
                className="p-2 rounded-lg bg-white/[0.06] text-white/40 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Detections */}
            {frame.detections?.length > 0 && (
              <div className="space-y-1.5">
                {frame.detections.map((det, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03]">
                    <span className="text-xs text-white/70">{det.display_name}</span>
                    <span className="text-xs font-bold" style={{ color: det.severity_label === 'critical' ? '#ff6b6b' : '#ffa94d' }}>
                      {(det.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button onClick={() => setResult(null)}
          className="w-full py-3 rounded-xl bg-white/[0.04] text-white/40 text-sm font-medium">
          Upload Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => fileRef.current?.click()}
        className="w-full h-40 rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Video className="w-7 h-7 text-[#4edea3]" />
        </div>
        <p className="text-[13px] font-semibold text-white">Tap to upload video</p>
        <p className="text-[11px] text-white/30">MP4, AVI, MOV</p>
      </button>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}

export default function LiveScanPage() {
  const [sector, setSector] = useState(null);
  const [mode, setMode] = useState('live');

  if (!sector) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="px-5 pt-5 pb-3 text-center">
          <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            Live Scan
          </h1>
          <p className="text-[12px] text-white/40 mt-1">Select what you're scanning</p>
        </div>
        <div className="px-5 pb-8">
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'road', emoji: '🛣️', label: 'Road', desc: 'Potholes & cracks' },
              { id: 'building', emoji: '🏢', label: 'Building', desc: 'Wall cracks' },
              { id: 'pipeline', emoji: '🔧', label: 'Pipeline', desc: 'Leaks & breaks' },
              { id: 'bridge', emoji: '🌉', label: 'Bridge', desc: 'Structural' },
            ].map((s, i) => (
              <motion.button key={s.id} onClick={() => setSector(s.id)}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#4edea3]/30 transition-all text-left"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.97 }}>
                <span className="text-2xl block mb-2">{s.emoji}</span>
                <h4 className="text-sm font-bold text-white">{s.label}</h4>
                <p className="text-[10px] text-white/30 mt-0.5">{s.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            Live Scan
          </h1>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#4edea3]/10 text-[#4edea3] text-[10px] font-bold border border-[#4edea3]/20">
              {sector === 'road' ? '🛣️ Road' : sector === 'building' ? '🏢 Building' : sector === 'pipeline' ? '🔧 Pipeline' : '🌉 Bridge'}
            </span>
            <button onClick={() => setSector(null)} className="text-[10px] text-white/30 underline">Change</button>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 space-y-4">
        <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03]">
          {[
            { id: 'live', label: 'Live Camera', icon: Camera },
            { id: 'video', label: 'Video Upload', icon: Video },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${
                mode === m.id ? 'bg-[#4edea3]/10 text-[#4edea3]' : 'text-white/30'
              }`}>
              <m.icon className="w-4 h-4" /> {m.label}
            </button>
          ))}
        </div>

        {mode === 'live' ? <LiveCamera sector={sector} /> : <VideoUpload sector={sector} />}
      </div>
    </div>
  );
}
