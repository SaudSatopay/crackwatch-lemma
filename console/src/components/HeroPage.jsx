import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  ScanLine,
  Shield,
  Zap,
  Eye,
  Brain,
  Layers,
  ArrowRight,
  Sparkles,
  Activity,
  AlertTriangle,
  ChevronDown,
  CheckCircle,
  Cpu,
  Database,
  Wifi,
} from "lucide-react";

/* ─── Floating Orbs ─── */
function FloatingOrbs() {
  const orbs = [
    { size: 300, x: "10%", y: "20%", color: "emerald", delay: 0 },
    { size: 200, x: "70%", y: "10%", color: "cyan", delay: 1 },
    { size: 250, x: "80%", y: "60%", color: "violet", delay: 2 },
    { size: 180, x: "20%", y: "70%", color: "emerald", delay: 0.5 },
    { size: 150, x: "50%", y: "80%", color: "cyan", delay: 1.5 },
    { size: 120, x: "40%", y: "15%", color: "amber", delay: 3 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${
            orb.color === "emerald"
              ? "bg-emerald-500/8"
              : orb.color === "cyan"
              ? "bg-cyan-500/8"
              : orb.color === "violet"
              ? "bg-violet-500/6"
              : "bg-amber-500/5"
          }`}
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 15, -30, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: 12 + i * 2,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Particle Field ─── */
function ParticleField() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            y: [0, -40],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Grid Background ─── */
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

/* ─── Floating 3D Cards ─── */
function FloatingCard({ children, className, delay = 0, x, y, rotate = 0 }) {
  return (
    <motion.div
      className={`absolute ${className}`}
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.5, rotate: rotate - 10 }}
      animate={{
        opacity: 1,
        scale: 1,
        rotate: rotate,
        y: [0, -15, 0],
      }}
      transition={{
        opacity: { delay, duration: 0.8 },
        scale: { delay, duration: 0.8, type: "spring" },
        rotate: { delay, duration: 0.8 },
        y: { delay: delay + 0.8, duration: 4, repeat: Infinity, ease: "easeInOut" },
      }}
      whileHover={{ scale: 1.1, rotate: 0, zIndex: 50 }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Scan Visualization ─── */
function ScanVisualization() {
  return (
    <motion.div
      className="relative w-64 h-44 rounded-xl border border-emerald-500/20 bg-zinc-900/60 backdrop-blur-xl overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
    >
      {/* Scan content */}
      <svg className="w-full h-full" viewBox="0 0 260 180">
        {/* Grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`g${i}`} x1={i * 52} y1="0" x2={i * 52} y2="180" stroke="#10b981" strokeWidth="0.3" opacity="0.2" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 45} x2="260" y2={i * 45} stroke="#10b981" strokeWidth="0.3" opacity="0.2" />
        ))}
        {/* Cracks */}
        <motion.path
          d="M40 30 L80 60 L100 90 L95 120"
          stroke="#ef4444"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 2, duration: 2 }}
        />
        <motion.path
          d="M150 50 L180 70 L200 85"
          stroke="#f59e0b"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 2.5, duration: 1.5 }}
        />
        {/* Detection boxes */}
        <motion.rect
          x="25" y="15" width="90" height="120" rx="2"
          stroke="#ef4444" strokeWidth="1.5" fill="none" strokeDasharray="4"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 1] }}
          transition={{ delay: 3, duration: 2, repeat: Infinity }}
        />
        <motion.rect
          x="135" y="35" width="80" height="65" rx="2"
          stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeDasharray="4"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 1] }}
          transition={{ delay: 3.3, duration: 2, repeat: Infinity }}
        />
      </svg>

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-x-0 -top-4 h-8 bg-gradient-to-b from-transparent via-emerald-400/5 to-transparent" />
      </motion.div>

      {/* Label */}
      <motion.div
        className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-500/90 text-[8px] font-bold text-white uppercase tracking-wider"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 3 }}
      >
        2 Cracks Found
      </motion.div>
    </motion.div>
  );
}

/* ─── Glowing Ring ─── */
function GlowRing() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <motion.div
        className="w-[600px] h-[600px] rounded-full border border-emerald-500/10"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-8 rounded-full border border-cyan-500/10"
        animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.1, 0.2], rotate: [0, 180, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-16 rounded-full border border-violet-500/10"
        animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.05, 0.15], rotate: [360, 180, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─── Stats Ticker ─── */
function StatsTicker() {
  const stats = [
    "12,847 scans completed",
    "99.2% detection accuracy",
    "3.2s average scan time",
    "47 countries",
    "Critical crack detected — Bridge A-14",
    "System operational — all nodes active",
    "New model v4.7 deployed",
    "89 cracks detected today",
  ];

  return (
    <motion.div
      className="absolute bottom-24 left-0 right-0 overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2 }}
    >
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {[...stats, ...stats].map((stat, i) => (
          <span
            key={i}
            className="text-xs text-zinc-600 flex items-center gap-2"
          >
            <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
            {stat}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ─── Mouse Follower ─── */
function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return pos;
}

/* ─── MAIN HERO ─── */
export default function HeroPage({ onEnter }) {
  const [hovered, setHovered] = useState(false);
  const mouse = useMousePosition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 300);
  }, []);

  return (
    <div className="relative h-screen bg-zinc-950 overflow-hidden flex flex-col">
      {/* Background layers */}
      <GridBackground />
      <FloatingOrbs />
      <ParticleField />
      <GlowRing />

      {/* Mouse-following spotlight */}
      <motion.div
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)",
          left: mouse.x - 250,
          top: mouse.y - 250,
        }}
        animate={{ left: mouse.x - 250, top: mouse.y - 250 }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
      />

      {/* Nav */}
      <motion.nav
        className="relative z-30 flex items-center justify-between px-8 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <ScanLine className="w-5 h-5 text-emerald-400" />
            <motion.div
              className="absolute inset-0 rounded-xl bg-emerald-400/20"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          <span className="text-base font-extrabold text-white tracking-wide">
            CRACK<span className="text-emerald-400">WATCH</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          {["Features", "Pricing", "Docs", "Blog"].map((item, i) => (
            <motion.a
              key={item}
              href="#"
              className="text-xs text-zinc-500 hover:text-white transition-colors"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -2 }}
            >
              {item}
            </motion.a>
          ))}
          <motion.button
            onClick={onEnter}
            className="px-4 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign In
          </motion.button>
        </div>
      </motion.nav>

      {/* Main hero content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-8">
        <div className="max-w-6xl w-full flex items-center justify-between gap-16">
          {/* Left — Text */}
          <div className="flex-1 max-w-xl">
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[11px] text-emerald-400 font-medium">
                v4.7 — Next-gen crack detection is here
              </span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-[1.05] tracking-tighter mb-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              Detect structural{" "}
              <span className="relative">
                <span className="relative z-10 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  cracks
                </span>
                <motion.span
                  className="absolute -inset-1 bg-emerald-500/10 rounded-lg -z-0"
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </span>{" "}
              before they become{" "}
              <span className="bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent">
                disasters
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-base text-zinc-400 leading-relaxed mb-6 max-w-lg font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              AI-powered command center that detects infrastructure damage,
              estimates repair costs, and tells authorities exactly what to fix.
              From roads to bridges — smart maintenance starts here.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex items-center gap-4 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <motion.button
                onClick={onEnter}
                className="group relative px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm flex items-center gap-2 overflow-hidden"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400"
                  initial={{ x: "-100%" }}
                  animate={hovered ? { x: "0%" } : { x: "-100%" }}
                  transition={{ duration: 0.3 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  Launch Dashboard
                  <motion.span
                    animate={{ x: hovered ? 4 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </span>
              </motion.button>

              <motion.button
                onClick={onEnter}
                className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium text-sm hover:border-zinc-500 hover:text-white transition-all flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Eye className="w-4 h-4" />
                Watch Demo
              </motion.button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="flex items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              {[
                { icon: Shield, text: "Enterprise-grade" },
                { icon: Zap, text: "Real-time analysis" },
                { icon: Brain, text: "AI-powered" },
              ].map((item, i) => (
                <motion.div
                  key={item.text}
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3 + i * 0.15 }}
                >
                  <item.icon className="w-3.5 h-3.5 text-emerald-400/60" />
                  <span className="text-[11px] text-zinc-500">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right — Floating elements composition */}
          <div className="flex-1 relative h-[500px] hidden lg:block">
            {/* Main scan card */}
            <FloatingCard x="10%" y="15%" delay={1.2} rotate={-3}>
              <ScanVisualization />
            </FloatingCard>

            {/* Stats card */}
            <FloatingCard x="55%" y="5%" delay={1.5} rotate={5}>
              <div className="w-48 p-4 rounded-xl bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/50 shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-white">Live Stats</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500">Accuracy</span>
                    <span className="text-[11px] font-bold text-emerald-400">99.2%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "99.2%" }}
                      transition={{ delay: 2, duration: 1.5 }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500">Speed</span>
                    <span className="text-[11px] font-bold text-cyan-400">3.2s</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "85%" }}
                      transition={{ delay: 2.2, duration: 1.5 }}
                    />
                  </div>
                </div>
              </div>
            </FloatingCard>

            {/* Alert card */}
            <FloatingCard x="60%" y="50%" delay={1.8} rotate={-4}>
              <motion.div
                className="w-52 p-3 rounded-xl bg-red-500/5 backdrop-blur-xl border border-red-500/20 shadow-2xl"
                animate={{ boxShadow: ["0 0 0px rgba(239,68,68,0)", "0 0 20px rgba(239,68,68,0.1)", "0 0 0px rgba(239,68,68,0)"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-[11px] font-bold text-red-400">Critical Alert</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Structural crack detected on Bridge A-14. Width: 2.4mm.
                  Immediate inspection required.
                </p>
                <div className="mt-2 flex gap-2">
                  <div className="px-2 py-0.5 rounded bg-red-500/10 text-[9px] text-red-400 font-semibold">
                    CRITICAL
                  </div>
                  <div className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] text-zinc-400">
                    2 min ago
                  </div>
                </div>
              </motion.div>
            </FloatingCard>

            {/* Mini floating icons */}
            <FloatingCard x="5%" y="65%" delay={2} rotate={10}>
              <motion.div
                className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center backdrop-blur-xl"
                animate={{ rotate: [10, -5, 10] }}
                transition={{ duration: 6, repeat: Infinity }}
              >
                <Cpu className="w-5 h-5 text-violet-400" />
              </motion.div>
            </FloatingCard>

            <FloatingCard x="40%" y="75%" delay={2.2} rotate={-8}>
              <motion.div
                className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center backdrop-blur-xl"
                animate={{ rotate: [-8, 5, -8] }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                <Database className="w-5 h-5 text-cyan-400" />
              </motion.div>
            </FloatingCard>

            <FloatingCard x="75%" y="35%" delay={2.4} rotate={6}>
              <motion.div
                className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center backdrop-blur-xl"
                animate={{ rotate: [6, -3, 6] }}
                transition={{ duration: 7, repeat: Infinity }}
              >
                <Wifi className="w-4 h-4 text-amber-400" />
              </motion.div>
            </FloatingCard>

            {/* Connection lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <motion.line
                x1="35" y1="35" x2="65" y2="15"
                stroke="url(#lineGrad1)" strokeWidth="0.15"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 2.5, duration: 1.5 }}
              />
              <motion.line
                x1="65" y1="25" x2="70" y2="55"
                stroke="url(#lineGrad2)" strokeWidth="0.15"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 2.8, duration: 1.5 }}
              />
              <defs>
                <linearGradient id="lineGrad1">
                  <stop offset="0%" stopColor="rgba(16,185,129,0.3)" />
                  <stop offset="100%" stopColor="rgba(6,182,212,0.3)" />
                </linearGradient>
                <linearGradient id="lineGrad2">
                  <stop offset="0%" stopColor="rgba(6,182,212,0.3)" />
                  <stop offset="100%" stopColor="rgba(239,68,68,0.3)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Stats ticker */}
      <StatsTicker />

      {/* Bottom bar */}
      <motion.div
        className="relative z-20 flex items-center justify-center pb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <motion.div
          className="flex flex-col items-center gap-1 cursor-pointer"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          onClick={onEnter}
        >
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
            Tap to enter
          </span>
          <ChevronDown className="w-4 h-4 text-zinc-600" />
        </motion.div>
      </motion.div>
    </div>
  );
}
