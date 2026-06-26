import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  Hammer,
  MapPin,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const num = typeof value === "string" ? parseInt(value.replace(/[^0-9]/g, "")) : value;
    if (isNaN(num)) { setDisplay(value); return; }
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(start + (num - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{prefix}{typeof display === "number" ? display.toLocaleString("en-IN") : display}{suffix}</span>;
}

function SeverityBadge({ severity }) {
  const config = {
    critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
    warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    minor: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  };
  const c = config[severity] || config.minor;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      {severity}
    </span>
  );
}

function CostComparison({ costNow, costIfIgnored, savings }) {
  return (
    <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
      <div className="text-center">
        <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
          <TrendingDown className="w-3 h-3" /> Fix Now
        </div>
        <div className="text-base font-extrabold text-emerald-400">{costNow}</div>
      </div>
      <div className="text-center border-x border-zinc-700/30">
        <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1 font-bold">
          <TrendingUp className="w-3 h-3" /> If Ignored
        </div>
        <div className="text-base font-extrabold text-red-400">{costIfIgnored}</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1 font-bold">
          <DollarSign className="w-3 h-3" /> Savings
        </div>
        <div className="text-base font-extrabold text-cyan-400">{savings}</div>
      </div>
    </div>
  );
}

function ExplainableAI({ explanation }) {
  const [expanded, setExpanded] = useState(false);
  if (!explanation) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Info className="w-3 h-3" />
        Why this severity?
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/20 space-y-2">
              <p className="text-[11px] text-zinc-400 leading-relaxed">{explanation.explanation}</p>
              {explanation.factors?.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    f.impact === "high" ? "bg-red-400" : f.impact === "medium" ? "bg-amber-400" : "bg-zinc-500"
                  }`} />
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-300">{f.factor}</span>
                    <p className="text-[10px] text-zinc-500">{f.detail}</p>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-emerald-400/80 italic mt-1">{explanation.recommendation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriorityCard({ item, index }) {
  return (
    <motion.div
      className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-all"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.005 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
            index === 0 ? "bg-red-500/10 text-red-400 border border-red-500/20" :
            index === 1 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
            "bg-zinc-800 text-zinc-400 border border-zinc-700"
          }`}>
            #{item.priority}
          </div>
          <div>
            <h4 className="text-base font-extrabold text-white">{item.damage_type}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <SeverityBadge severity={item.severity} />
              <span className="text-[10px] text-zinc-500">Urgency: {item.urgency_score}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-white">{item.estimated_cost}</div>
          <div className="text-xs text-zinc-500 font-medium">estimated</div>
        </div>
      </div>

      {/* Repair details */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <Hammer className="w-3.5 h-3.5 text-zinc-500" />
          <div>
            <div className="text-[10px] text-zinc-500">Method</div>
            <div className="text-[11px] text-zinc-300">{item.repair_method}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <div>
            <div className="text-[10px] text-zinc-500">Time</div>
            <div className="text-[11px] text-zinc-300">{item.repair_time}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-zinc-500" />
          <div>
            <div className="text-[10px] text-zinc-500">Crew</div>
            <div className="text-[11px] text-zinc-300">{item.crew_needed} workers</div>
          </div>
        </div>
      </div>

      {/* Before vs After */}
      <CostComparison
        costNow={item.estimated_cost}
        costIfIgnored={item.cost_if_delayed}
        savings={item.savings}
      />
    </motion.div>
  );
}

export default function RepairPlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/repair-plan`);
      const data = await res.json();
      setPlan(data);
    } catch (err) {
      setError("Failed to connect to backend. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <motion.div
          className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!plan || !plan.summary) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center py-16">
          <motion.div
            className="w-20 h-20 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mx-auto mb-6"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <FileText className="w-8 h-8 text-zinc-600" />
          </motion.div>
          <h3 className="text-lg font-semibold text-white mb-2">No Scans Yet</h3>
          <p className="text-sm text-zinc-500 mb-6">
            Upload and scan images first, then generate your repair plan
          </p>
          <p className="text-xs text-zinc-600">
            Go to Dashboard → Upload images → Come back here
          </p>
        </div>
      </motion.div>
    );
  }

  const s = plan.summary;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <Zap className="w-7 h-7 text-emerald-400" />
            Today's Repair Plan
          </h2>
          <p className="text-sm text-zinc-500 mt-1 font-medium">
            Generated {new Date(plan.generated_at).toLocaleString()} • {s.total_defects} defects analyzed
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={fetchPlan}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium border border-zinc-700 hover:border-zinc-600 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Refresh
          </motion.button>
          <motion.button
            className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-bold flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Generate printable report
              const w = window.open('', '_blank');
              w.document.write(`<html><head><title>CRACKWATCH Repair Plan</title>
                <style>body{font-family:system-ui;padding:40px;max-width:800px;margin:0 auto}
                h1{color:#10b981}table{width:100%;border-collapse:collapse;margin:20px 0}
                th,td{padding:8px 12px;border:1px solid #ddd;text-align:left}
                th{background:#f5f5f5}
                .critical{color:#ef4444;font-weight:bold}.warning{color:#f59e0b;font-weight:bold}
                .savings{color:#06b6d4;font-weight:bold}</style></head><body>
                <h1>CRACKWATCH — Repair Plan</h1>
                <p>Generated: ${new Date(plan.generated_at).toLocaleString()}</p>
                <h2>Summary</h2>
                <table><tr><td>Total Defects</td><td>${s.total_defects}</td></tr>
                <tr><td>Critical</td><td class="critical">${s.critical_count}</td></tr>
                <tr><td>Warning</td><td class="warning">${s.warning_count}</td></tr>
                <tr><td>Total Repair Cost</td><td>${s.total_repair_cost}</td></tr>
                <tr><td>Cost if Ignored (6 months)</td><td class="critical">${s.cost_if_ignored_6months}</td></tr>
                <tr><td>Potential Savings</td><td class="savings">${s.potential_savings}</td></tr></table>
                <h2>Priority Actions</h2>
                <table><tr><th>#</th><th>Damage</th><th>Severity</th><th>Repair Method</th><th>Cost</th><th>Time</th><th>Crew</th></tr>
                ${plan.top_priorities.map(p => `<tr><td>${p.priority}</td><td>${p.damage_type}</td>
                <td class="${p.severity}">${p.severity}</td><td>${p.repair_method}</td>
                <td>${p.estimated_cost}</td><td>${p.repair_time}</td><td>${p.crew_needed}</td></tr>`).join('')}
                </table>
                <p><strong>Recommendation:</strong> ${s.recommended_action}</p>
                <hr><p style="color:#888;font-size:12px">Generated by CRACKWATCH AI Infrastructure Monitoring System</p>
                </body></html>`);
              w.document.close();
              w.print();
            }}
          >
            <Download className="w-4 h-4" />
            Export Report
          </motion.button>
        </div>
      </div>

      {/* Recommendation banner */}
      <motion.div
        className={`p-4 rounded-xl border flex items-start gap-3 ${
          s.critical_count > 0
            ? "bg-red-500/5 border-red-500/20"
            : s.warning_count > 0
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-emerald-500/5 border-emerald-500/20"
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {s.critical_count > 0 ? (
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        ) : (
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div>
          <p className={`text-sm font-semibold ${s.critical_count > 0 ? "text-red-400" : s.warning_count > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {s.recommended_action}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {s.total_defects} defects detected • {s.critical_count} critical • {s.warning_count} warnings
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Repair Cost", value: s.total_repair_cost, icon: DollarSign, color: "text-white", bg: "from-zinc-800/80 to-zinc-900/80" },
          { label: "Cost if Ignored", value: s.cost_if_ignored_6months, icon: TrendingUp, color: "text-red-400", bg: "from-red-500/5 to-red-500/0" },
          { label: "Potential Savings", value: s.potential_savings, icon: TrendingDown, color: "text-emerald-400", bg: "from-emerald-500/5 to-emerald-500/0" },
          { label: "Defects Found", value: s.total_defects, icon: AlertTriangle, color: "text-amber-400", bg: "from-amber-500/5 to-amber-500/0" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className={`p-4 rounded-xl border border-zinc-800/50 bg-gradient-to-br ${kpi.bg}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div className={`text-2xl font-extrabold ${kpi.color}`}>
              {typeof kpi.value === "number" ? <AnimatedCounter value={kpi.value} /> : kpi.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Priority List */}
      <div>
        <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2 tracking-tight">
          <Zap className="w-4 h-4 text-amber-400" />
          Priority Repairs — What to Fix First
        </h3>
        <div className="space-y-3">
          {plan.top_priorities.map((item, i) => (
            <PriorityCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>

      {/* All detections with explainable AI */}
      {plan.all_detections && plan.all_detections.length > 0 && (
        <div>
          <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2 tracking-tight">
            <Info className="w-4 h-4 text-cyan-400" />
            Detailed Analysis — Explainable AI
          </h3>
          <div className="space-y-2">
            {plan.all_detections.map((det, i) => (
              <motion.div
                key={i}
                className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{det.display_name}</span>
                    <SeverityBadge severity={det.severity_label} />
                  </div>
                  <span className="text-xs text-zinc-500">
                    Severity: {det.severity}% • Confidence: {(det.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <ExplainableAI explanation={det.explanation} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
