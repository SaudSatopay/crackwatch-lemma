# CrackWatch *on* Lemma — Gappy AI Hackathon submission

**One-liner:** A civic infrastructure-damage platform where citizens report road damage from their phone and a government command center triages, prices, and dispatches repairs — with the **entire backend (database + AI agent runtime + workflow engine + RAG + auth + event triggers) replaced by a single open-source [Lemma](https://lemma.work) pod**, behind a React UI that didn't change a line.

**Live:**
- 📱 Citizen app — **https://citizen-app.apps.lemma.work**
- 🖥️ Government console — **https://govt-console.apps.lemma.work**
- 💾 Code — **https://github.com/SaudSatopay/crackwatch-lemma**

---

## The problem

Potholes and cracked roads cause crashes, vehicle damage, and flooding — and the reporting loop is broken on both ends. Citizens have no fast, satisfying way to report damage and see it fixed. Governments drown in unstructured complaints with no triage, no cost forecasting, and no contractor accountability. The result: the worst hazards sit unrepaired while cheap fixes balloon into expensive ones.

## The solution

CrackWatch closes that loop with two surfaces over **one shared pod**:

1. **Citizen app (mobile PWA).** Snap a photo of a pothole or crack. A **real YOLOv8 model runs in the browser** (onnxruntime-web), draws boxes with confidence, and scores each defect against an engineering severity/cost rubric. The report lands in the pod instantly — and the citizen earns **XP, civic coins, streaks, and badges**, climbing a civic leaderboard. A live map shows every report's status; a "safe route" mode routes drivers *around* unrepaired hazards.

2. **Government console.** Inspectors see every report on a live map, ranked by a prioritized repair plan with **repair cost vs. cost-if-ignored** (so delay has a price tag), approve critical dispatches (human-in-the-loop), and watch a contractor **"wall of shame"** scored by negligence.

Both surfaces read and write the **same pod state** — a citizen's report appears in the government queue in real time, and a dispatch updates the citizen's map. Humans and AI operate on one source of truth.

> **The point of Lemma:** the original CrackWatch ran a FastAPI + in-memory backend. This version **deletes that backend entirely** and replaces it with one pod. The React frontends are reused unchanged; a thin `fetch` bridge ([`lemma-bridge.js`](console/src/lib/lemma-bridge.js)) points every legacy REST call at the pod.

---

## How Lemma is used

CrackWatch uses **ten** Lemma primitives doing real work — not one bolted on:

| Lemma primitive | Where | What it does |
|---|---|---|
| **📊 Tables** (shared, RLS-off) | `reports`, `contractors`, `report_events`, **`profiles`** | Durable, typed civic state + the gamification ledger every surface shares |
| **🤖 Agent** | `damage-triage` | Classifies damage type + scores severity 0–100, with a scoped instruction + grants |
| **📚 Files + built-in RAG** | `/knowledge` severity/cost rubric | The agent **grounds** its scoring on a real rubric — the pod *is* the vector store |
| **⚙️ Functions** (Python) | `score_report`, `dispatch_repair` | Deterministic INR cost engine + coordinated multi-table writes |
| **🔀 Workflow** | `report-intake` | `AGENT → FUNCTION → DECISION → FORM → FUNCTION`, with a **human-approval** step |
| **⏰ Schedule / trigger** | `on-new-report` | A `DATASTORE` INSERT event on `reports` fires the workflow |
| **🔐 Permissions** | grants on every agent + function | Least-privilege: each workload touches only the tables it needs |
| **🪟 Apps** | `citizen-app`, `govt-console`, `command-center` | Both product UIs, deployed and served *by the pod* |
| **🧩 SDK + auth** | `lemma-bridge.js` in each app | `records.list/create/update` + delegated auth backing the unchanged React UIs |
| **🎮 Gamification** | `profiles` + bridge engine | XP/coins/streaks/badges/leaderboard/AI-challenge, all persisted in the pod |

### Why this is *meaningful* Lemma use, not a wrapper

- **Bring-your-own-frontend.** The entire legacy REST surface of two separate apps — `/stats`, `/admin/reports/map`, `/public/report`, `/gamification/*`, `/detect`, `/repair-plan`, `/analytics/*` — is served from the pod by bridge files. The React apps didn't change a line.
- **Built-in RAG, zero infra.** The triage agent searches `/knowledge` for the rubric and grounds its scores on it. No Pinecone, no embeddings pipeline.
- **Human-in-the-loop, natively.** Critical repairs pause at a workflow **FORM** assigned to an inspector and resume on their decision.
- **Shared state across humans + AI.** A citizen, an inspector, an agent, and a scheduled job all read and write the same four tables. The gamification ledger lives there too — the leaderboard is a `records.list` query, not a separate service.
- **Real CV on the edge.** YOLOv8 runs *in the browser* via onnxruntime-web; the pod stores the structured result. No GPU backend to host.

### What we did **not** have to build

~~PostgreSQL~~ · ~~a vector DB~~ · ~~an LLM agent runtime + tool loop~~ · ~~a workflow/approval engine~~ · ~~an auth layer~~ · ~~webhook/event plumbing~~ · ~~a gamification service~~

All of it is **one pod**.

---

## Tech

Lemma SDK · React 19 · Vite 8 (single-file build) · Tailwind v4 · YOLOv8 + onnxruntime-web · Leaflet · Framer Motion · Python (pod functions)

<sub>Built for the **Gappy AI Hackathon** · June 2026 · by Saud Satopay</sub>
