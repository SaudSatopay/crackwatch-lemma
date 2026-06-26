import { useState } from "react";
import { motion } from "framer-motion";
import { ScanLine, Lock, User, ArrowRight, AlertTriangle, Shield } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError("Enter username and password"); return; }
    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("username", username);
      fd.append("password", password);
      const res = await fetch(`${API_URL}/auth/login`, { method: "POST", body: fd });
      if (!res.ok) {
        setError("Invalid credentials");
        setLoading(false);
        return;
      }
      const data = await res.json();
      localStorage.setItem("crackwatch_token", data.token);
      localStorage.setItem("crackwatch_user", JSON.stringify(data));
      onLogin(data);
    } catch {
      setError("Server not reachable");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#131315] flex items-center justify-center relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-[#4edea3]/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[400px] h-[400px] bg-[#5de6ff]/[0.03] rounded-full blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center justify-center mx-auto mb-4"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <ScanLine className="w-8 h-8 text-[#4edea3]" />
          </motion.div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: "Space Grotesk" }}>
            CRACK<span className="text-[#4edea3]">WATCH</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">Government Command Center</p>
        </div>

        {/* Login card */}
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4 text-[#4edea3]" />
            <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Authorized Access Only</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-bold mb-1.5 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] text-white text-sm outline-none placeholder-white/15 focus:ring-1 focus:ring-[#4edea3]/30 transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-bold mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] text-white text-sm outline-none placeholder-white/15 focus:ring-1 focus:ring-[#4edea3]/30 transition-all"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-[#ff6b6b]/5 border border-[#ff6b6b]/10"
              >
                <AlertTriangle className="w-4 h-4 text-[#ff6b6b]" />
                <span className="text-xs text-[#ff6b6b]">{error}</span>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4edea3] to-[#10b981] text-[#002113] font-bold text-sm flex items-center justify-center gap-2"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#002113] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/20 text-center">
              Demo: <span className="text-white/40 font-mono">admin</span> / <span className="text-white/40 font-mono">admin123</span>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/15 mt-6">
          CRACKWATCH v1.0 — NIRMAN Hackathon 2026
        </p>
      </motion.div>
    </div>
  );
}
