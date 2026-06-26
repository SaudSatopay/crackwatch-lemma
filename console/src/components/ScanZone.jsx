import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Maximize2,
  ZoomIn,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ScanLine({ isScanning }) {
  if (!isScanning) return null;
  return (
    <motion.div
      className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent z-20 pointer-events-none"
      initial={{ top: "0%" }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
    >
      <div className="absolute inset-x-0 -top-8 h-16 bg-gradient-to-b from-transparent via-emerald-400/10 to-transparent" />
    </motion.div>
  );
}

function DetectionOverlay({ results }) {
  const boxes = [
    { x: "10%", y: "8%", w: "35%", h: "30%", severity: "critical" },
    { x: "35%", y: "40%", w: "30%", h: "20%", severity: "moderate" },
    { x: "60%", y: "65%", w: "25%", h: "15%", severity: "minor" },
  ];

  return (
    <>
      {results.map((result, i) => (
        <motion.div
          key={result.id}
          className={`absolute border-2 rounded-sm z-10 ${
            result.severity === "critical"
              ? "border-red-500/80"
              : result.severity === "moderate"
              ? "border-amber-500/80"
              : "border-yellow-500/80"
          }`}
          style={{
            left: boxes[i]?.x,
            top: boxes[i]?.y,
            width: boxes[i]?.w,
            height: boxes[i]?.h,
          }}
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.3, duration: 0.4 }}
        >
          {/* Corner markers */}
          <div
            className={`absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 ${
              result.severity === "critical"
                ? "border-red-400"
                : result.severity === "moderate"
                ? "border-amber-400"
                : "border-yellow-400"
            }`}
          />
          <div
            className={`absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 ${
              result.severity === "critical"
                ? "border-red-400"
                : result.severity === "moderate"
                ? "border-amber-400"
                : "border-yellow-400"
            }`}
          />
          <div
            className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 ${
              result.severity === "critical"
                ? "border-red-400"
                : result.severity === "moderate"
                ? "border-amber-400"
                : "border-yellow-400"
            }`}
          />
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 ${
              result.severity === "critical"
                ? "border-red-400"
                : result.severity === "moderate"
                ? "border-amber-400"
                : "border-yellow-400"
            }`}
          />

          {/* Label */}
          <motion.div
            className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
              result.severity === "critical"
                ? "bg-red-500 text-white"
                : result.severity === "moderate"
                ? "bg-amber-500 text-black"
                : "bg-yellow-500 text-black"
            }`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.3 + 0.2 }}
          >
            {result.severity} — {result.confidence}%
          </motion.div>

          {/* Pulse effect */}
          <motion.div
            className={`absolute inset-0 ${
              result.severity === "critical"
                ? "bg-red-500/5"
                : result.severity === "moderate"
                ? "bg-amber-500/5"
                : "bg-yellow-500/5"
            }`}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      ))}
    </>
  );
}

export default function ScanZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [sector, setSector] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [scanPhase, setScanPhase] = useState("");
  const [inferenceTime, setInferenceTime] = useState(null);
  const [apiStats, setApiStats] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files[0] || e.target?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setUploadedImage(url);
      setUploadedFile(file);
      setResults(null);
      setAnnotatedImage(null);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setUploadedImage(url);
      setUploadedFile(file);
      setResults(null);
      setAnnotatedImage(null);
    }
  }, []);

  const startScan = async () => {
    if (!uploadedFile && !uploadedImage) return;

    setIsScanning(true);
    setScanProgress(0);
    setResults(null);
    setAnnotatedImage(null);

    const phases = [
      "Initializing YOLOv8 neural network...",
      "Preprocessing image...",
      "Running inference pipeline...",
      "Analyzing crack patterns...",
      "Computing severity scores...",
      "Generating report...",
    ];

    // Animate progress while API runs
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 2, 90);
      setScanProgress(progress);
      const phaseIndex = Math.floor((progress / 100) * phases.length);
      setScanPhase(phases[Math.min(phaseIndex, phases.length - 1)]);
    }, 100);

    try {
      const formData = new FormData();

      if (uploadedFile) {
        formData.append('file', uploadedFile);
      } else {
        // Demo image — convert SVG data URL to a blob
        const resp = await fetch(uploadedImage);
        const blob = await resp.blob();
        formData.append('file', blob, 'demo.png');
      }
      formData.append('confidence', '0.25');
      formData.append('sector', sector);

      const res = await fetch(`${API_URL}/detect`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      setScanProgress(100);
      setScanPhase("Analysis complete!");
      setInferenceTime(data.inference_time_ms);
      setApiStats(data.stats);

      // Pass through ALL API data — no stripping
      const mappedResults = data.detections.map((det, i) => ({
        id: i + 1,
        severity: det.severity_label === 'critical' ? 'critical' : det.severity_label === 'warning' ? 'moderate' : 'minor',
        type: det.display_name || det.class_name,
        confidence: +(det.confidence * 100).toFixed(1),
        location: `Region ${i + 1}`,
        bbox: det.bbox,
        severityScore: det.severity,
        area_ratio: det.area_ratio,
        // Cost data from backend
        cost: det.cost,
        // Priority data
        priority_rank: det.priority_rank,
        urgency_score: det.urgency_score,
        // Explainable AI
        explanation: det.explanation,
        // Repair info
        category: det.category,
        risk: det.risk,
        repair: det.repair,
        // Prediction (if available)
        prediction: data.predictions?.[i] || null,
      }));

      // Set annotated image from API
      if (data.annotated_image) {
        setAnnotatedImage(`data:image/jpeg;base64,${data.annotated_image}`);
      }

      setTimeout(() => {
        setIsScanning(false);
        setResults(mappedResults.length > 0 ? mappedResults : null);
        if (mappedResults.length === 0) {
          setScanPhase("No damage detected — structure appears healthy");
        }
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      console.error('Detection error:', err);
      setScanProgress(100);
      setScanPhase(`Error: ${err.message}. Is the backend running?`);
      setTimeout(() => setIsScanning(false), 2000);
    }
  };

  const resetScan = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setAnnotatedImage(null);
    setResults(null);
    setIsScanning(false);
    setScanProgress(0);
    setInferenceTime(null);
    setApiStats(null);
  };

  // Load a demo image on mount
  const loadDemo = () => {
    setUploadedImage(
      "data:image/svg+xml," +
        encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect fill="#1a1a2e" width="800" height="600"/>
        <rect fill="#16213e" x="20" y="20" width="760" height="560" rx="4"/>
        <!-- Concrete texture -->
        <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="800" height="600" filter="url(#noise)" opacity="0.08"/>
        <!-- Cracks -->
        <path d="M80 50 L150 120 L180 180 L200 260 L190 300" stroke="#ef4444" stroke-width="3" fill="none" opacity="0.8"/>
        <path d="M150 120 L220 140 L280 130" stroke="#ef4444" stroke-width="2" fill="none" opacity="0.6"/>
        <path d="M320 250 L380 280 L420 310 L440 350" stroke="#f59e0b" stroke-width="2" fill="none" opacity="0.7"/>
        <path d="M380 280 L400 260 L450 270" stroke="#f59e0b" stroke-width="1.5" fill="none" opacity="0.5"/>
        <path d="M520 420 L560 440 L600 445 L640 460" stroke="#eab308" stroke-width="1.5" fill="none" opacity="0.6"/>
        <!-- Grid overlay -->
        <line x1="0" y1="200" x2="800" y2="200" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>
        <line x1="0" y1="400" x2="800" y2="400" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>
        <line x1="266" y1="0" x2="266" y2="600" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>
        <line x1="533" y1="0" x2="533" y2="600" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>
      </svg>
    `)
    );
    setResults(null);
  };

  return (
    <div className="space-y-4">
      {/* Sector selector — must pick before scanning */}
      {!sector ? (
        <div>
          <h3 className="text-lg font-extrabold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            What are you inspecting?
          </h3>
          <p className="text-sm text-zinc-500 mb-5">Select infrastructure type for targeted AI detection</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { id: "road", emoji: "🛣️", label: "Road & Highway", desc: "Potholes, cracks, surface damage", models: "YOLOv8s-RDD + CV" },
              { id: "building", emoji: "🏢", label: "Building", desc: "Wall cracks, concrete, spalling", models: "CrackSeg + CV" },
              { id: "pipeline", emoji: "🔧", label: "Pipeline", desc: "Leaks, corrosion, pipe breaks", models: "OpenCV" },
              { id: "bridge", emoji: "🌉", label: "Bridge & Flyover", desc: "Structural + road damage", models: "All models" },
            ].map((s, i) => (
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
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{s.desc}</p>
                <p className="text-[9px] text-zinc-600 mt-2 font-mono">{s.models}</p>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
      <>
      {/* Selected sector badge + change button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
            {sector === 'road' ? '🛣️ Road' : sector === 'building' ? '🏢 Building' : sector === 'pipeline' ? '🔧 Pipeline' : sector === 'bridge' ? '🌉 Bridge' : '🔍 Full Scan'}
          </span>
          <span className="text-xs text-zinc-600">sector selected</span>
        </div>
        <button onClick={() => { setSector(null); setResults(null); setUploadedImage(null); setUploadedFile(null); setAnnotatedImage(null); }}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline">Change</button>
      </div>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Main scan area */}
      <div className="lg:col-span-3">
        <motion.div
          className={`relative rounded-xl overflow-hidden border-2 border-dashed transition-colors ${
            isDragging
              ? "border-emerald-500 bg-emerald-500/5"
              : uploadedImage
              ? "border-zinc-700 bg-zinc-900"
              : "border-zinc-700/50 bg-zinc-900/50"
          }`}
          style={{ minHeight: 400 }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {!uploadedImage ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
              <motion.div
                className="w-20 h-20 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-6"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Upload className="w-8 h-8 text-zinc-500" />
              </motion.div>
              <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
                Drop image to analyze
              </h3>
              <p className="text-sm text-zinc-400 mb-6 text-center max-w-md font-medium leading-relaxed">
                Upload a photo of roads, bridges, or pipelines to detect cracks,
                potholes, and structural damage using AI
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ImageIcon className="w-4 h-4" />
                  Browse Files
                </motion.button>
                <motion.button
                  onClick={loadDemo}
                  className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2 border border-zinc-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Camera className="w-4 h-4" />
                  Load Demo
                </motion.button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="relative min-h-[400px]">
              <img
                src={annotatedImage || uploadedImage}
                alt="Scan target"
                className="w-full h-full object-cover min-h-[400px]"
              />

              {/* Scan line animation */}
              <ScanLine isScanning={isScanning} />

              {/* Detection boxes */}
              {results && <DetectionOverlay results={results} />}

              {/* Grid overlay during scan */}
              {isScanning && (
                <motion.div
                  className="absolute inset-0 pointer-events-none z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                >
                  <svg className="w-full h-full">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line
                        key={`h${i}`}
                        x1="0"
                        y1={`${(i + 1) * 11.1}%`}
                        x2="100%"
                        y2={`${(i + 1) * 11.1}%`}
                        stroke="#10b981"
                        strokeWidth="0.5"
                        strokeDasharray="4"
                        opacity="0.3"
                      />
                    ))}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line
                        key={`v${i}`}
                        x1={`${(i + 1) * 11.1}%`}
                        y1="0"
                        x2={`${(i + 1) * 11.1}%`}
                        y2="100%"
                        stroke="#10b981"
                        strokeWidth="0.5"
                        strokeDasharray="4"
                        opacity="0.3"
                      />
                    ))}
                  </svg>
                </motion.div>
              )}

              {/* Controls overlay */}
              <div className="absolute top-3 right-3 flex gap-2 z-30">
                <motion.button
                  onClick={resetScan}
                  className="p-2 rounded-lg bg-black/60 backdrop-blur-sm text-zinc-300 hover:text-white hover:bg-black/80 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Scan progress bar */}
              {isScanning && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="text-xs text-emerald-400 font-mono">
                      {scanPhase}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-zinc-500">
                      Processing
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {scanProgress}%
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Scan button */}
              {!isScanning && !results && (
                <motion.div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <motion.button
                    onClick={startScan}
                    className="px-8 py-4 rounded-xl bg-emerald-500 text-black font-extrabold text-base flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(16,185,129,0.4)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ScanLine className="w-5 h-5" />
                    Start AI Scan
                  </motion.button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Results panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4">
          <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Detection Results
          </h3>

          <AnimatePresence mode="wait">
            {!uploadedImage ? (
              <motion.div
                key="empty"
                className="text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
                  <ZoomIn className="w-5 h-5 text-zinc-600" />
                </div>
                <p className="text-xs text-zinc-600">
                  Upload an image to begin analysis
                </p>
              </motion.div>
            ) : isScanning ? (
              <motion.div
                key="scanning"
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-2 w-16 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : results ? (
              <motion.div
                key="results"
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {results.map((result, i) => (
                  <motion.div
                    key={result.id}
                    className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30 hover:border-zinc-600/50 transition-colors cursor-pointer group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          result.severity === "critical" ? "bg-red-500" :
                          result.severity === "moderate" ? "bg-amber-500" : "bg-yellow-500"
                        }`} />
                        <span className="text-xs font-semibold text-white">{result.type}</span>
                        {result.priority_rank && (
                          <span className="text-[9px] text-zinc-500">#{result.priority_rank}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        result.severity === "critical" ? "bg-red-500/10 text-red-400" :
                        result.severity === "moderate" ? "bg-amber-500/10 text-amber-400" :
                        "bg-yellow-500/10 text-yellow-400"
                      }`}>{result.severity}</span>
                    </div>

                    {/* Key metrics */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                      <div>
                        <span className="text-zinc-500">Confidence</span>
                        <p className="text-zinc-300 font-mono">{result.confidence}%</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Severity Score</span>
                        <p className="text-zinc-300 font-mono">{result.severityScore}%</p>
                      </div>
                    </div>

                    {/* Cost estimation */}
                    {result.cost && (
                      <div className="mt-2 p-2 rounded-md bg-zinc-900/50 border border-zinc-700/20">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Repair Cost</span>
                          <span className="text-xs font-bold text-emerald-400">
                            ₹{result.cost.cost_estimated?.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <div>
                            <span className="text-zinc-600">Method</span>
                            <p className="text-zinc-400">{result.cost.repair_method}</p>
                          </div>
                          <div>
                            <span className="text-zinc-600">Time</span>
                            <p className="text-zinc-400">{result.cost.repair_time}</p>
                          </div>
                        </div>
                        {/* Before vs After */}
                        <div className="flex gap-2 mt-1.5 text-[9px]">
                          <span className="text-red-400/70">If ignored: ₹{result.cost.cost_if_ignored?.toLocaleString('en-IN')}</span>
                          <span className="text-cyan-400/70">Save: ₹{result.cost.savings_if_fixed_now?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}

                    {/* Explainable AI */}
                    {result.explanation && (
                      <details className="mt-2 group/explain">
                        <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300 flex items-center gap-1">
                          <span>ⓘ Why this severity?</span>
                        </summary>
                        <div className="mt-1.5 p-2 rounded-md bg-zinc-900/30 text-[10px]">
                          <p className="text-zinc-400 leading-relaxed mb-1">{result.explanation.explanation}</p>
                          <p className="text-emerald-400/70 italic">{result.explanation.recommendation}</p>
                        </div>
                      </details>
                    )}

                    {/* Prediction */}
                    {result.prediction && (
                      <div className="mt-2 p-2 rounded-md bg-violet-500/[0.05] border border-violet-500/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider">🔮 Prediction</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            result.prediction.urgency === 'IMMEDIATE' ? 'bg-red-500/10 text-red-400' :
                            result.prediction.urgency === 'HIGH' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>{result.prediction.urgency}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400">{result.prediction.risk_description}</p>
                        <div className="flex gap-3 mt-1.5 text-[9px]">
                          <span className="text-red-400/70">Pothole in: {result.prediction.prediction?.pothole_eta}</span>
                          <span className="text-amber-400/70">+{result.prediction.prediction?.worsen_per_week}%/week</span>
                        </div>
                      </div>
                    )}

                    {/* Confidence bar */}
                    <div className="mt-2 w-full h-1 rounded-full bg-zinc-700 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          result.severity === "critical" ? "bg-red-500" :
                          result.severity === "moderate" ? "bg-amber-500" : "bg-yellow-500"
                        }`}
                        initial={{ width: "0%" }}
                        animate={{ width: `${result.confidence}%` }}
                        transition={{ delay: i * 0.15 + 0.3, duration: 0.8 }}
                      />
                    </div>
                  </motion.div>
                ))}

                {/* Summary with real cost data */}
                <motion.div
                  className={`mt-4 p-3 rounded-lg border ${
                    apiStats?.critical_count > 0
                      ? 'bg-red-500/5 border-red-500/10'
                      : apiStats?.warning_count > 0
                      ? 'bg-amber-500/5 border-amber-500/10'
                      : 'bg-emerald-500/5 border-emerald-500/10'
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {apiStats?.critical_count > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className={`text-xs font-semibold ${
                      apiStats?.critical_count > 0 ? 'text-red-400' : apiStats?.warning_count > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {apiStats?.critical_count > 0 ? 'Immediate Action Required' : apiStats?.warning_count > 0 ? 'Scheduled Maintenance Recommended' : 'Structure Healthy'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {results.length} defect{results.length !== 1 ? 's' : ''} detected.
                    {apiStats ? ` Structural integrity: ${apiStats.structural_integrity}%.` : ''}
                    {inferenceTime ? ` Analyzed in ${inferenceTime}ms.` : ''}
                  </p>
                  {/* Total cost summary from real detections */}
                  {results.some(r => r.cost) && (
                    <div className="mt-2 pt-2 border-t border-zinc-700/30 grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <span className="text-zinc-500">Total Cost</span>
                        <p className="text-white font-bold">
                          ₹{results.reduce((sum, r) => sum + (r.cost?.cost_estimated || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-500">If Ignored</span>
                        <p className="text-red-400 font-bold">
                          ₹{results.reduce((sum, r) => sum + (r.cost?.cost_if_ignored || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-500">You Save</span>
                        <p className="text-cyan-400 font-bold">
                          ₹{results.reduce((sum, r) => sum + (r.cost?.savings_if_fixed_now || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                className="text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <CheckCircle className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">
                  Image loaded. Click "Start AI Scan" to analyze.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
    )}
    </div>
  );
}

function Activity(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}

function ScanLine2(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}
