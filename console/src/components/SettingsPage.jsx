import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, LogOut, HardDrive, ShieldCheck, ShieldOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SettingsPage({ user, onLogout }) {
  const [fraudEnabled, setFraudEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Load current setting
  useEffect(() => {
    fetch(`${API_URL}/admin/settings`).then(r => r.json()).then(d => {
      setFraudEnabled(d.fraud_detection_enabled);
    }).catch(() => {});
  }, []);

  const toggleFraud = async () => {
    setToggling(true);
    const newVal = !fraudEnabled;
    try {
      const fd = new FormData();
      fd.append('fraud_detection_enabled', newVal);
      const res = await fetch(`${API_URL}/admin/settings`, { method: 'PATCH', body: fd });
      const data = await res.json();
      setFraudEnabled(data.fraud_detection_enabled);
    } catch {}
    setToggling(false);
  };

  return (
    <motion.div className="space-y-6 max-w-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Profile card */}
      <div className="bg-white/[0.03] rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
            <User className="w-7 h-7 text-black" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{user?.name || "Inspector"}</h3>
            <p className="text-sm text-white/40">{user?.department || "Municipal Department"}</p>
            <p className="text-xs text-emerald-400/60 font-mono mt-0.5">{user?.role || "government"}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">ACTIVE</span>
        </div>
      </div>

      {/* Fraud Detection Toggle — THE KEY FEATURE */}
      <div className="bg-white/[0.03] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-bold">Security Controls</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                fraudEnabled ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {fraudEnabled ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <ShieldOff className="w-5 h-5 text-red-400" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Fake Report Detection</h4>
                <p className="text-[11px] text-white/40 mt-0.5">5-layer fraud prevention on citizen reports</p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              onClick={toggleFraud}
              disabled={toggling}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                fraudEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                  fraudEnabled ? 'left-[1.75rem]' : 'left-[0.125rem]'
                }`}
              />
            </button>
          </div>

          {/* Status info */}
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
            fraudEnabled
              ? 'bg-emerald-500/5 text-emerald-400/80 border border-emerald-500/10'
              : 'bg-red-500/5 text-red-400/80 border border-red-500/10'
          }`}>
            {fraudEnabled
              ? '✓ Active — Reports below 45% trust are blocked. 45-70% flagged for review.'
              : '✕ Disabled — All reports are auto-approved without verification.'
            }
          </div>
        </div>
      </div>

      {/* System */}
      <div className="bg-white/[0.03] rounded-2xl overflow-hidden">
        <p className="px-5 py-3 text-[10px] text-white/30 uppercase tracking-[0.15em] font-bold">System</p>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-white/40" />
          </div>
          <span className="flex-1 text-sm text-white/70 font-medium">AI Model</span>
          <span className="text-xs text-white/30">YOLOv8s-RDD + CrackSeg (Local)</span>
        </div>
      </div>

      {/* Logout */}
      <motion.button
        onClick={onLogout}
        className="w-full py-3.5 rounded-xl bg-[#ff6b6b]/5 border border-[#ff6b6b]/10 text-[#ff6b6b] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#ff6b6b]/10 transition-colors"
        whileTap={{ scale: 0.98 }}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </motion.button>

      <p className="text-center text-[10px] text-white/10">CRACKWATCH v3.3.0 — NIRMAN Hackathon 2026</p>
    </motion.div>
  );
}
