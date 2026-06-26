import { detectImage, drawDetections, warmup } from "./yolo.js";

// CrackWatch Citizen — Lemma bridge.
//
// The citizen PWA calls fetch(`${API_URL}/...`) with API_URL = http://localhost:8000.
// We load Lemma's browser SDK, patch window.fetch to intercept those calls, and answer
// them from the pod's tables + REAL in-browser YOLOv8 (yolo.js) — so every page component
// stays byte-for-byte unchanged, but the data is live from Lemma. Gamification (XP, coins,
// streaks, badges, leaderboard, AI-challenge) is backed by the pod's `profiles` table.

const KNOWN_API_BASE = "https://api.lemma.work";
const KNOWN_POD_ID = "019f0086-72a4-737f-9c72-0f7e9e831819";
const CITY_CENTER = [19.035, 73.035]; // Navi Mumbai — matches the map's default center

let client = null;
let ready = null;
// in-memory cache of CV output keyed by created report id, for the immediate
// `GET /public/reports/{id}` follow-up the Report page makes after submitting.
const reportCache = new Map();

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
const inr = (n) => "₹" + Math.round(num(n)).toLocaleString("en-IN");
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

function lemmaStatusToMap(s) {
  if (s === "resolved") return "fixed";
  if (s === "dispatched") return "in_progress";
  if (s === "pending_approval") return "acknowledged";
  return "submitted"; // new, triaged, rejected
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

const WARD = { road: "Ward 7", building: "Ward 3", pipeline: "Ward 12", bridge: "Ward 7" };

// ---- scoring rubric (mirrors the pod's severity/cost engine) ----
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
const TYPE_WEIGHT = { pothole: 1.0, alligator_crack: 1.0, longitudinal_crack: 0.7, transverse_crack: 0.75, spalling: 0.5, corrosion: 0.6, leak: 0.9, building_crack: 0.85, pipe_damage: 0.95, other: 0.5 };
const FORECAST = { critical: "Critical — failure likely within days to ~6 weeks if unrepaired.", warning: "Warning — will worsen over ~2-6 months if untreated.", minor: "Minor — slow degradation over 6-12 months." };

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
    failure_forecast: FORECAST[label],
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

function scoreDetection(dt, areaRatio, density) {
  const tw = TYPE_WEIGHT[dt.class_name] != null ? TYPE_WEIGHT[dt.class_name] : 0.7;
  const raw = 0.30 * Math.min(areaRatio * 50, 1) + 0.25 * dt.confidence + 0.20 * density + 0.25 * tw;
  const sev = Math.round(Math.min(raw * 100, 100));
  const label = sev >= 70 ? "critical" : sev >= 40 ? "warning" : "minor";
  const band = (QT_COSTS[dt.class_name] || QT_COSTS.longitudinal_crack)[label];
  const areaPct = +(areaRatio * 100).toFixed(1);
  const est = Math.round(((band[0] + band[1]) / 2) * (1 + (areaPct / 100) * 2));
  const ign = Math.round(est * (label === "critical" ? 6 : label === "warning" ? 4 : 3));
  return {
    id: 0, class_name: dt.display_name, display_name: dt.display_name,
    severity: sev, severity_label: label, confidence: dt.confidence, area_ratio: areaPct, bbox: dt.bbox,
    cost: { cost_estimated: est, repair_method: band[2], repair_time: band[3], cost_if_ignored: ign, savings_if_fixed_now: Math.max(0, ign - est) },
    urgency_score: label === "critical" ? 100 : label === "warning" ? 60 : 20, priority_rank: 1,
    explanation: { explanation: FORECAST[label], recommendation: band[2] },
    category: dt.class_name, risk: label, repair: band[2], crew_size: band[4],
  };
}

// ============================ GAMIFICATION ============================
const ACHIEVEMENTS = {
  first_report: { name: "🕵️ First Report", desc: "Submit your first damage report", xp: 50, coins: 10 },
  five_reports: { name: "📸 Scout", desc: "Submit 5 reports", xp: 100, coins: 25 },
  ten_reports: { name: "🔥 Road Warrior", desc: "Submit 10 reports", xp: 250, coins: 50 },
  twenty_five_reports: { name: "🛠️ Civic Hero", desc: "Submit 25 reports", xp: 500, coins: 100 },
  fifty_reports: { name: "🌍 City Saver", desc: "Submit 50 reports", xp: 1000, coins: 250 },
  fast_reporter: { name: "⚡ Fast Reporter", desc: "Submit 3 reports in 1 hour", xp: 150, coins: 30 },
  streak_3: { name: "🔥 3-Day Streak", desc: "Report 3 days in a row", xp: 100, coins: 20 },
  streak_7: { name: "🔥🔥 Week Warrior", desc: "Report 7 days in a row", xp: 300, coins: 75 },
  streak_30: { name: "🔥🔥🔥 Legend", desc: "Report 30 days in a row", xp: 1000, coins: 300 },
  verifier: { name: "✅ Verifier", desc: "Verify 5 community reports", xp: 100, coins: 20 },
  critical_finder: { name: "🚨 Critical Finder", desc: "Report a critical severity damage", xp: 200, coins: 40 },
  multi_sector: { name: "🔍 Inspector", desc: "Report in 3 different sectors", xp: 150, coins: 30 },
  ai_challenger: { name: "🤖 AI Master", desc: "Score 80%+ in AI Challenge Mode", xp: 200, coins: 50 },
};
const DAILY_CHALLENGES = [
  { id: "daily_5", name: "Report 5 potholes today", target: 5, type: "reports", xp: 100, coins: 20 },
  { id: "daily_3loc", name: "Scan 3 different locations", target: 3, type: "locations", xp: 75, coins: 15 },
  { id: "daily_worst", name: "Find a critical severity road", target: 1, type: "critical", xp: 150, coins: 30 },
  { id: "daily_verify", name: "Verify 3 community reports", target: 3, type: "verifications", xp: 75, coins: 15 },
  { id: "daily_streak", name: "Maintain your reporting streak", target: 1, type: "streak", xp: 50, coins: 10 },
];
const POINT_VALUES = { valid_critical: 15, valid_warning: 10, valid_minor: 5, false_report: -5, streak_bonus: 5, ai_challenge_correct: 10, ai_challenge_wrong: -2, verification: 3 };
const AI_SCENARIOS = [
  { image_desc: "Cracked road surface with interconnected pattern", answer: "Alligator Crack", severity: "critical" },
  { image_desc: "Small round hole in road surface", answer: "Pothole", severity: "warning" },
  { image_desc: "Long straight crack along the road", answer: "Longitudinal Crack", severity: "moderate" },
  { image_desc: "Crack running across the road width", answer: "Transverse Crack", severity: "moderate" },
  { image_desc: "Smooth road with no visible damage", answer: "Safe", severity: "none" },
  { image_desc: "Concrete surface flaking and peeling", answer: "Surface Spalling", severity: "warning" },
  { image_desc: "Orange/brown staining on metal bridge surface", answer: "Corrosion", severity: "moderate" },
  { image_desc: "Water pooling through road crack", answer: "Water Leak", severity: "warning" },
];
const AI_OPTIONS = ["Pothole", "Alligator Crack", "Longitudinal Crack", "Transverse Crack", "Safe", "Surface Spalling", "Corrosion", "Water Leak"];

const calculateLevel = (xp) => Math.max(1, Math.floor(Math.sqrt(num(xp) / 100)) + 1);
const asArr = (v) => (Array.isArray(v) ? v : typeof v === "string" ? (() => { try { return JSON.parse(v) || []; } catch (e) { return []; } })() : []);

function normalizeProfile(p) {
  return { ...p, achievements: asArr(p.achievements), sectors_reported: asArr(p.sectors_reported), recent_reports: asArr(p.recent_reports) };
}

function currentUserKey() {
  try {
    const c = JSON.parse(localStorage.getItem("crackwatch_citizen") || "null");
    if (c && c.name) return String(c.name);
  } catch (e) {}
  return "Citizen";
}

async function listProfiles() {
  const res = await client.records.list("profiles", { limit: 300 });
  return ((res && res.items) || []).map(normalizeProfile);
}

async function getOrCreateProfile(userKey, name) {
  const all = await listProfiles();
  const found = all.find((p) => p.user_key === userKey);
  if (found) return found;
  const created = await client.records.create("profiles", {
    user_key: userKey, name: name || userKey, xp: 0, coins: 50, level: 1, streak_days: 0,
    total_reports: 0, total_points: 0, verifications: 0, ai_challenge_score: 0, ai_challenges_played: 0,
    achievements: [], sectors_reported: [], recent_reports: [],
  });
  return normalizeProfile(created);
}

// Award XP/coins for a report, update streak, check achievements; persist to the pod.
async function awardPoints(profile, detections, sector) {
  const now = Date.now();
  let points = 0, hasCritical = false;
  for (const det of detections) {
    const sev = det.severity_label || "minor";
    if (sev === "critical") { points += POINT_VALUES.valid_critical; hasCritical = true; }
    else if (sev === "warning") points += POINT_VALUES.valid_warning;
    else points += POINT_VALUES.valid_minor;
  }
  if (!detections.length) points += POINT_VALUES.false_report;

  let xpEarned = Math.max(0, points * 5);
  const coinsEarned = Math.max(0, Math.floor(points / 2));

  let xp = num(profile.xp) + xpEarned;
  let coins = num(profile.coins) + coinsEarned;
  const totalReports = num(profile.total_reports) + 1;
  const totalPoints = num(profile.total_points) + points;

  const sectors = profile.sectors_reported.slice();
  if (sector && !sectors.includes(sector)) sectors.push(sector);

  const recent = profile.recent_reports.filter((t) => t > now - 3600000);
  recent.push(now);

  // ── streak ──
  let streak = num(profile.streak_days);
  let lastDate = profile.last_report_date || null;
  const today = ymd(new Date());
  if (lastDate !== today) {
    const yesterday = ymd(new Date(now - 86400000));
    if (lastDate) streak = lastDate === yesterday ? streak + 1 : 1;
    else streak = 1;
    if (lastDate === yesterday) { const bonus = POINT_VALUES.streak_bonus * streak; xpEarned += bonus; xp += bonus; }
    lastDate = today;
  }

  // ── achievements ──
  const earned = new Set(profile.achievements);
  const newAchievements = [];
  const checks = [
    [totalReports >= 1, "first_report"], [totalReports >= 5, "five_reports"], [totalReports >= 10, "ten_reports"],
    [totalReports >= 25, "twenty_five_reports"], [totalReports >= 50, "fifty_reports"],
    [hasCritical, "critical_finder"],
    [streak >= 3, "streak_3"], [streak >= 7, "streak_7"], [streak >= 30, "streak_30"],
    [num(profile.verifications) >= 5, "verifier"],
    [sectors.length >= 3, "multi_sector"],
    [recent.length >= 3, "fast_reporter"],
  ];
  const achievements = profile.achievements.slice();
  for (const [cond, id] of checks) {
    if (cond && !earned.has(id)) {
      achievements.push(id); earned.add(id);
      const a = ACHIEVEMENTS[id];
      xp += a.xp; coins += a.coins;
      newAchievements.push({ id, ...a });
    }
  }
  const level = calculateLevel(xp);

  try {
    await client.records.update("profiles", profile.id, {
      xp, coins, level, streak_days: streak, last_report_date: lastDate,
      total_reports: totalReports, total_points: totalPoints,
      achievements, sectors_reported: sectors, recent_reports: recent,
    });
  } catch (e) { console.error("[lemma-bridge] profile update", e); }

  return {
    points_earned: points, xp_earned: xpEarned, coins_earned: coinsEarned,
    new_achievements: newAchievements, streak_days: streak, level, total_xp: xp, total_coins: coins,
  };
}

// ---------- data helpers ----------
async function getReports() {
  const res = await client.records.list("reports", { limit: 300 });
  return (res && res.items) || [];
}

function citizenReportRow(r) {
  const [lat, lng] = coordsFor(r);
  const c = reportCache.get(String(r.id));
  return {
    id: r.id, latitude: lat, longitude: lng,
    status: lemmaStatusToMap(r.status),
    damage_type: titleCase(r.damage_type) || "Unclassified",
    location_name: r.location_text || r.sector || "Unknown location",
    timestamp: r.created_at, description: r.description || "",
    reporter: r.reporter_contact || (r.reporter_channel ? titleCase(r.reporter_channel) + " user" : "Citizen"),
    upvotes: num(r.priority_score) >= 100 ? 12 : num(r.priority_score) >= 60 ? 5 : 1,
    severity: num(r.severity), cost_estimated: num(r.est_cost_inr),
    repair_method: r.repair_method || "", annotated_image: c ? c.annotated_image : null,
    defect_count: 1,
  };
}

// ============================ ENDPOINT HANDLERS ============================
async function h_auth(kind, body) {
  const name = String((kind === "login" ? body.username : body.name) || body.name || body.username || "Citizen").trim() || "Citizen";
  try { await getOrCreateProfile(name, name); } catch (e) { console.error("[lemma-bridge] auth profile", e); }
  return { name, role: "citizen", token: "lemma", department: "Citizen" };
}

async function h_reportsMap() {
  return { reports: (await getReports()).map(citizenReportRow) };
}

async function h_reportDetail(id) {
  const c = reportCache.get(String(id));
  if (c) return { id, annotated_image: c.annotated_image, detections: c.detections, stats: c.stats };
  // cache miss (e.g. older report) — return what we can from the stored record
  const r = (await getReports()).find((x) => String(x.id) === String(id));
  if (!r) return { id, annotated_image: null, detections: [], stats: {} };
  return { id, annotated_image: null, detections: [], stats: { total_defects: 1 }, severity: num(r.severity), damage_type: titleCase(r.damage_type) };
}

async function h_publicReport(body) {
  const sec = String(body.sector || "road").toLowerCase();
  const desc = body.description || "Citizen-reported road damage.";
  const ward = WARD[sec] || "Ward 7";
  const userKey = currentUserKey();
  const locText = body.location_name || (body.latitude != null ? `(${Number(body.latitude).toFixed(4)}, ${Number(body.longitude).toFixed(4)})` : "Citizen report");
  const file = body.file;
  const hasImage = file && file.type && file.type.indexOf("image") === 0;

  let scored = [], annotated = null, maxConf = 0, tri = null;

  if (hasImage) {
    let res = null;
    try { res = await detectImage(file, 0.30); }
    catch (e) { console.error("[lemma-bridge] yolo", e); return { error: true, message: "CV failed: " + (e && e.message) }; }
    const imgArea = (res.width * res.height) || 1;
    const density = Math.min(res.detections.length / 10, 1);
    scored = res.detections
      .map((dt) => scoreDetection(dt, (((dt.bbox[2] - dt.bbox[0]) * (dt.bbox[3] - dt.bbox[1])) / imgArea), density))
      .sort((a, b) => b.severity - a.severity)
      .map((s, i) => ({ ...s, id: i + 1, priority_rank: i + 1 }));
    maxConf = res.detections.reduce((m, d) => Math.max(m, d.confidence), 0);
    try { annotated = drawDetections(res.image, res.detections).split(",")[1]; } catch (e) {}

    // No damage found in the photo → friendly no_damage screen (no report, no points).
    if (!scored.length) {
      return {
        status: "no_damage",
        message: "Our AI didn't find significant road damage in this photo.",
        annotated_image: annotated, max_confidence: maxConf || 0,
        hint: "Get closer and make sure the crack or pothole fills more of the frame, in good light.",
      };
    }
    tri = {
      damage_type: scored[0].category, severity: scored[0].severity, severity_label: scored[0].severity_label,
      area_ratio: scored[0].area_ratio, confidence: scored[0].confidence, est_cost_inr: scored[0].cost.cost_estimated,
      cost_if_ignored_inr: scored[0].cost.cost_if_ignored, repair_method: scored[0].cost.repair_method,
      repair_eta: scored[0].cost.repair_time, crew_size: scored[0].crew_size,
      priority_score: scored[0].urgency_score, failure_forecast: FORECAST[scored[0].severity_label],
    };
  } else {
    // No image → triage from the description text.
    tri = quickTriage(desc, sec);
  }

  const title = hasImage ? "Field report — " + scored[0].display_name : desc.slice(0, 80);
  const payload = reportFromTriage(title, desc, ward, locText, userKey, tri);
  if (body.latitude != null) payload.lat = Number(body.latitude);
  if (body.longitude != null) payload.lng = Number(body.longitude);

  let rec = null;
  try { rec = await client.records.create("reports", payload); }
  catch (e) { console.error("[lemma-bridge] report create", e); }
  const id = rec && rec.id;

  // gamification — credit the LOGGED-IN citizen (not the page's hardcoded "Citizen")
  let gamification = null;
  try {
    const profile = await getOrCreateProfile(userKey, userKey);
    gamification = await awardPoints(profile, hasImage ? scored : [{ severity_label: tri.severity_label }], sec);
  } catch (e) { console.error("[lemma-bridge] award", e); }

  const crit = scored.filter((s) => s.severity_label === "critical").length;
  const warn = scored.filter((s) => s.severity_label === "warning").length;
  const minor = scored.length - crit - warn;
  const trust = Math.min(99, 60 + Math.round((maxConf || 0.65) * 39));
  const stats = { critical_count: crit, warning_count: warn, minor_count: Math.max(0, minor), total_defects: scored.length };

  if (id) reportCache.set(String(id), { annotated_image: annotated, detections: scored, stats });

  return {
    ok: true, id, status: "submitted",
    detections: scored, annotated_image: annotated,
    severity_summary: { critical: crit, warning: warn || (!hasImage && tri.severity_label === "warning" ? 1 : 0), minor: minor < 0 ? 0 : minor },
    trust_score: trust, stats, gamification,
  };
}

async function h_stats() {
  const reports = await getReports();
  const total = reports.length;
  const fixed = reports.filter((r) => r.status === "resolved").length;
  const inProgress = reports.filter((r) => r.status === "dispatched").length;
  const acknowledged = reports.filter((r) => r.status === "pending_approval").length;
  const pending = Math.max(0, total - fixed - inProgress - acknowledged);
  const perf = total ? Math.round(((fixed + 0.5 * (inProgress + acknowledged)) / total) * 100) : 0;
  const cost = reports.filter((r) => r.status !== "resolved").reduce((a, r) => a + num(r.est_cost_inr), 0);
  return {
    total_reports: total, fixed, in_progress: inProgress, acknowledged, pending,
    performance_score: perf, total_estimated_cost: cost, total_estimated_cost_formatted: inr(cost),
  };
}

async function h_gamProfile(userKey) {
  const p = await getOrCreateProfile(userKey, userKey);
  const level = calculateLevel(p.xp);
  return {
    user_id: p.user_key, name: p.name || p.user_key, xp: num(p.xp), coins: num(p.coins), level,
    total_reports: num(p.total_reports), total_points: num(p.total_points), streak_days: num(p.streak_days),
    achievements: p.achievements, sectors_reported: p.sectors_reported, verifications: num(p.verifications),
    xp_to_next_level: level * level * 100,
    achievements_detail: p.achievements.map((a) => ACHIEVEMENTS[a]).filter(Boolean),
  };
}

async function h_leaderboard() {
  const profiles = (await listProfiles()).sort((a, b) => num(b.xp) - num(a.xp));
  return {
    leaderboard: profiles.slice(0, 20).map((p, i) => ({
      rank: i + 1, name: p.name || p.user_key, xp: num(p.xp), level: calculateLevel(p.xp), coins: num(p.coins),
      total_reports: num(p.total_reports), streak_days: num(p.streak_days), achievements_count: p.achievements.length,
      top_achievement: p.achievements.length ? (ACHIEVEMENTS[p.achievements[p.achievements.length - 1]] || {}).name : null,
    })),
  };
}

async function h_challenges(userKey) {
  const p = await getOrCreateProfile(userKey, userKey);
  const reports = await getReports();
  const today = ymd(new Date());
  const mine = reports.filter((r) => r.reporter_contact === userKey && r.created_at && ymd(new Date(r.created_at)) === today);
  const reportsToday = mine.length;
  const criticalToday = mine.some((r) => r.severity_label === "critical") ? 1 : 0;
  const sectorsToday = new Set(mine.map((r) => r.sector)).size;

  const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
  const start = doy % DAILY_CHALLENGES.length;
  const chosen = [0, 1, 2].map((k) => DAILY_CHALLENGES[(start + k) % DAILY_CHALLENGES.length]);

  return {
    challenges: chosen.map((c) => {
      let progress = 0;
      if (c.type === "reports") progress = Math.min(reportsToday, c.target);
      else if (c.type === "locations") progress = Math.min(sectorsToday, c.target);
      else if (c.type === "critical") progress = Math.min(criticalToday, c.target);
      else if (c.type === "verifications") progress = Math.min(num(p.verifications), c.target);
      else if (c.type === "streak") progress = num(p.streak_days) > 0 ? 1 : 0;
      return { ...c, progress, completed: progress >= c.target };
    }),
  };
}

function h_achievements() {
  return { achievements: Object.entries(ACHIEVEMENTS).map(([id, a]) => ({ id, ...a })) };
}

function h_aiChallenge() {
  const r = AI_SCENARIOS[Math.floor(Math.random() * AI_SCENARIOS.length)];
  const wrong = AI_OPTIONS.filter((o) => o !== r.answer).sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [r.answer, ...wrong].sort(() => Math.random() - 0.5);
  return { scenario: r.image_desc, correct_answer: r.answer, severity: r.severity, options };
}

async function h_aiAnswer(body) {
  const userKey = body.user_id || currentUserKey();
  const correct = body.answer === body.correct_answer;
  const p = await getOrCreateProfile(userKey, userKey);
  let xp = num(p.xp), coins = num(p.coins);
  let score = num(p.ai_challenge_score), played = num(p.ai_challenges_played) + 1;
  if (correct) { xp += POINT_VALUES.ai_challenge_correct * 5; coins += POINT_VALUES.ai_challenge_correct; score += 1; }
  else { xp = Math.max(0, xp + POINT_VALUES.ai_challenge_wrong * 5); coins = Math.max(0, coins + POINT_VALUES.ai_challenge_wrong); }
  const accuracy = played ? Math.round((score / played) * 1000) / 10 : 0;
  const achievements = p.achievements.slice();
  if (accuracy >= 80 && played >= 5 && !achievements.includes("ai_challenger")) achievements.push("ai_challenger");
  try {
    await client.records.update("profiles", p.id, {
      xp, coins, level: calculateLevel(xp), ai_challenge_score: score, ai_challenges_played: played, achievements,
    });
  } catch (e) { console.error("[lemma-bridge] ai answer", e); }
  return { correct, correct_answer: body.correct_answer, points: correct ? POINT_VALUES.ai_challenge_correct : POINT_VALUES.ai_challenge_wrong, accuracy, total_played: played };
}

function jsonResponse(obj) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function route(method, path, body) {
  // auth
  if (path === "/auth/register" && method === "POST") return jsonResponse(await h_auth("register", body));
  if (path === "/auth/login" && method === "POST") return jsonResponse(await h_auth("login", body));

  // reports + map
  if (path === "/public/report" && method === "POST") return jsonResponse(await h_publicReport(body));
  if (path === "/public/reports/map/detail" || path === "/public/reports/map") return jsonResponse(await h_reportsMap());
  if (path === "/public/stats") return jsonResponse(await h_stats());
  let m = path.match(/^\/public\/reports\/([^/]+)\/upvote$/);
  if (m && method === "POST") return jsonResponse({ ok: true, id: m[1] });
  m = path.match(/^\/public\/reports\/([^/]+)$/);
  if (m) return jsonResponse(await h_reportDetail(m[1]));

  // gamification
  if (path === "/gamification/leaderboard") return jsonResponse(await h_leaderboard());
  if (path === "/gamification/achievements") return jsonResponse(h_achievements());
  if (path === "/gamification/ai-challenge") return jsonResponse(h_aiChallenge());
  if (path === "/gamification/ai-challenge/answer" && method === "POST") return jsonResponse(await h_aiAnswer(body));
  m = path.match(/^\/gamification\/profile\/(.+)$/);
  if (m) return jsonResponse(await h_gamProfile(decodeURIComponent(m[1])));
  m = path.match(/^\/gamification\/challenges\/(.+)$/);
  if (m) return jsonResponse(await h_challenges(decodeURIComponent(m[1])));

  // live/video scanning — not enabled in this build (graceful stub)
  if (path.indexOf("/detect") === 0) {
    if (path.indexOf("/video") !== -1) return jsonResponse({ video_info: { frames_analyzed: 0 }, total_detections: 0, processing_time_ms: 0, frame_results: [], message: "Video analysis not enabled in this build." });
    return jsonResponse({ detection_count: 0, detections: [], inference_time_ms: 0, annotated_image: null, message: "Live scanning not enabled in this build." });
  }

  return null; // not handled -> passthrough to the network
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
    } catch (e) {
      console.error("[lemma-bridge] init failed", e);
    }

    try { warmup(); } catch (e) { /* preload the YOLO model in the background */ }

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
