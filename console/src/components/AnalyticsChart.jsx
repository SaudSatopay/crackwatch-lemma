import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const scanData = [
  { date: "Mon", scans: 45, cracks: 3 },
  { date: "Tue", scans: 62, cracks: 5 },
  { date: "Wed", scans: 38, cracks: 2 },
  { date: "Thu", scans: 71, cracks: 8 },
  { date: "Fri", scans: 56, cracks: 4 },
  { date: "Sat", scans: 23, cracks: 1 },
  { date: "Sun", scans: 18, cracks: 1 },
];

const severityData = [
  { name: "Critical", value: 12, color: "#ef4444" },
  { name: "Moderate", value: 34, color: "#f59e0b" },
  { name: "Minor", value: 43, color: "#eab308" },
  { name: "Clear", value: 158, color: "#10b981" },
];

const monthlyData = [
  { month: "Jan", detected: 24, resolved: 20 },
  { month: "Feb", detected: 31, resolved: 28 },
  { month: "Mar", detected: 18, resolved: 17 },
  { month: "Apr", detected: 42, resolved: 35 },
  { month: "May", detected: 28, resolved: 26 },
  { month: "Jun", detected: 35, resolved: 33 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsChart() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Scans over time - large chart */}
      <motion.div
        className="lg:col-span-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Scan Activity</h3>
            <p className="text-[11px] text-zinc-500">Daily scans & detections this week</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-zinc-500">Scans</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-zinc-500">Cracks</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={scanData}>
            <defs>
              <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="crackGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="scans" stroke="#10b981" fill="url(#scanGradient)" strokeWidth={2} name="Scans" />
            <Area type="monotone" dataKey="cracks" stroke="#ef4444" fill="url(#crackGradient)" strokeWidth={2} name="Cracks" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Severity distribution - donut */}
      <motion.div
        className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-sm font-semibold text-white mb-1">Severity Distribution</h3>
        <p className="text-[11px] text-zinc-500 mb-4">Last 30 days breakdown</p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={severityData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {severityData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {severityData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-zinc-400">
                {item.name} <span className="text-zinc-600">({item.value})</span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Monthly trend */}
      <motion.div
        className="lg:col-span-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Monthly Trend</h3>
            <p className="text-[11px] text-zinc-500">Detected vs Resolved cracks</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-zinc-500">Detected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-zinc-500">Resolved</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="detected" fill="#ef4444" radius={[4, 4, 0, 0]} name="Detected" />
            <Bar dataKey="resolved" fill="#10b981" radius={[4, 4, 0, 0]} name="Resolved" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
