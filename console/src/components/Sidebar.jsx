import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  LayoutDashboard,
  Upload,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  MapPin,
  Video,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Upload, label: "New Scan", id: "scan" },
  { icon: Video, label: "Video / Live", id: "video" },
  { icon: MapPin, label: "Reports Map", id: "govt-map" },
  { icon: Zap, label: "Repair Plan", id: "repair-plan" },
  { icon: BarChart3, label: "Analytics", id: "analytics" },
  { icon: Settings, label: "Settings", id: "settings" },
];

export default function Sidebar({ activeTab, onTabChange }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-zinc-950 border-r border-zinc-800/30 overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-emerald-500/3 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 relative z-10">
        <motion.div
          className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ScanLine className="w-5 h-5 text-emerald-400" />
          <motion.div
            className="absolute inset-0 rounded-xl bg-emerald-400/20"
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-base font-extrabold text-white tracking-wide leading-tight">
                CRACK<span className="text-emerald-400">WATCH</span>
              </h1>
              <p className="text-[10px] text-zinc-500 tracking-[0.15em] uppercase font-semibold">
                Smart Infrastructure
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-5 px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-xs text-emerald-400 font-bold tracking-wide">
                System Online
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer ${
                isActive
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30"
              }`}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={`relative z-10 w-5 h-5 ${
                  isActive ? "text-emerald-400" : ""
                }`}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    className="relative z-10 tracking-wide"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && !collapsed && item.id === "repair-plan" && (
                <motion.span
                  className="relative z-10 ml-auto text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  NEW
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-5 space-y-3">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 rounded-xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/30 border border-zinc-700/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  NIRMAN 2026
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                AI-Powered Infrastructure Command Center
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] text-zinc-500 font-medium">
                  Mumbai, Maharashtra
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-colors cursor-pointer"
          whileTap={{ scale: 0.95 }}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}
