import { motion } from "framer-motion";
import { Clock, CheckCircle, AlertTriangle, XCircle, ChevronRight, MapPin } from "lucide-react";

const recentScans = [
  {
    id: 1,
    name: "Bridge Section A-14",
    location: "Highway 101, Mile 23",
    time: "2 min ago",
    status: "critical",
    cracks: 3,
    image: "🌉",
  },
  {
    id: 2,
    name: "Parking Deck Level 3",
    location: "Downtown Complex",
    time: "15 min ago",
    status: "clear",
    cracks: 0,
    image: "🏗️",
  },
  {
    id: 3,
    name: "Tunnel Wall East",
    location: "Metro Line B",
    time: "32 min ago",
    status: "moderate",
    cracks: 1,
    image: "🚇",
  },
  {
    id: 4,
    name: "Dam Surface Panel 7",
    location: "Reservoir Site",
    time: "1 hr ago",
    status: "minor",
    cracks: 2,
    image: "🏔️",
  },
  {
    id: 5,
    name: "Airport Runway 2L",
    location: "International Terminal",
    time: "2 hr ago",
    status: "clear",
    cracks: 0,
    image: "✈️",
  },
  {
    id: 6,
    name: "Hospital Wing B",
    location: "Medical Center",
    time: "3 hr ago",
    status: "moderate",
    cracks: 2,
    image: "🏥",
  },
];

const statusConfig = {
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: XCircle,
    label: "Critical",
  },
  moderate: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: AlertTriangle,
    label: "Moderate",
  },
  minor: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    icon: AlertTriangle,
    label: "Minor",
  },
  clear: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: CheckCircle,
    label: "Clear",
  },
};

export default function RecentScans() {
  return (
    <motion.div
      className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            Recent Scans
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Latest inspection results</p>
        </div>
        <button className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {recentScans.map((scan, i) => {
          const config = statusConfig[scan.status];
          const StatusIcon = config.icon;

          return (
            <motion.div
              key={scan.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              whileHover={{ x: 4 }}
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-lg shrink-0">
                {scan.image}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {scan.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-zinc-600" />
                  <span className="text-[10px] text-zinc-500 truncate">
                    {scan.location}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bg} border ${config.border}`}
                >
                  <StatusIcon className={`w-3 h-3 ${config.color}`} />
                  <span className={`text-[10px] font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600 w-16 text-right">
                  {scan.time}
                </span>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
