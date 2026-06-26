// Real in-browser YOLOv8 road-damage detection.
// onnxruntime-web is loaded from CDN at runtime (NOT bundled — keeps the build small),
// then runs best.onnx (Longitudinal/Transverse/Alligator Crack + Pothole) client-side.

const ORT_VER = "1.27.0";
const ORT_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ORT_VER + "/dist/";
const MODEL_URL = "https://raw.githubusercontent.com/SaudSatopay/crackwatch-lemma/main/models/best.onnx";
const INPUT = 640;
const DISPLAY = ["Longitudinal Crack", "Transverse Crack", "Alligator Crack", "Pothole"];
const KEY = ["longitudinal_crack", "transverse_crack", "alligator_crack", "pothole"];
const COLORS = ["#ff8b2c", "#ffa94d", "#ff4444", "#c83232"];

let ortPromise = null;
function loadOrt() {
  if (typeof window !== "undefined" && window.ort) return Promise.resolve(window.ort);
  if (!ortPromise) {
    ortPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = ORT_CDN + "ort.min.js";
      s.onload = () => {
        try {
          window.ort.env.wasm.wasmPaths = ORT_CDN;
          window.ort.env.wasm.numThreads = 1;
        } catch (e) {}
        resolve(window.ort);
      };
      s.onerror = () => reject(new Error("Failed to load onnxruntime-web from CDN"));
      document.head.appendChild(s);
    });
  }
  return ortPromise;
}

let sessionPromise = null;
async function getSession() {
  const ort = await loadOrt();
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
  }
  return sessionPromise;
}
export function warmup() { return getSession().catch(() => {}); }

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) return resolve(src);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  });
}

function preprocess(ort, img) {
  const ow = img.naturalWidth || img.width;
  const oh = img.naturalHeight || img.height;
  const scale = Math.min(INPUT / ow, INPUT / oh);
  const nw = Math.round(ow * scale), nh = Math.round(oh * scale);
  const padX = Math.floor((INPUT - nw) / 2), padY = Math.floor((INPUT - nh) / 2);
  const cv = document.createElement("canvas");
  cv.width = INPUT; cv.height = INPUT;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, INPUT, INPUT);
  ctx.drawImage(img, padX, padY, nw, nh);
  const { data } = ctx.getImageData(0, 0, INPUT, INPUT);
  const area = INPUT * INPUT;
  const f = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    f[i] = data[i * 4] / 255;
    f[area + i] = data[i * 4 + 1] / 255;
    f[2 * area + i] = data[i * 4 + 2] / 255;
  }
  return { tensor: new ort.Tensor("float32", f, [1, 3, INPUT, INPUT]), scale, padX, padY, ow, oh };
}

function iou(a, b) {
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]), y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
  return inter / (ua + 1e-6);
}
function nms(dets, thr = 0.45) {
  dets.sort((p, q) => q.confidence - p.confidence);
  const keep = [];
  for (const d of dets) if (keep.every((k) => iou(k.bbox, d.bbox) < thr)) keep.push(d);
  return keep.slice(0, 20);
}

export async function detectImage(src, confThr = 0.3) {
  const ort = await loadOrt();
  const session = await getSession();
  const img = await loadImage(src);
  const { tensor, scale, padX, padY, ow, oh } = preprocess(ort, img);
  const feeds = {}; feeds[session.inputNames[0]] = tensor;
  const out = await session.run(feeds);
  const o = out[session.outputNames[0]];
  const ch = o.dims[1], anchors = o.dims[2], nc = ch - 4, d = o.data;
  const raw = [];
  for (let i = 0; i < anchors; i++) {
    let best = 0, bestScore = d[4 * anchors + i];
    for (let c = 1; c < nc; c++) {
      const s = d[(4 + c) * anchors + i];
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (bestScore < confThr) continue;
    const cx = d[i], cy = d[anchors + i], w = d[2 * anchors + i], h = d[3 * anchors + i];
    let x1 = (cx - w / 2 - padX) / scale, y1 = (cy - h / 2 - padY) / scale;
    let x2 = (cx + w / 2 - padX) / scale, y2 = (cy + h / 2 - padY) / scale;
    x1 = Math.max(0, Math.min(ow, x1)); y1 = Math.max(0, Math.min(oh, y1));
    x2 = Math.max(0, Math.min(ow, x2)); y2 = Math.max(0, Math.min(oh, y2));
    if (x2 - x1 < 2 || y2 - y1 < 2) continue;
    raw.push({ bbox: [x1, y1, x2, y2], confidence: bestScore, class_id: best, class_name: KEY[best], display_name: DISPLAY[best] });
  }
  return { detections: nms(raw), width: ow, height: oh, image: img };
}

export function drawDetections(img, detections) {
  const ow = img.naturalWidth || img.width, oh = img.naturalHeight || img.height;
  const cv = document.createElement("canvas");
  cv.width = ow; cv.height = oh;
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0, ow, oh);
  const fs = Math.max(13, Math.round(ow / 42));
  ctx.lineWidth = Math.max(2, ow / 320);
  ctx.font = `bold ${fs}px sans-serif`;
  ctx.textBaseline = "bottom";
  for (const dt of detections) {
    const [x1, y1, x2, y2] = dt.bbox;
    const color = COLORS[dt.class_id] || "#00e5cc";
    ctx.strokeStyle = color;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    const label = `${dt.display_name} ${(dt.confidence * 100).toFixed(0)}%`;
    const tw = ctx.measureText(label).width;
    const ly = Math.max(fs + 4, y1);
    ctx.fillStyle = color;
    ctx.fillRect(x1, ly - fs - 4, tw + 10, fs + 6);
    ctx.fillStyle = "#000";
    ctx.fillText(label, x1 + 5, ly);
  }
  return cv.toDataURL("image/jpeg", 0.85);
}
