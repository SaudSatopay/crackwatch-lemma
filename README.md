# CrackWatch on Lemma

**AI-native civic infrastructure-damage command center — rebuilt on the [Lemma SDK](https://lemma.work) for the Gappy AI Hackathon.**

Citizens report infrastructure damage (potholes, cracks, leaks). CrackWatch triages each report with AI, estimates the repair cost **and the cost of ignoring it**, routes critical cases to a human inspector for approval, dispatches the repair to an accountable contractor, and tracks every contractor's negligence on a public "wall of shame."

The original CrackWatch ran a React UI on a FastAPI + in-memory backend with a YOLO CV model. **This version deletes that entire backend and replaces it with one Lemma pod** — structured tables, an AI triage agent (grounded on an engineering rubric via built-in RAG), deterministic cost-engine functions, a human-in-the-loop approval workflow, and event triggers. The original React command-center UI is reused **unchanged**, wired to the pod through a thin `fetch` bridge.

> **The point of Lemma:** keep your frontend; replace the database + agent runtime + workflow engine + RAG + auth + triggers you'd otherwise stitch together with a single open-source pod where humans and AI agents operate the same state.

## The agentic loop

```
report (citizen map submission / field scan / API)
        │   ▼  DATASTORE trigger
   damage-triage agent ──grounds on──▶  /knowledge rubric  (built-in RAG)
        │   classifies damage_type + severity (0–100)
        ▼
   score_report function ──▶  repair cost · cost-if-ignored (×3/×4/×6) · priority
        ▼
   DECISION: critical?
     ├─ yes ─▶  inspector APPROVAL  (workflow FORM — human in the loop)
     │            └─▶  dispatch_repair ──▶  assign contractor by sector + audit event
     └─ no  ─▶  auto-dispatch
```

Every step runs on Lemma: the agent, the functions, the workflow, the approval, and the trigger.

## Repository layout

| Path | What it is |
|------|------------|
| **`pod/`** | The Lemma pod bundle — the entire backend, as portable files |
| `pod/tables/` | `reports`, `contractors`, `report_events` — typed, shared, queryable |
| `pod/agents/damage-triage/` | The AI triage agent (instruction + scoped grants) |
| `pod/functions/` | `score_report` (ported INR cost engine), `dispatch_repair` (assignment + audit) |
| `pod/workflows/report-intake/` | triage → score → **human approval** → dispatch graph |
| `pod/schedules/on-new-report/` | fires the workflow on each new report (DATASTORE event) |
| `pod/files/knowledge/` + `pod/seed/knowledge/` | the severity & repair-cost rubric (RAG source) |
| `pod/apps/` | `govt-console` (the React UI) + `command-center` (a lightweight HTML board) |
| `pod/DESIGN.md` | the pod design note |
| **`console/`** | The React command-center frontend (the product UI) |
| `console/src/lib/lemma-bridge.js` | **the integration** — intercepts the UI's `fetch` calls and serves them from the pod |

## How it's wired — the bridge

The React components call a legacy REST API (`/stats`, `/admin/reports/map`, `/repair-plan`, `/analytics/wall-of-shame`, `/detect`, …). Instead of running that backend, [`console/src/lib/lemma-bridge.js`](console/src/lib/lemma-bridge.js) loads the Lemma browser SDK, patches `window.fetch`, and maps each of those endpoints onto the pod's tables/records — so **every UI component stays byte-for-byte unchanged**, but its data is live from Lemma.

## Run it

**Prerequisites:** the [Lemma CLI](https://lemma.work) (`uv tool install lemma-terminal`), Node 20+, and a Lemma account (`lemma auth login`).

### 1. Deploy the pod
```bash
lemma orgs create "CrackWatch"
lemma pods create crackwatch --org <org-id>
lemma pods import ./pod --pod crackwatch
bash pod/seed/seed.sh                 # sample contractors + reports
```

### 2. Build & deploy the console
```bash
cd console
npm install
npm run build                         # vite + vite-plugin-singlefile → dist/index.html
lemma apps deploy govt-console dist/index.html --pod crackwatch
```

## Tech

Lemma SDK · React 19 · Vite 8 · Tailwind CSS v4 · shadcn/ui · Leaflet · Recharts · Framer Motion · Python (pod functions)

---

Built for the **Gappy AI Hackathon** · June 2026
