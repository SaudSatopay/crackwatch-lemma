<h1 align="center">🛣️ CrackWatch <em>on</em> Lemma</h1>

<p align="center"><strong>An AI-native civic infrastructure command center — the entire backend rebuilt on the <a href="https://lemma.work">Lemma SDK</a>.</strong></p>

<p align="center">
  <img alt="Built on Lemma SDK" src="https://img.shields.io/badge/built%20on-Lemma%20SDK-4EDEA3?style=for-the-badge">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img alt="Vite 8" src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img alt="Python" src="https://img.shields.io/badge/Python-pod%20functions-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img alt="Gappy AI Hackathon" src="https://img.shields.io/badge/Gappy%20AI-Hackathon-FF6B6B?style=for-the-badge">
</p>

---

Citizens report infrastructure damage — potholes, cracks, leaks. CrackWatch **triages each report with AI**, estimates the repair cost **and the cost of ignoring it**, routes critical cases to a **human inspector for approval**, **dispatches** the repair to an accountable contractor, and tracks every contractor's negligence on a public **wall of shame**.

The original CrackWatch ran a polished React UI on a FastAPI + in-memory backend with a YOLO CV model. **This version deletes that entire backend and replaces it with one Lemma pod.** The React UI is reused *unchanged*; a thin `fetch` bridge points it at the pod.

> 💡 **The point of Lemma:** keep your frontend — replace the database **+** agent runtime **+** workflow engine **+** RAG **+** auth **+** event triggers you'd otherwise stitch together with **one open-source pod** where humans and AI agents read and write the same state.

---

## 🏗️ Architecture

The frontend never changed. The backend became a pod.

```mermaid
flowchart LR
    subgraph UI["🖥️  React Console — original UI, unchanged"]
        direction TB
        C1["Dashboard · StatsCards"]
        C2["Reports Map · Leaflet"]
        C3["Repair Plan"]
        C4["Wall of Shame"]
    end

    BR["🔌 lemma-bridge.js<br/>patches window.fetch"]

    subgraph POD["🟢  Lemma Pod — the entire backend"]
        direction TB
        TB["📊 Tables<br/>reports · contractors · report_events"]
        AG["🤖 damage-triage agent"]
        FN["⚙️ Functions<br/>score_report · dispatch_repair"]
        WF["🔀 report-intake workflow"]
        RAG["📚 /knowledge rubric · RAG"]
    end

    UI -- "GET /stats · POST /detect · ..." --> BR
    BR -- "Lemma TypeScript SDK" --> POD
    WF --> AG
    WF --> FN
    AG -. "grounds on" .-> RAG
    AG --> TB
    FN --> TB

    classDef pod fill:#0c2620,stroke:#1c4a3a,color:#d9fbe9;
    classDef ui fill:#11161d,stroke:#33414f,color:#dde7f0;
    class POD,TB,AG,FN,WF,RAG pod
    class UI,C1,C2,C3,C4 ui
```

Every component still calls `fetch('http://localhost:8000/...')`. [`console/src/lib/lemma-bridge.js`](console/src/lib/lemma-bridge.js) intercepts those calls and serves them from the pod — so the UI is **byte-for-byte unchanged**, but its data is live from Lemma.

---

## 🔁 The agentic loop

```mermaid
flowchart TD
    R["🆕 New report<br/>map · field scan · API"]:::ev
    R -->|"DATASTORE trigger"| AG["🤖 damage-triage agent<br/>classify damage + severity 0-100"]:::ag
    AG -.->|"grounded on"| KB["📚 /knowledge rubric<br/>built-in RAG"]:::rag
    AG --> SC["⚙️ score_report<br/>repair cost · cost-if-ignored · priority"]:::fn
    SC --> D{"severity<br/>critical?"}:::dec
    D -->|"yes"| AP["🧑‍⚖️ Inspector approval<br/>workflow FORM · human-in-the-loop"]:::hu
    D -->|"no"| AU["auto-dispatch"]:::fn
    AP --> DI["⚙️ dispatch_repair<br/>assign contractor + audit event"]:::fn
    AU --> DI
    DI --> EN["✅ Dispatched · board + wall-of-shame updated"]:::ev

    classDef ag fill:#0f2630,stroke:#1d3f4d,color:#bdeeff;
    classDef fn fill:#161d26,stroke:#33414f,color:#dde7f0;
    classDef rag fill:#1a2330,stroke:#3a4a5f,color:#cfe0ff;
    classDef hu fill:#2a2113,stroke:#4a3a1c,color:#ffe0a0;
    classDef dec fill:#11161d,stroke:#5de6ff,color:#cffaff;
    classDef ev fill:#0c2620,stroke:#1c4a3a,color:#d9fbe9;
```

---

## 🟢 How Lemma is used

CrackWatch leans on **nine** Lemma primitives — not one bolted on superficially, but the whole platform doing real work:

| Lemma primitive | Where in CrackWatch | What it does |
|---|---|---|
| **📊 Tables** (shared, RLS-off) | [`pod/tables/`](pod/tables) — `reports`, `contractors`, `report_events` | Durable, typed, queryable civic state every agent and operator shares |
| **🤖 Agent** | [`pod/agents/damage-triage`](pod/agents/damage-triage) | LLM worker with a scoped instruction, an `output_schema`, and grants — classifies damage type + scores severity |
| **📚 Files + built-in RAG** | [`pod/files/knowledge`](pod/files/knowledge) + the severity/cost rubric | The agent **grounds** its scoring on a real engineering rubric — no external vector DB |
| **⚙️ Functions** (Python) | [`pod/functions/`](pod/functions) — `score_report`, `dispatch_repair` | Deterministic INR cost engine + coordinated multi-table writes via `Pod.from_env()` |
| **🔀 Workflow** | [`pod/workflows/report-intake`](pod/workflows/report-intake) | `AGENT → FUNCTION → DECISION → FORM → FUNCTION` — with a **human-approval step** |
| **⏰ Schedule / trigger** | [`pod/schedules/on-new-report`](pod/schedules/on-new-report) | `DATASTORE` event on `reports` INSERT — fires the workflow automatically |
| **🔐 Permissions** | `permissions.grants` on every agent + function | Zero-access-by-default; each workload is granted only the tables it touches |
| **🪟 Apps** | [`pod/apps/`](pod/apps) — `govt-console`, `command-center` | The product UI, deployed and served by the pod |
| **🧩 TypeScript SDK** | [`console/src/lib/lemma-bridge.js`](console/src/lib/lemma-bridge.js) | `records.list / create / update`, `datastore`, and auth — backs the existing React frontend |

### Why this is *meaningful* Lemma use, not a wrapper

- **🧠 Built-in RAG, zero infra.** The triage agent searches `/knowledge` for the severity & cost rubric and grounds every score on it — the pod *is* the vector store. No Pinecone, no embeddings pipeline.
- **🧑‍⚖️ Human-in-the-loop, natively.** Critical repairs pause at a workflow **FORM** assigned to an inspector and resume on their decision — the exact thing a bare chatbot can't do.
- **⚡ Reactive choreography.** A new `reports` row fires a `DATASTORE` schedule → the workflow runs itself. Operators don't push a button; the pod reacts.
- **🛡️ Delegated identity + least privilege.** Functions and the agent run as the invoking user with **name-based grants** — `score_report` can write `reports`, nothing else.
- **🧩 Bring-your-own-frontend.** The headline Lemma move: the *entire* legacy REST surface (`/stats`, `/admin/reports/map`, `/repair-plan`, `/analytics/*`, `/detect`) is served from the pod by one bridge file — the React app didn't change a line.

### What we did **not** have to build

> ~~PostgreSQL~~ &nbsp; ~~a vector DB~~ &nbsp; ~~an LLM agent runtime + tool loop~~ &nbsp; ~~a workflow/approval engine~~ &nbsp; ~~an auth layer~~ &nbsp; ~~webhook/event plumbing~~

All of it is the **one pod** in [`pod/`](pod).

---

## 🧬 Data model

```mermaid
erDiagram
    contractors ||--o{ reports : "assigned to"
    reports ||--o{ report_events : "audited by"

    reports {
        serial ref
        enum status "new→triaged→pending_approval→dispatched→resolved"
        enum damage_type
        float severity "0-100"
        int est_cost_inr
        int cost_if_ignored_inr
        text assigned_contractor
    }
    contractors {
        text name
        text sector
        float negligence_score "the wall of shame"
        int assigned_count
        int resolved_count
    }
    report_events {
        uuid report_id
        enum kind "triaged·approved·dispatched·resolved"
        text actor
    }
```

---

## 🎬 Report lifecycle

```mermaid
sequenceDiagram
    actor Citizen
    participant UI as React Console
    participant DB as Lemma Tables
    participant AG as Triage Agent
    participant FN as Cost Engine
    actor Inspector

    Citizen->>UI: Report damage (photo + location)
    UI->>DB: create report  (via lemma-bridge)
    DB-->>AG: DATASTORE trigger
    AG->>AG: classify + score (RAG on rubric)
    AG->>FN: hand off classification
    FN->>DB: write severity · cost · priority
    DB-->>Inspector: critical → approval form
    Inspector->>DB: Approve ✅
    DB->>FN: dispatch_repair
    FN->>DB: assign contractor + audit event
    DB-->>UI: live update — dispatched
```

---

## 📁 Repository layout

```
crackwatch-lemma/
├── pod/                          # 🟢 the Lemma pod — the entire backend, as portable files
│   ├── pod.json  ·  DESIGN.md    #    metadata + the design note
│   ├── tables/                   #    reports · contractors · report_events
│   ├── agents/damage-triage/     #    the AI triage agent (instruction + grants)
│   ├── functions/                #    score_report (cost engine) · dispatch_repair
│   ├── workflows/report-intake/  #    triage → score → approval → dispatch
│   ├── schedules/on-new-report/  #    DATASTORE trigger
│   ├── files/knowledge/          #    RAG folder  (rubric uploaded by seed/)
│   ├── apps/                     #    govt-console (React) · command-center (HTML)
│   └── seed/                     #    sample data + the rubric document
└── console/                      # 🖥️ the React command-center frontend
    └── src/lib/lemma-bridge.js   #    ⭐ the integration — fetch → Lemma pod
```

---

## 🚀 Run it

**Prerequisites** — the [Lemma CLI](https://lemma.work) (`uv tool install lemma-terminal`), Node 20+, and `lemma auth login`.

```bash
# 1 — deploy the pod
lemma orgs create "CrackWatch"
lemma pods create crackwatch --org <org-id>
lemma pods import ./pod --pod crackwatch
bash pod/seed/seed.sh                          # sample contractors + reports

# 2 — build & deploy the console
cd console && npm install && npm run build      # vite-plugin-singlefile → dist/index.html
lemma apps deploy govt-console dist/index.html --pod crackwatch
```

---

## 🛠️ Tech

**Lemma SDK** · React 19 · Vite 8 · Tailwind CSS v4 · shadcn/ui · Leaflet · Recharts · Framer Motion · Python (pod functions)

<p align="center"><sub>Built for the <strong>Gappy AI Hackathon</strong> · June 2026</sub></p>
