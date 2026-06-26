import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Camera, Upload, Play, Pause, StopCircle,
  Loader2, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function FrameViewer({ frames, currentIndex, setCurrentIndex }) {
  const frame = frames[currentIndex];
  if (!frame) return null;

  return (
    <div className="space-y-3">
      {/* Frame image */}
      <div className="rounded-xl overflow-hidden relative bg-zinc-900">
        <img
          src={`data:image/jpeg;base64,${frame.annotated_image}`}
          alt={`Frame ${frame.frame_number}`}
          className="w-full h-auto"
        />
        <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/70 backdrop-blur text-xs text-white font-mono">
          {frame.timestamp_display} · Frame {frame.frame_number} · {frame.detection_count} detects
        </div>
      </div>

      {/* Frame navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg bg-zinc-800 text-zinc-400 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-zinc-500">
          Frame {currentIndex + 1} of {frames.length}
        </span>
        <button
          onClick={() => setCurrentIndex(Math.min(frames.length - 1, currentIndex + 1))}
          disabled={currentIndex === frames.length - 1}
          className="p-2 rounded-lg bg-zinc-800 text-zinc-400 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Frame detections */}
      {frame.detections?.length > 0 && (
        <div className="space-y-1.5">
          {frame.detections.map((det, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  det.severity_label === 'critical' ? 'bg-red-500' : det.severity_label === 'warning' ? 'bg-amber-500' : 'bg-yellow-500'
                }`} />
                <span className="text-zinc-300 font-medium">{det.display_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-zinc-500">{(det.confidence * 100).toFixed(0)}%</span>
                {det.cost && <span className="text-emerald-400 font-medium">₹{det.cost.cost_estimated?.toLocaleString('en-IN')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveFeed({ sector = "all" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [fps, setFps] = useState(0);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      videoRef.current.srcObject = stream;
      setStreaming(true);
    } catch (err) {
      alert("Camera access denied. Please allow camera permissions.");
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
    let frameCount = 0;
    const startTime = Date.now();

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const frameData = canvas.toDataURL("image/jpeg", 0.7);

      try {
        const fd = new FormData();
        fd.append("frame_data", frameData);
        fd.append("confidence", "0.25");
        fd.append("sector", sector);

        const res = await fetch(`${API_URL}/detect/frame`, { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          setLastResult(data);
          frameCount++;
          const elapsed = (Date.now() - startTime) / 1000;
          setFps(Math.round(frameCount / elapsed * 10) / 10);
        }
      } catch {}
    }, 2000); // Detect every 2 seconds
  };

  const stopDetection = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDetecting(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="space-y-4">
      {/* Camera view */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${streaming ? '' : 'hidden'}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500">Camera not active</p>
          </div>
        )}

        {/* Overlay info */}
        {streaming && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              detecting ? 'bg-red-500/80 text-white' : 'bg-zinc-800/80 text-zinc-300'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${detecting ? 'bg-white animate-pulse' : 'bg-zinc-500'}`} />
              {detecting ? 'DETECTING' : 'LIVE'}
            </div>
            {detecting && fps > 0 && (
              <span className="px-2 py-1 rounded-full bg-black/60 text-[10px] text-emerald-400 font-mono">
                {fps} det/s
              </span>
            )}
          </div>
        )}

        {/* Detection overlay */}
        {lastResult?.annotated_image && detecting && (
          <img
            src={`data:image/jpeg;base64,${lastResult.annotated_image}`}
            alt="Detection"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!streaming ? (
          <motion.button onClick={startCamera}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm flex items-center justify-center gap-2"
            whileTap={{ scale: 0.98 }}>
            <Camera className="w-4 h-4" /> Start Camera
          </motion.button>
        ) : (
          <>
            {!detecting ? (
              <motion.button onClick={startDetection}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}>
                <Play className="w-4 h-4" /> Start Detection
              </motion.button>
            ) : (
              <motion.button onClick={stopDetection}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}>
                <Pause className="w-4 h-4" /> Pause Detection
              </motion.button>
            )}
            <motion.button onClick={stopCamera}
              className="px-5 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm flex items-center gap-2"
              whileTap={{ scale: 0.98 }}>
              <StopCircle className="w-4 h-4" /> Stop
            </motion.button>
          </>
        )}
      </div>

      {/* Live results */}
      {lastResult && lastResult.detection_count > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 font-semibold">Live Detection — {lastResult.inference_time_ms}ms</span>
            <span className="text-xs text-emerald-400 font-bold">{lastResult.detection_count} found</span>
          </div>
          {lastResult.detections?.slice(0, 3).map((det, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs">
              <span className="text-zinc-300">{det.display_name}</span>
              <span className={`font-bold ${det.severity_label === 'critical' ? 'text-red-400' : det.severity_label === 'warning' ? 'text-amber-400' : 'text-zinc-500'}`}>
                {det.severity?.toFixed(0)}%
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

const SECTORS = [
  { id: "road", emoji: "🛣️", label: "Road & Highway", desc: "Potholes, cracks, surface damage", models: "YOLOv8s-RDD + CV" },
  { id: "building", emoji: "🏢", label: "Building", desc: "Wall cracks, concrete, spalling", models: "CrackSeg + CV" },
  { id: "pipeline", emoji: "🔧", label: "Pipeline", desc: "Leaks, corrosion, pipe breaks", models: "OpenCV" },
  { id: "bridge", emoji: "🌉", label: "Bridge & Flyover", desc: "Structural + road damage", models: "All models" },
];

export default function VideoScan() {
  const [sector, setSector] = useState(null);
  const [mode, setMode] = useState("video");
  const [videoFile, setVideoFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const fileRef = useRef(null);

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setProcessing(true);
    setProgress("Uploading video...");
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("confidence", "0.25");
    fd.append("frame_interval", "30");
    fd.append("sector", sector || "all");

    try {
      setProgress("Extracting frames & running AI detection...");
      const res = await fetch(`${API_URL}/detect/video`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();
      setResult(data);
      setCurrentFrame(0);
      setProgress("");
    } catch (err) {
      setProgress(`Error: ${err.message}`);
    }
    setProcessing(false);
  };

  // Sector selection screen
  if (!sector) {
    return (
      <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div>
          <h3 className="text-lg font-extrabold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            What are you scanning?
          </h3>
          <p className="text-sm text-zinc-500 mb-5">Select infrastructure type for video/live detection</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {SECTORS.map((s, i) => (
              <motion.button
                key={s.id}
                onClick={() => setSector(s.id)}
                className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl block mb-2">{s.emoji}</span>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{s.label}</h4>
                <p className="text-[10px] text-zinc-500 mt-1">{s.desc}</p>
                <p className="text-[9px] text-zinc-600 mt-2 font-mono">{s.models}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Sector badge + change */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
            {SECTORS.find(s => s.id === sector)?.emoji} {SECTORS.find(s => s.id === sector)?.label}
          </span>
          <span className="text-xs text-zinc-600">sector</span>
        </div>
        <button onClick={() => { setSector(null); setResult(null); }}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline">Change</button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
        {[
          { id: "video", label: "Video Upload", icon: Video },
          { id: "live", label: "Live Camera", icon: Camera },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === m.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'
            }`}>
            <m.icon className="w-4 h-4" /> {m.label}
          </button>
        ))}
      </div>

      {mode === "video" ? (
        <div className="space-y-4">
          {/* Upload zone */}
          {!result && (
            <div
              className="border-2 border-dashed border-zinc-700/50 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Video className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-white mb-1">Upload Video</p>
              <p className="text-xs text-zinc-500">MP4, AVI, MOV — AI analyzes every second</p>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            </div>
          )}

          {/* Processing */}
          {processing && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-emerald-400 font-medium">{progress}</p>
              <p className="text-xs text-zinc-600 mt-1">This may take a minute for longer videos</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Video info */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Duration", value: `${result.video_info.duration_sec}s` },
                  { label: "Frames", value: result.video_info.frames_analyzed },
                  { label: "Detections", value: result.total_detections, color: "text-amber-400" },
                  { label: "Time", value: `${(result.processing_time_ms / 1000).toFixed(1)}s` },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/30">
                    <div className={`text-lg font-bold ${s.color || 'text-white'}`}>{s.value}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Frame viewer */}
              <FrameViewer
                frames={result.frame_results}
                currentIndex={currentFrame}
                setCurrentIndex={setCurrentFrame}
              />

              {/* Timeline scrubber */}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Frame Timeline</p>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {result.frame_results.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentFrame(i)}
                      className={`shrink-0 w-10 h-10 rounded-lg text-[9px] font-bold flex items-center justify-center transition-all ${
                        i === currentFrame
                          ? 'bg-emerald-500 text-black'
                          : f.detection_count > 0
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-zinc-800/50 text-zinc-600'
                      }`}
                    >
                      {f.detection_count > 0 ? f.detection_count : '·'}
                    </button>
                  ))}
                </div>
              </div>

              {/* New video button */}
              <button onClick={() => { setResult(null); setVideoFile(null); }}
                className="w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors">
                Upload Another Video
              </button>
            </div>
          )}
        </div>
      ) : (
        <LiveFeed sector={sector} />
      )}
    </motion.div>
  );
}
