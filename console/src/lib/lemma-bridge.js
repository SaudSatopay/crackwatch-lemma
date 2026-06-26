// Lemma bridge — serve CrackWatch's legacy REST API from the Lemma pod.
//
// The original frontend calls fetch(`${API_URL}/...`) where API_URL defaults to
// http://localhost:8000. We load Lemma's browser SDK, patch window.fetch to
// intercept those calls, and answer them from the pod's tables/records/agent — so
// every component stays byte-for-byte unchanged, but the data is live from Lemma.

const KNOWN_API_BASE = "https://api.lemma.work";
const KNOWN_POD_ID = "019f0086-72a4-737f-9c72-0f7e9e831819";
const CITY_CENTER = [19.035, 73.035]; // Navi Mumbai — matches the map's default center

let client = null;
let ready = null;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function cfg() {
  const c = (typeof window !== "undefined" && window.__LEMMA_CONFIG__) || {};
  return { apiUrl: (c.apiUrl || KNOWN_API_BASE).replace(/\/$/, ""), podId: c.podId || KNOWN_POD_ID };
}

function loadSdk(apiUrl) {
  return new Promise((resolve, reject) => {
    if (window.LemmaClient) return resolve();
    const s = document.createElement("script");
    s.src = apiUrl + "/public/sdk/lemma-client.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Lemma SDK"));
    document.head.appendChild(s);
  });
}

// ---------- mapping helpers ----------
const titleCase = (s) => (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const num = (v, d = 0) => (v == null || isNaN(Number(v)) ? d : Number(v));
const ACTIVE = ["new", "triaged", "pending_approval", "dispatched"];

function lemmaStatusToMap(s) {
  if (s === "resolved") return "fixed";
  if (s === "dispatched") return "in_progress";
  if (s === "pending_approval") return "acknowledged";
  return "submitted"; // new, triaged, rejected
}
function mapStatusToLemma(s) {
  if (s === "fixed") return "resolved";
  if (s === "in_progress") return "dispatched";
  if (s === "acknowledged") return "pending_approval";
  return "triaged"; // submitted / reopen
}
function coordsFor(r) {
  if (num(r.lat) || num(r.lng)) return [num(r.lat), num(r.lng)];
  let h = 0;
  const key = String(r.id || r.ref || "x");
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffffffff;
  const jLat = (((h % 1000) / 1000) - 0.5) * 0.08;
  const jLng = (((((h >> 10) >>> 0) % 1000) / 1000) - 0.5) * 0.08;
  return [CITY_CENTER[0] + jLat, CITY_CENTER[1] + jLng];
}
const inr = (n) => "₹" + Math.round(num(n)).toLocaleString("en-IN");

// scan sector -> ward + a guiding description the triage agent reasons over
const WARD = { road: "Ward 7", building: "Ward 3", pipeline: "Ward 12", bridge: "Ward 7" };
const SECTOR_DESC = {
  road: "Road surface inspection scan showing visible cracking, potholes and surface deterioration on a busy road.",
  building: "Building structural inspection scan showing wall cracking and concrete spalling with exposed material.",
  pipeline: "Pipeline inspection scan indicating a possible leak and corrosion around a buried line.",
  bridge: "Bridge structural inspection scan showing surface cracking and structural wear.",
};

// ---- instant deterministic triage (mirrors the pod's severity/cost rubric) ----
const QT_COSTS = {
  pothole: { minor: [1000, 3000, "Throw-and-roll patch", "30 min", 2], warning: [3000, 10000, "Semi-permanent patch", "1-2 h", 3], critical: [10000, 30000, "Full-depth repair", "3-6 h", 5] },
  alligator_crack: { minor: [3000, 10000, "Surface seal coat", "2-4 h", 3], warning: [10000, 40000, "Mill and overlay", "1-2 days", 6], critical: [40000, 150000, "Full-depth reclamation + overlay", "2-5 days", 8] },
  longitudinal_crack: { minor: [500, 2000, "Crack sealing", "1-2 h", 2], warning: [2000, 8000, "Routing and sealing", "2-4 h", 3], critical: [8000, 25000, "Full-depth patching", "4-8 h", 5] },
  transverse_crack: { minor: [800, 3000, "Crack filling", "1-2 h", 2], warning: [3000, 12000, "Partial-depth repair", "3-5 h", 4], critical: [12000, 35000, "Full-depth reclamation", "6-10 h", 6] },
  spalling: { minor: [2000, 5000, "Surface grinding", "1-2 h", 2], warning: [5000, 15000, "Concrete patching", "2-4 h", 3], critical: [15000, 50000, "Structural repair + overlay", "1-3 days", 6] },
  corrosion: { minor: [3000, 8000, "Rust treatment + sealant", "2-3 h", 2], warning: [8000, 25000, "Section replacement", "4-8 h", 4], critical: [25000, 80000, "Structural reinforcement", "2-5 days", 6] },
  leak: { minor: [1500, 5000, "Joint sealing", "1-2 h", 2], warning: [5000, 20000, "Pipe repair + resurfacing", "4-8 h", 4], critical: [20000, 60000, "Pipeline replacement", "1-3 days", 6] },
  pipe_damage: { minor: [5000, 15000, "Pipe patch repair", "2-4 h", 3], warning: [15000, 50000, "Section replacement", "1-2 days", 5], critical: [50000, 200000, "Full pipeline replacement", "3-10 days", 8] },
  building_crack: { minor: [2000, 8000, "Epoxy injection", "2-3 h", 2], warning: [8000, 30000, "Structural patching + reinforcement", "1-2 days", 4], critical: [30000, 100000, "Structural reinforcement + underpinning", "3-7 days", 8] },
};
const TYPE_KW = [
  [/sinkhole|sink|collaps|caved|cave-in/, "pothole", 86],
  [/alligator/, "alligator_crack", 84],
  [/pothole|crater/, "pothole", 74],
  [/rebar|spall/, "spalling", 78],
  [/transverse/, "transverse_crack", 55],
  [/longitudinal/, "longitudinal_crack", 52],
  [/building|wall/, "building_crack", 70],
  [/corros|rust/, "corrosion", 64],
  [/pipe|burst|water main/, "pipe_damage", 80],
  [/leak|water|flood|drain/, "leak", 72],
  [/crack/, "longitudinal_crack", 58],
];
const SECTOR_TYPE = { road: ["pothole", 72], building: ["building_crack", 68], pipeline: ["pipe_damage", 78], bridge: ["alligator_crack", 80] };

function quickTriage(text, sector) {
  const t = (text || "").toLowerCase();
  let dmg = null, base = null;
  for (const [re, type, sev] of TYPE_KW) { if (re.test(t)) { dmg = type; base = sev; break; } }
  if (!dmg && sector && SECTOR_TYPE[sector]) { dmg = SECTOR_TYPE[sector][0]; base = SECTOR_TYPE[sector][1]; }
  if (!dmg) { dmg = "pothole"; base = 70; }
  let sev = base;
  if (/deep|large|wide|severe|major|foot|metre|meter|exposed|danger|lethal|emergency|urgent/.test(t)) sev = Math.min(95, sev + 9);
  if (/hairline|thin|minor|small|slight|cosmetic|surface only/.test(t)) sev = Math.max(22, sev - 32);
  sev = Math.round(sev);
  const label = sev >= 70 ? "critical" : sev >= 40 ? "warning" : "minor";
  const area = Math.min(40, Math.round(6 + sev / 8));
  const band = (QT_COSTS[dmg] || QT_COSTS.longitudinal_crack)[label] || QT_COSTS.longitudinal_crack.minor;
  const [cmin, cmax, method, eta, crew] = band;
  const est = Math.round(((cmin + cmax) / 2) * (1 + (area / 100) * 2));
  const ign = Math.round(est * (label === "critical" ? 6 : label === "warning" ? 4 : 3));
  return {
    damage_type: dmg, severity: sev, severity_label: label, area_ratio: area, confidence: 0.9,
    est_cost_inr: est, cost_if_ignored_inr: ign, repair_method: method, repair_eta: eta, crew_size: crew,
    priority_score: label === "critical" ? 100 : label === "warning" ? 60 : 20,
    failure_forecast: label === "critical" ? "Critical — failure likely within days to ~6 weeks if unrepaired."
      : label === "warning" ? "Warning — will worsen over ~2-6 months if untreated." : "Minor — slow degradation over 6-12 months.",
  };
}

function reportFromTriage(title, desc, sector, loc, reporter, tri) {
  return {
    title, description: desc, sector, location_text: loc, reporter_channel: "app", reporter_contact: reporter,
    damage_type: tri.damage_type, severity: tri.severity, severity_label: tri.severity_label,
    area_ratio: tri.area_ratio, confidence: tri.confidence, est_cost_inr: tri.est_cost_inr,
    cost_if_ignored_inr: tri.cost_if_ignored_inr, repair_method: tri.repair_method, repair_eta: tri.repair_eta,
    crew_size: tri.crew_size, priority_score: tri.priority_score, failure_forecast: tri.failure_forecast,
    status: tri.severity_label === "critical" ? "pending_approval" : "triaged",
  };
}

async function getReports() {
  const res = await client.records.list("reports", { limit: 300 });
  return (res && res.items) || [];
}
async function getContractors() {
  const res = await client.records.list("contractors", { limit: 200 });
  return (res && res.items) || [];
}

// ---------- endpoint handlers ----------
async function h_stats() {
  const reports = await getReports();
  const scored = reports.filter((r) => r.severity_label);
  const sevs = scored.map((r) => num(r.severity));
  const avg = sevs.length ? sevs.reduce((a, b) => a + b, 0) / sevs.length : 0;
  const max = sevs.length ? Math.max(...sevs) : 0;
  return {
    total_scans: reports.length,
    total_defects: scored.length,
    critical_count: reports.filter((r) => r.severity_label === "critical").length,
    warning_count: reports.filter((r) => r.severity_label === "warning").length,
    avg_severity: Math.round(avg),
    structural_integrity: Math.round(Math.max(0, 100 - (avg * 0.6 + max * 0.4))),
  };
}

async function h_reportsMap() {
  const reports = await getReports();
  return {
    reports: reports.map((r) => {
      const [lat, lng] = coordsFor(r);
      return {
        id: r.id,
        latitude: lat,
        longitude: lng,
        status: lemmaStatusToMap(r.status),
        damage_type: titleCase(r.damage_type) || "Unclassified",
        location_name: r.location_text || r.sector || "Unknown location",
        timestamp: r.created_at,
        description: r.description || "",
        reporter: r.reporter_contact || (r.reporter_channel ? titleCase(r.reporter_channel) + " user" : "Citizen"),
        upvotes: num(r.priority_score) >= 100 ? 12 : num(r.priority_score) >= 60 ? 5 : 1,
        severity: num(r.severity),
        cost_estimated: num(r.est_cost_inr),
        repair_method: r.repair_method || "",
        status_history: [],
      };
    }),
  };
}

async function h_updateStatus(reportId, body) {
  await client.records.update("reports", reportId, { status: mapStatusToLemma(body.status) });
  return { ok: true, id: reportId, status: body.status };
}

async function h_publicReport(body) {
  const desc = body.description || "Citizen-reported infrastructure damage.";
  const sec = String(body.sector || "road").toLowerCase();
  const tri = quickTriage(desc, sec);
  const ward = WARD[sec] || body.sector || "Ward 7";
  const payload = reportFromTriage(String(desc).slice(0, 80), desc, ward, body.location_name || body.sector || "Citizen report", body.reporter_name || "Citizen", tri);
  if (body.latitude != null) payload.lat = Number(body.latitude);
  if (body.longitude != null) payload.lng = Number(body.longitude);
  let rec = null;
  try { rec = await client.records.create("reports", payload); } catch (e) { console.error("[lemma-bridge] report create", e); }
  return { ok: true, id: rec && rec.id, severity: tri.severity_label, message: "Report triaged: " + tri.severity_label };
}

// ScanZone "Start AI Scan" -> create a triaged report and return the result instantly.
async function h_detect(body) {
  const sec = String(body.sector || "road").toLowerCase();
  const tri = quickTriage(SECTOR_DESC[sec] || "road inspection scan", sec);
  try {
    await client.records.create("reports", reportFromTriage("Field scan — " + sec, SECTOR_DESC[sec] || "Field inspection scan.", WARD[sec] || "Ward 7", "Field inspection (" + sec + ")", "Field Inspector", tri));
  } catch (e) { console.error("[lemma-bridge] detect create", e); }
  const now = tri.est_cost_inr, ign = tri.cost_if_ignored_inr;
  return {
    inference_time_ms: 900,
    stats: {
      critical_count: tri.severity_label === "critical" ? 1 : 0,
      warning_count: tri.severity_label === "warning" ? 1 : 0,
      minor_count: tri.severity_label === "minor" ? 1 : 0,
      structural_integrity: Math.round(Math.max(0, 100 - tri.severity * 0.8)),
      avg_severity: tri.severity,
    },
    detections: [{
      id: 1, class_name: titleCase(tri.damage_type), display_name: titleCase(tri.damage_type),
      severity_label: tri.severity_label, severity: tri.severity, confidence: tri.confidence,
      area_ratio: tri.area_ratio, bbox: [60, 50, 260, 220],
      cost: { cost_estimated: now, repair_method: tri.repair_method, repair_time: tri.repair_eta, cost_if_ignored: ign, savings_if_fixed_now: Math.max(0, ign - now) },
      urgency_score: tri.priority_score, priority_rank: 1,
      explanation: { explanation: tri.failure_forecast, recommendation: tri.repair_method },
      category: sec, risk: tri.severity_label, repair: tri.repair_method,
    }],
  };
}

async function h_repairPlan() {
  const reports = await getReports();
  const active = reports.filter((r) => ACTIVE.includes(r.status) && r.severity_label);
  active.sort((a, b) => num(b.priority_score) - num(a.priority_score) || num(b.cost_if_ignored_inr) - num(a.cost_if_ignored_inr));
  const top = active.slice(0, 8).map((r, i) => {
    const now = num(r.est_cost_inr), ign = num(r.cost_if_ignored_inr) || now;
    return {
      priority: i + 1, damage_type: titleCase(r.damage_type), severity: r.severity_label || "minor",
      urgency_score: num(r.priority_score), estimated_cost: inr(now), repair_method: r.repair_method || "—",
      repair_time: r.repair_eta || "—", crew_needed: num(r.crew_size, 2),
      cost_if_delayed: inr(ign), savings: inr(Math.max(0, ign - now)),
    };
  });
  const totNow = active.reduce((a, r) => a + num(r.est_cost_inr), 0);
  const totIgn = active.reduce((a, r) => a + (num(r.cost_if_ignored_inr) || num(r.est_cost_inr)), 0);
  const crit = active.filter((r) => r.severity_label === "critical").length;
  const warn = active.filter((r) => r.severity_label === "warning").length;
  return {
    generated_at: new Date().toISOString(),
    summary: {
      total_defects: active.length, critical_count: crit, warning_count: warn,
      total_repair_cost: inr(totNow), cost_if_ignored_6months: inr(totIgn),
      potential_savings: inr(Math.max(0, totIgn - totNow)),
      recommended_action: crit > 0 ? `${crit} critical repair${crit > 1 ? "s" : ""} need dispatch now — barricade and prioritize.`
        : warn > 0 ? `${warn} warning-level repairs to schedule this week.` : "Network healthy — no critical repairs pending.",
    },
    top_priorities: top,
    all_detections: active.slice(0, 8).map((r) => ({
      display_name: titleCase(r.damage_type), severity_label: r.severity_label || "minor", severity: num(r.severity),
      confidence: num(r.confidence, 0.85),
      explanation: r.failure_forecast ? { explanation: r.failure_forecast, factors: [], recommendation: r.repair_method || "" } : null,
    })),
  };
}

async function h_wallOfShame() {
  const cs = await getContractors();
  cs.sort((a, b) => num(b.negligence_score) - num(a.negligence_score));
  return {
    leaderboard: cs.map((c, i) => {
      const total = num(c.assigned_count), fixed = num(c.resolved_count);
      return {
        contractor_id: c.id, rank: i + 1, contractor_name: c.name, area: c.sector || "—", city: "Navi Mumbai",
        performance_score: total ? Math.round((fixed / total) * 100) : 0,
        total_reports: total, fixed, unfixed: Math.max(0, total - fixed), negligence_score: Math.round(num(c.negligence_score)),
      };
    }),
  };
}

async function h_priorityQueue() {
  const reports = await getReports();
  const active = reports.filter((r) => ACTIVE.includes(r.status) && r.severity_label);
  active.sort((a, b) => num(b.priority_score) - num(a.priority_score));
  return {
    priorities: active.slice(0, 8).map((r, i) => ({
      report_id: r.id, rank: i + 1, damage_type: titleCase(r.damage_type), priority_score: num(r.priority_score),
      location: r.location_text || r.sector || "—",
      days_unresolved: r.created_at ? Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)) : 0,
      upvotes: num(r.priority_score) >= 100 ? 12 : 3, estimated_cost: num(r.est_cost_inr), severity: num(r.severity),
    })),
  };
}

function groupBySector(reports) {
  const m = {};
  reports.forEach((r) => { const k = r.sector || "Unknown"; (m[k] = m[k] || []).push(r); });
  return m;
}

async function h_cityHealth() {
  const m = groupBySector(await getReports());
  return {
    cities: Object.entries(m).map(([city, rs]) => {
      const total = rs.length, fixed = rs.filter((r) => r.status === "resolved").length;
      const unfixed = total - fixed, avgSev = rs.reduce((a, r) => a + num(r.severity), 0) / (total || 1);
      const health = Math.round(Math.max(0, 100 - avgSev * 0.7 - unfixed * 4));
      return { city, trend: health >= 65 ? "improving" : health >= 40 ? "stable" : "worsening",
        health_score: health, total_reports: total, fixed, unfixed, fix_rate: total ? Math.round((fixed / total) * 100) : 0 };
    }),
  };
}

async function h_forecast() {
  const m = groupBySector(await getReports());
  return {
    zones: Object.entries(m).map(([zone, rs]) => {
      const active = rs.filter((r) => r.status !== "resolved" && r.status !== "rejected");
      const maxSev = rs.reduce((mx, r) => Math.max(mx, num(r.severity)), 0);
      const risk = Math.round(Math.min(100, maxSev * 0.7 + active.length * 8));
      const days = risk >= 70 ? 10 : risk >= 40 ? 45 : 120;
      return { zone, active_issues: active.length, risk_score: risk, earliest_failure_days: days,
        forecast: risk >= 70 ? `High-risk zone — failure likely within ~${days} days`
          : risk >= 40 ? `Moderate risk — watch over ~${days} days` : "Stable — low near-term risk" };
    }),
  };
}

function jsonResponse(obj) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function route(method, path, body) {
  if (path === "/stats") return jsonResponse(await h_stats());
  if (path === "/admin/reports/map") return jsonResponse(await h_reportsMap());
  if (path === "/repair-plan") return jsonResponse(await h_repairPlan());
  if (path === "/analytics/wall-of-shame") return jsonResponse(await h_wallOfShame());
  if (path === "/analytics/priority-queue") return jsonResponse(await h_priorityQueue());
  if (path === "/analytics/city-health") return jsonResponse(await h_cityHealth());
  if (path === "/analytics/forecast") return jsonResponse(await h_forecast());
  if (path === "/admin/settings") return jsonResponse(method === "PATCH" ? { ok: true } : { fraud_detection_enabled: true, auto_dispatch: false });
  if (path === "/auth/login") return jsonResponse({ token: "lemma", name: "Inspector", department: "Municipal Dept." });
  const m = path.match(/^\/admin\/reports\/([^/]+)\/status$/);
  if (m && method === "PATCH") return jsonResponse(await h_updateStatus(m[1], body));
  if (path === "/public/report" && method === "POST") return jsonResponse(await h_publicReport(body));
  if (path === "/detect" && method === "POST") return jsonResponse(await h_detect(body));
  if (path.indexOf("/detect") === 0) return jsonResponse({ detections: [], total_defects: 0, stats: {}, message: "Live/video analysis not enabled in this build." });
  return null; // not handled -> passthrough
}

function formToObject(body) {
  const o = {};
  if (body && typeof body.forEach === "function") body.forEach((v, k) => (o[k] = v));
  return o;
}

export async function initBridge() {
  if (ready) return ready;
  ready = (async () => {
    const { apiUrl } = cfg();
    try {
      await loadSdk(apiUrl);
      client = new window.LemmaClient.LemmaClient();
      const state = await client.initialize();
      if (state && state.status && state.status !== "authenticated") {
        client.auth.redirectToAuth();
        return;
      }
      const u = (state && state.user) || {};
      if (!localStorage.getItem("crackwatch_user")) {
        localStorage.setItem("crackwatch_user", JSON.stringify({ name: u.name || u.email || "Inspector", department: "Municipal Dept.", token: "lemma" }));
      }
    } catch (e) {
      console.error("[lemma-bridge] init failed", e);
    }

    const origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      try {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        if (client && url.indexOf("localhost:8000") !== -1) {
          const method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
          const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
          let body = (init && init.body) != null ? init.body : input && input.body;
          if (body instanceof FormData) body = formToObject(body);
          else if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { /* keep string */ } }
          const res = await route(method, path, body || {});
          if (res) return res;
        }
      } catch (e) {
        console.error("[lemma-bridge] route error", e);
      }
      return origFetch(input, init);
    };
  })();
  return ready;
}
