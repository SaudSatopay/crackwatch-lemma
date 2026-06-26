import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Trophy, AlertTriangle, TrendingUp, TrendingDown, MapPin,
  Clock, DollarSign, Shield, BarChart3, Flame, Award, Minus,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function WallOfShame({ data }) {
  if (!data?.leaderboard?.length) return <p className="text-sm text-zinc-500 text-center py-8">No contractor data yet. Submit reports to populate.</p>;

  return (
    <div className="space-y-3">
      {data.leaderboard.map((entry, i) => (
        <motion.div key={entry.contractor_id}
          className={`p-4 rounded-xl border transition-all ${
            i === 0 ? 'bg-red-500/[0.04] border-red-500/20' :
            i === data.leaderboard.length - 1 ? 'bg-emerald-500/[0.04] border-emerald-500/20' :
            'bg-white/[0.02] border-white/[0.04]'
          }`}
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                i === 0 ? 'bg-red-500/15 text-red-400' :
                i === data.leaderboard.length - 1 ? 'bg-emerald-500/15 text-emerald-400' :
                'bg-zinc-800 text-zinc-400'
              }`}>#{entry.rank}</div>
              <div>
                <h4 className="text-sm font-bold text-white">{entry.contractor_name}</h4>
                <p className="text-[10px] text-zinc-500">{entry.area}, {entry.city}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${entry.performance_score >= 50 ? 'text-emerald-400' : entry.performance_score >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                {entry.performance_score}%
              </div>
              <p className="text-[9px] text-zinc-500">performance</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div><span className="text-zinc-500">Reports</span><p className="text-white font-bold">{entry.total_reports}</p></div>
            <div><span className="text-zinc-500">Fixed</span><p className="text-emerald-400 font-bold">{entry.fixed}</p></div>
            <div><span className="text-zinc-500">Unfixed</span><p className="text-red-400 font-bold">{entry.unfixed}</p></div>
            <div><span className="text-zinc-500">Negligence</span><p className="text-amber-400 font-bold">{entry.negligence_score}</p></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PriorityQueue({ data }) {
  if (!data?.length) return <p className="text-sm text-zinc-500 text-center py-8">No unfixed issues to prioritize.</p>;

  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((p, i) => (
        <motion.div key={p.report_id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                i === 0 ? 'bg-red-500/15 text-red-400' : i < 3 ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-500'
              }`}>{p.rank}</span>
              <span className="text-xs font-semibold text-white">{p.damage_type}</span>
            </div>
            <span className="text-lg font-bold text-amber-400">{p.priority_score}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span><MapPin className="w-3 h-3 inline" /> {p.location}</span>
            <span><Clock className="w-3 h-3 inline" /> {p.days_unresolved}d</span>
            {p.estimated_cost > 0 && <span><DollarSign className="w-3 h-3 inline" /> ₹{p.estimated_cost.toLocaleString('en-IN')}</span>}
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">Formula: {p.severity} sev × {p.days_unresolved}d × {p.upvotes} votes</p>
        </motion.div>
      ))}
    </div>
  );
}

function CityHealth({ data }) {
  if (!data?.length) return <p className="text-sm text-zinc-500 text-center py-8">No city data yet.</p>;

  return (
    <div className="space-y-3">
      {data.map((city, i) => (
        <motion.div key={city.city} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-white">{city.city}</h4>
              <div className="flex items-center gap-1 mt-0.5">
                {city.trend === 'improving' ? <TrendingUp className="w-3 h-3 text-emerald-400" /> :
                 city.trend === 'worsening' ? <TrendingDown className="w-3 h-3 text-red-400" /> :
                 <Minus className="w-3 h-3 text-zinc-500" />}
                <span className={`text-[10px] font-semibold ${
                  city.trend === 'improving' ? 'text-emerald-400' : city.trend === 'worsening' ? 'text-red-400' : 'text-zinc-500'
                }`}>{city.trend}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                city.health_score >= 70 ? 'text-emerald-400' : city.health_score >= 40 ? 'text-amber-400' : 'text-red-400'
              }`} style={{ fontFamily: 'Space Grotesk' }}>{city.health_score}</div>
              <p className="text-[9px] text-zinc-500">/100</p>
            </div>
          </div>
          {/* Health bar */}
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
            <motion.div className="h-full rounded-full" initial={{ width: 0 }}
              animate={{ width: `${city.health_score}%` }} transition={{ duration: 1, delay: i * 0.1 }}
              style={{ background: city.health_score >= 70 ? '#4edea3' : city.health_score >= 40 ? '#ffa94d' : '#ff6b6b' }} />
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div><span className="text-zinc-500">Reports</span><p className="text-white font-bold">{city.total_reports}</p></div>
            <div><span className="text-zinc-500">Fixed</span><p className="text-emerald-400 font-bold">{city.fixed}</p></div>
            <div><span className="text-zinc-500">Unfixed</span><p className="text-red-400 font-bold">{city.unfixed}</p></div>
            <div><span className="text-zinc-500">Fix Rate</span><p className="text-cyan-400 font-bold">{city.fix_rate}%</p></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AreaForecast({ data }) {
  if (!data?.zones?.length) return <p className="text-sm text-zinc-500 text-center py-8">No prediction data yet.</p>;

  return (
    <div className="space-y-3">
      {data.zones.map((zone, i) => (
        <motion.div key={zone.zone} className={`p-4 rounded-xl border ${
          zone.risk_score >= 70 ? 'bg-red-500/[0.04] border-red-500/15' :
          zone.risk_score >= 40 ? 'bg-amber-500/[0.04] border-amber-500/15' :
          'bg-white/[0.02] border-white/[0.04]'
        }`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-white">{zone.zone}</h4>
              <p className="text-[10px] text-zinc-500">{zone.active_issues} active issue{zone.active_issues !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                zone.risk_score >= 70 ? 'text-red-400' : zone.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
              }`} style={{ fontFamily: 'Space Grotesk' }}>{zone.risk_score}</div>
              <p className="text-[9px] text-zinc-500">risk score</p>
            </div>
          </div>
          {/* Prediction bar */}
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
            <motion.div className="h-full rounded-full" initial={{ width: 0 }}
              animate={{ width: `${zone.risk_score}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
              style={{ background: zone.risk_score >= 70 ? '#ff6b6b' : zone.risk_score >= 40 ? '#ffa94d' : '#4edea3' }} />
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${
              zone.earliest_failure_days < 14 ? 'text-red-400' : zone.earliest_failure_days < 60 ? 'text-amber-400' : 'text-zinc-400'
            }`}>
              {zone.earliest_failure_days < 14 ? '⚠️' : zone.earliest_failure_days < 60 ? '⏳' : '📊'} {zone.forecast}
            </p>
            {zone.earliest_failure_days < 30 && (
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] font-bold">URGENT</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function AdvancedAnalytics() {
  const [tab, setTab] = useState('shame');
  const [shame, setShame] = useState(null);
  const [priority, setPriority] = useState(null);
  const [health, setHealth] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/analytics/wall-of-shame`).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/analytics/priority-queue`).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/analytics/city-health`).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/analytics/forecast`).then(r => r.json()).catch(() => null),
    ]).then(([s, p, h, f]) => {
      setShame(s); setPriority(p); setHealth(h); setForecast(f); setLoading(false);
    });
  }, []);

  const tabs = [
    { id: 'shame', label: 'Wall of Shame', icon: Flame },
    { id: 'priority', label: 'Fix Priority', icon: AlertTriangle },
    { id: 'predict', label: 'Predictions', icon: TrendingUp },
    { id: 'health', label: 'City Health', icon: Shield },
  ];

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Tab selector */}
      <div className="flex gap-2 p-1 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-500'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Loading analytics...</p>
        </div>
      ) : (
        <>
          {tab === 'shame' && (
            <div>
              <h3 className="text-lg font-extrabold text-white mb-1 flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-400" /> Wall of Shame
              </h3>
              <p className="text-xs text-zinc-500 mb-4">Contractor accountability ranked by negligence</p>
              <WallOfShame data={shame} />
            </div>
          )}
          {tab === 'priority' && (
            <div>
              <h3 className="text-lg font-extrabold text-white mb-1 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" /> Maintenance Priority
              </h3>
              <p className="text-xs text-zinc-500 mb-1">Priority = Severity × Days Unresolved × Community Votes</p>
              <p className="text-[10px] text-zinc-600 mb-4">Top 5 most urgent repairs</p>
              <PriorityQueue data={priority?.priorities} />
            </div>
          )}
          {tab === 'predict' && (
            <div>
              <h3 className="text-lg font-extrabold text-white mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-400" /> Predictive Maintenance
              </h3>
              <p className="text-xs text-zinc-500 mb-4">AI forecasts which zones will fail next based on damage progression rates</p>
              <AreaForecast data={forecast} />
            </div>
          )}
          {tab === 'health' && (
            <div>
              <h3 className="text-lg font-extrabold text-white mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" /> Road Health Score
              </h3>
              <p className="text-xs text-zinc-500 mb-4">City-level infrastructure rating (0-100)</p>
              <CityHealth data={health?.cities} />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
