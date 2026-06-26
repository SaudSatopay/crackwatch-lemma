import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle, AlertTriangle, Clock, TrendingUp, Shield, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEMO = {
  total_reports: 847,
  fixed: 523,
  in_progress: 89,
  acknowledged: 67,
  pending: 168,
  performance_score: 80.1,
  total_estimated_cost: 4250000,
  total_estimated_cost_formatted: "₹42,50,000",
};

function AnimNum({ value, delay = 0 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const anim = (now) => {
        const p = Math.min((now - start) / 1200, 1);
        setN(Math.floor(num * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return <>{n.toLocaleString('en-IN')}</>;
}

function Ring({ score, size = 120 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score > 70 ? '#69db7c' : score > 40 ? '#ffa94d' : '#ff6b6b';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold"
          style={{ color, fontFamily: 'Space Grotesk' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}%
        </motion.span>
        <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mt-0.5">Score</span>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color, delay = 0 }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay }}
      />
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState(DEMO);

  useEffect(() => {
    fetch(`${API_URL}/public/stats`).then(r => r.json()).then(d => {
      if (d.total_reports > 0) setStats(d);
    }).catch(() => {});
  }, []);

  const fixRate = stats.total_reports > 0 ? ((stats.fixed / stats.total_reports) * 100).toFixed(1) : 0;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 text-center">
        <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
          Government Dashboard
        </h1>
        <p className="text-[12px] text-white/40 mt-1">Public accountability & transparency</p>
      </div>

      <div className="px-5 pb-8 space-y-10">
        {/* Performance Score */}
        <motion.div
          className="bg-white/[0.04] rounded-2xl p-5 flex flex-col items-center border border-white/[0.08] shadow-xl shadow-black/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-4">Government Performance</p>
          <Ring score={stats.performance_score} size={110} />
          <p className="text-[12px] text-white/40 mt-4 font-medium">
            {stats.performance_score > 70 ? '✓ Performing above average' : stats.performance_score > 40 ? '⚠ Needs improvement' : '✕ Critical — action needed'}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Reports', value: stats.total_reports, icon: BarChart3, color: '#e5e1e4', delay: 0.15 },
            { label: 'Fixed', value: stats.fixed, icon: CheckCircle, color: '#69db7c', delay: 0.2 },
            { label: 'Not Fixed', value: stats.pending, icon: AlertTriangle, color: '#ff6b6b', delay: 0.25 },
            { label: 'In Progress', value: stats.in_progress + (stats.acknowledged || 0), icon: Clock, color: '#74c0fc', delay: 0.3 },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08] shadow-lg shadow-black/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: s.delay }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}12` }}>
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{s.label}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight" style={{ color: s.color, fontFamily: 'Space Grotesk' }}>
                <AnimNum value={s.value} delay={s.delay * 1000} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Fix Rate */}
        <motion.div
          className="bg-white/[0.04] rounded-xl p-5 border border-white/[0.08] shadow-xl shadow-black/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] text-white/30 font-bold uppercase tracking-wider">Fix Rate</span>
            <span className="text-lg font-bold text-[#69db7c]" style={{ fontFamily: 'Space Grotesk' }}>{fixRate}%</span>
          </div>
          <ProgressBar value={stats.fixed} max={stats.total_reports} color="#69db7c" delay={0.5} />
          <div className="flex justify-between mt-2 text-[10px] text-white/20">
            <span>{stats.fixed} fixed</span>
            <span>{stats.pending} remaining</span>
          </div>
        </motion.div>

        {/* Breakdown bars */}
        <motion.div
          className="bg-white/[0.04] rounded-2xl p-5 space-y-4 border border-white/[0.08] shadow-xl shadow-black/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-[11px] text-white/30 font-bold uppercase tracking-wider">Status Breakdown</p>

          {[
            { label: 'Fixed', value: stats.fixed, color: '#69db7c' },
            { label: 'In Progress', value: stats.in_progress + (stats.acknowledged || 0), color: '#74c0fc' },
            { label: 'Not Fixed', value: stats.pending, color: '#ff6b6b' },
          ].map((item, i) => (
            <div key={item.label}>
              <div className="flex justify-between mb-1.5">
                <span className="text-[12px] text-white/60 font-medium">{item.label}</span>
                <span className="text-[12px] font-bold" style={{ color: item.color }}>{item.value}</span>
              </div>
              <ProgressBar value={item.value} max={stats.total_reports} color={item.color} delay={0.5 + i * 0.1} />
            </div>
          ))}
        </motion.div>

        {/* Cost */}
        <motion.div
          className="bg-gradient-to-br from-[#ffa94d]/[0.08] to-[#ffa94d]/[0.02] rounded-xl p-5 border border-[#ffa94d]/20 shadow-xl shadow-black/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#ffa94d]" />
            <span className="text-[11px] text-white/30 font-bold uppercase tracking-wider">Estimated Repair Cost</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            {stats.total_estimated_cost_formatted || `₹${stats.total_estimated_cost?.toLocaleString('en-IN')}`}
          </div>
          <p className="text-[11px] text-white/25 mt-1.5">Total cost to fix all reported damages</p>
        </motion.div>

        {/* Footer */}
        <div className="text-center pt-4 pb-6">
          <p className="text-[10px] text-white/15">Data is public. Government is accountable.</p>
          <p className="text-[10px] text-[#4edea3]/30 font-bold mt-1">CRACKWATCH — Smart Infrastructure for All</p>
        </div>
      </div>
    </div>
  );
}
