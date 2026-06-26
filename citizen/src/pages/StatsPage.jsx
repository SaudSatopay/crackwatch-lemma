import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle, AlertTriangle, Clock, Shield } from 'lucide-react';

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

// Contractor accountability — ranked worst-first by unresolved repairs.
function WallOfShame() {
  const [list, setList] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/public/wall-of-shame`).then(r => r.json()).then(d => {
      if (d.leaderboard?.length) setList(d.leaderboard);
    }).catch(() => {});
  }, []);

  if (!list.length) return null;

  return (
    <motion.div
      className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.08] shadow-xl shadow-black/40"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">🚧</span>
        <span className="text-[11px] text-white/30 font-bold uppercase tracking-wider">Contractor Wall of Shame</span>
      </div>
      <p className="text-[10px] text-white/25 mt-0.5 mb-4">Ranked worst-first by unresolved repairs</p>

      <div className="space-y-2">
        {list.map((c, i) => {
          const perfColor = c.performance_score >= 70 ? '#69db7c' : c.performance_score >= 40 ? '#ffa94d' : '#ff6b6b';
          const rankColor = i === 0 ? '#ff6b6b' : i === 1 ? '#ffa94d' : '#bbcabf66';
          const flagged = c.status === 'flagged' || c.negligence_score >= 50;
          return (
            <motion.div
              key={c.contractor_id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                flagged ? 'bg-[#ff6b6b]/[0.05] border-[#ff6b6b]/15' : 'bg-white/[0.02] border-white/[0.05]'
              }`}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
            >
              <div className="w-5 text-center shrink-0 text-[13px] font-bold" style={{ color: rankColor, fontFamily: 'Space Grotesk' }}>
                {c.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-white truncate">{c.contractor_name}</p>
                  {flagged && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#ff6b6b]/15 text-[#ff6b6b] font-bold shrink-0 tracking-wide">FLAGGED</span>}
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">{c.area} · {c.unfixed} unresolved of {c.total_reports}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: perfColor, fontFamily: 'Space Grotesk' }}>{c.performance_score}%</p>
                <p className="text-[8px] text-white/25 uppercase tracking-wide">fix rate</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState(DEMO);

  useEffect(() => {
    fetch(`${API_URL}/public/stats`).then(r => r.json()).then(d => {
      if (d.total_reports > 0) setStats(d);
    }).catch(() => {});
  }, []);

  const inProgressTotal = stats.in_progress + (stats.acknowledged || 0);
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

      <div className="px-5 pb-8 space-y-5">
        {/* Performance Score */}
        <motion.div
          className="bg-white/[0.04] rounded-2xl p-5 flex flex-col items-center border border-white/[0.08] shadow-xl shadow-black/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-4">Government Performance</p>
          <Ring score={Math.round(stats.performance_score)} size={108} />
          <p className="text-[12px] text-white/40 mt-4 font-medium">
            {stats.performance_score > 70 ? '✓ Performing above average' : stats.performance_score > 40 ? '⚠ Needs improvement' : '✕ Critical — action needed'}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Reports', value: stats.total_reports, icon: BarChart3, color: '#e5e1e4', delay: 0.1 },
            { label: 'Fixed', value: stats.fixed, icon: CheckCircle, color: '#69db7c', delay: 0.15 },
            { label: 'In Progress', value: inProgressTotal, icon: Clock, color: '#74c0fc', delay: 0.2 },
            { label: 'Not Fixed', value: stats.pending, icon: AlertTriangle, color: '#ff6b6b', delay: 0.25 },
          ].map((s) => (
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
          className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.08] shadow-xl shadow-black/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] text-white/30 font-bold uppercase tracking-wider">Fix Rate</span>
            <span className="text-lg font-bold text-[#69db7c]" style={{ fontFamily: 'Space Grotesk' }}>{fixRate}%</span>
          </div>
          <ProgressBar value={stats.fixed} max={stats.total_reports} color="#69db7c" delay={0.45} />
          <div className="flex justify-between mt-2 text-[10px] text-white/30">
            <span><span className="text-[#69db7c] font-bold">{stats.fixed}</span> fixed</span>
            <span><span className="text-[#74c0fc] font-bold">{inProgressTotal}</span> in progress · <span className="text-[#ff6b6b] font-bold">{stats.pending}</span> not fixed</span>
          </div>
        </motion.div>

        {/* Estimated Cost */}
        <motion.div
          className="bg-gradient-to-br from-[#ffa94d]/[0.08] to-[#ffa94d]/[0.02] rounded-2xl p-5 border border-[#ffa94d]/20 shadow-xl shadow-black/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
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

        {/* Contractor Wall of Shame */}
        <WallOfShame />

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-[10px] text-white/15">Data is public. Government is accountable.</p>
          <p className="text-[10px] text-[#4edea3]/30 font-bold mt-1">CRACKWATCH — Smart Infrastructure for All</p>
        </div>
      </div>
    </div>
  );
}
