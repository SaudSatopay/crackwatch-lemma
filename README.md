<div align="center">

# 🛣️ CrackWatch *on* Lemma

### An AI-native civic infrastructure platform — two React apps, and the *entire* backend rebuilt on the [Lemma SDK](https://lemma.work).

*Citizens report road damage from their phone with on-device AI. A government command center triages it, prices the repair **and the cost of ignoring it**, and dispatches accountable contractors. There is no traditional backend — just one Lemma pod.*

<br/>

[![Built on Lemma SDK](https://img.shields.io/badge/built%20on-Lemma%20SDK-4EDEA3?style=for-the-badge)](https://lemma.work)
[![2 apps · 1 pod](https://img.shields.io/badge/2%20apps-1%20pod-0C2620?style=for-the-badge)](#-system-architecture)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8-in--browser-00FFB2?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-pod%20functions-3776AB?style=for-the-badge&logo=python&logoColor=white)

<br/>

[![Citizen App — Live](https://img.shields.io/badge/📱%20Citizen%20App-LIVE-4EDEA3?style=for-the-badge)](https://citizen-app.apps.lemma.work)
&nbsp;
[![Government Console — Live](https://img.shields.io/badge/🖥️%20Govt%20Console-LIVE-5DE6FF?style=for-the-badge)](https://govt-console.apps.lemma.work)

</div>

---

<a id="toc"></a>
## 📑 Contents

| | | |
|---|---|---|
| 1. [The problem](#problem) | 5. [The agentic loop](#agentic-loop) | 9. [Gamification](#gamification) |
| 2. [The solution](#solution) | 6. [Computer vision](#cv) | 10. [Citizen journey](#journey) |
| 3. [System architecture](#architecture) | 7. [Severity & cost model](#severity) | 11. [Report lifecycle](#lifecycle) |
| 4. [How Lemma is used](#lemma) | 8. [Data model](#data-model) | 12. [Stack · layout · run · rationale · roadmap](#stack) |

> **TL;DR** — The original CrackWatch ran a FastAPI + in-memory backend. **This version deletes that backend and replaces it with one Lemma pod** — tables, an AI triage agent, RAG, Python functions, a human-approval workflow, event triggers, auth, and the gamification ledger. Two original React UIs are reused *unchanged*, pointed at the pod by a thin `fetch` bridge.

---

<a id="problem"></a>
## 🕳️ The problem

Cracked roads and potholes cause crashes, vehicle damage, and monsoon flooding — yet the reporting loop is broken on **both** ends. Citizens have no fast, satisfying way to report damage or watch it get fixed, so most hazards are never reported. Governments receive unstructured complaints with no triage, no cost forecasting, and no contractor accountability — so the most dangerous defects sit unrepaired while cheap fixes balloon into expensive ones.

```mermaid
flowchart LR
    subgraph Before["❌ The reporting loop today"]
        direction TB
        X1["Citizen spots<br/>a pothole"] --> X2["No fast way<br/>to report it"]
        X2 --> X3["Complaint lost<br/>in an inbox"]
        X3 --> X4["No triage · no cost<br/>no accountable owner"]
        X4 --> X5["Hazard ignored<br/>→ worsens → costs 6×"]
    end
    subgraph After["✅ CrackWatch closes the loop"]
        direction TB
        Y1["Snap a photo"] --> Y2["On-device AI:<br/>type · severity · cost"]
        Y2 --> Y3["On the public map<br/>+ inspector queue"]
        Y3 --> Y4["Human-approved<br/>dispatch"]
        Y4 --> Y5["Fixed · contractor<br/>publicly scored"]
    end
    Before -. "rebuilt on Lemma" .-> After

    classDef bad fill:#2a1414,stroke:#5a2a2a,color:#ffd9d9;
    classDef good fill:#0c2620,stroke:#1c4a3a,color:#d9fbe9;
    class X1,X2,X3,X4,X5 bad
    class Y1,Y2,Y3,Y4,Y5 good
```

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="solution"></a>
## 💡 The solution

Two surfaces, **one shared pod** — humans and AI agents read and write the same state.

<table>
<tr>
<td width="50%" valign="top">

### 📱 Citizen app &nbsp;[↗](https://citizen-app.apps.lemma.work)
A mobile PWA. Snap a photo → **real YOLOv8 runs in the browser**, draws boxes, scores severity, and estimates repair cost. The report saves to the pod and the citizen earns **XP, coins, streaks & badges** on a civic leaderboard. A live map shows every report's status; *safe-route* navigation routes drivers **around** unrepaired hazards.

</td>
<td width="50%" valign="top">

### 🖥️ Government console &nbsp;[↗](https://govt-console.apps.lemma.work)
The command center. Every report on a live map, ranked by a prioritized repair plan with **repair cost vs. cost-if-ignored** — so delay has a price tag. Inspectors approve critical dispatches (human-in-the-loop). A contractor **Wall of Shame** ranks negligence publicly.

</td>
</tr>
</table>

> 💚 **Why Lemma:** keep your frontend — replace the database **+** agent runtime **+** workflow engine **+** RAG **+** auth **+** event triggers **+** gamification ledger you'd otherwise stitch together with **one open-source pod**.

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="architecture"></a>
## 🏗️ System architecture

The frontends never changed. The backend *became* a pod.

```mermaid
flowchart LR
    subgraph CLIENTS["🖥️📱  Original React UIs — unchanged"]
        direction TB
        subgraph UI["Government Console"]
            C1["Map · Repair Plan"]
            C2["Wall of Shame"]
        end
        subgraph APP["Citizen PWA"]
            A1["Report · in-browser YOLO"]
            A2["Rewards · Map · Route"]
        end
    end

    BR["🔌 lemma-bridge.js<br/>patches window.fetch → pod"]

    subgraph POD["🟢  Lemma Pod — the entire backend"]
        direction TB
        TB["📊 Tables<br/>reports · contractors<br/>report_events · profiles"]
        AG["🤖 damage-triage agent"]
        FN["⚙️ Functions<br/>score_report · dispatch_repair"]
        WF["🔀 report-intake workflow<br/>+ human-approval FORM"]
        RAG["📚 /knowledge rubric · RAG"]
        SCH["⏰ on-new-report<br/>DATASTORE trigger"]
    end

    EXT["👁️ onnxruntime-web · best.onnx<br/>🗺️ Leaflet · OSRM · Nominatim"]

    UI --> BR
    APP --> BR
    APP -. "client-side CV + maps" .-> EXT
    BR -- "Lemma SDK · records · auth" --> POD
    SCH --> WF
    WF --> AG
    WF --> FN
    AG -. "grounds on" .-> RAG
    AG --> TB
    FN --> TB

    classDef pod fill:#0c2620,stroke:#1c4a3a,color:#d9fbe9;
    classDef ui fill:#11161d,stroke:#33414f,color:#dde7f0;
    classDef ext fill:#1a1726,stroke:#3a2d6b,color:#dcd2ff;
    class POD,TB,AG,FN,WF,RAG,SCH pod
    class CLIENTS,UI,APP,C1,C2,A1,A2 ui
    class EXT ext
```

Every component still calls `fetch('http://localhost:8000/...')`. Each app's `lemma-bridge.js` ([console](console/src/lib/lemma-bridge.js) · [citizen](citizen/src/lib/lemma-bridge.js)) intercepts those calls and answers them from the pod — so the UIs are **byte-for-byte unchanged**, but their data is live from Lemma.

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="lemma"></a>
## 🟢 How Lemma is used

CrackWatch leans on **ten** Lemma primitives doing real work — visualised as the pod's anatomy:

```mermaid
mindmap
  root((Lemma pod))
    Tables
      reports
      contractors
      report_events
      profiles
    Agent damage-triage
      output_schema
      least-privilege grants
    Built-in RAG
      knowledge rubric
    Functions
      score_report
      dispatch_repair
    Workflow report-intake
      human approval form
    Schedule on-new-report
      datastore trigger
    Apps
      citizen-app
      govt-console
      command-center
```

| # | Lemma primitive | Where in CrackWatch | What it does |
|---|---|---|---|
| 1 | **📊 Tables** (shared, RLS-off) | [`pod/tables/`](pod/tables) — `reports`, `contractors`, `report_events`, `profiles` | Durable, typed civic state + the gamification ledger every agent and operator shares |
| 2 | **🤖 Agent** | [`damage-triage`](pod/agents/damage-triage) | LLM worker with a scoped instruction, an `output_schema`, and grants — classifies damage + scores severity 0–100 |
| 3 | **📚 Files + built-in RAG** | [`/knowledge`](pod/files/knowledge) rubric | The agent **grounds** every score on a real engineering rubric — no external vector DB |
| 4 | **⚙️ Functions** (Python) | [`score_report`, `dispatch_repair`](pod/functions) | Deterministic INR cost engine + coordinated multi-table writes via `Pod.from_env()` |
| 5 | **🔀 Workflow** | [`report-intake`](pod/workflows/report-intake) | `AGENT → FUNCTION → DECISION → FORM → FUNCTION`, with a **human-approval** step |
| 6 | **⏰ Schedule / trigger** | [`on-new-report`](pod/schedules/on-new-report) | A `DATASTORE` INSERT event on `reports` fires the workflow |
| 7 | **🔐 Permissions** | `grants` on every agent + function | Least-privilege: `score_report` writes `reports`, nothing else |
| 8 | **🪟 Apps** | [`pod/apps/`](pod/apps) — `citizen-app`, `govt-console`, `command-center` | Both product UIs, deployed and served *by the pod* |
| 9 | **🧩 SDK + auth** | [console](console/src/lib/lemma-bridge.js) + [citizen](citizen/src/lib/lemma-bridge.js) bridges | `records.list/create/update` + delegated auth backing the unchanged React UIs |
| 10 | **🎮 Gamification ledger** | [`profiles`](pod/tables/profiles) + the citizen bridge | XP / coins / streaks / badges / leaderboard — persisted in the pod, no separate service |

<details>
<summary><b>Why this is meaningful Lemma use, not a wrapper</b> — click to expand</summary>

<br/>

- **🧠 Built-in RAG, zero infra.** The triage agent searches `/knowledge` for the severity & cost rubric and grounds every score on it — the pod *is* the vector store. No Pinecone, no embeddings pipeline.
- **🧑‍⚖️ Human-in-the-loop, natively.** Critical repairs pause at a workflow **FORM** assigned to an inspector and resume on their decision — the exact thing a bare chatbot can't do.
- **⚡ Reactive choreography.** A new `reports` row fires a `DATASTORE` schedule → the workflow runs itself. Operators don't push a button; the pod reacts.
- **🛡️ Delegated identity + least privilege.** Functions and the agent run as the invoking user with **name-based grants**.
- **🧩 Bring-your-own-frontend, ×2.** The entire legacy REST surface of **two** apps is served from the pod by bridge files — neither React app changed a line.
- **👁️ Real CV on the edge.** YOLOv8 runs *in the browser*; the pod stores the structured result. No GPU backend to host.

> **What we did *not* build:** ~~PostgreSQL~~ · ~~a vector DB~~ · ~~an LLM agent runtime + tool loop~~ · ~~a workflow/approval engine~~ · ~~an auth layer~~ · ~~webhook/event plumbing~~ · ~~a gamification service~~ — all of it is the **one pod** in [`pod/`](pod).

</details>

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="agentic-loop"></a>
## 🔁 The agentic loop

```mermaid
flowchart TD
    R["🆕 New report<br/>citizen app · field scan · API"]:::ev
    R -->|"DATASTORE trigger"| AG["🤖 damage-triage agent<br/>classify damage + severity 0-100"]:::ag
    AG -.->|"grounded on"| KB["📚 /knowledge rubric<br/>built-in RAG"]:::rag
    AG --> SC["⚙️ score_report<br/>repair cost · cost-if-ignored · priority"]:::fn
    SC --> D{"severity<br/>critical?"}:::dec
    D -->|"yes"| AP["🧑‍⚖️ Inspector approval<br/>workflow FORM · human-in-the-loop"]:::hu
    D -->|"no"| AU["auto-dispatch"]:::fn
    AP -->|"approve"| DI["⚙️ dispatch_repair<br/>assign contractor + audit event"]:::fn
    AP -->|"reject"| RJ["🚫 rejected"]:::ev
    AU --> DI
    DI --> EN["✅ Dispatched · board + wall-of-shame updated"]:::ev

    classDef ag fill:#0f2630,stroke:#1d3f4d,color:#bdeeff;
    classDef fn fill:#161d26,stroke:#33414f,color:#dde7f0;
    classDef rag fill:#1a2330,stroke:#3a4a5f,color:#cfe0ff;
    classDef hu fill:#2a2113,stroke:#4a3a1c,color:#ffe0a0;
    classDef dec fill:#11161d,stroke:#5de6ff,color:#cffaff;
    classDef ev fill:#0c2620,stroke:#1c4a3a,color:#d9fbe9;
```

And the report's full state machine across humans, AI, and contractors:

```mermaid
stateDiagram-v2
    [*] --> new: citizen / field report
    new --> triaged: AI triage + score
    triaged --> pending_approval: severity ≥ 70, critical
    triaged --> dispatched: non-critical, auto
    pending_approval --> dispatched: inspector approves
    pending_approval --> rejected: inspector rejects
    dispatched --> resolved: contractor fixes
    resolved --> [*]
    rejected --> [*]
```

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="cv"></a>
## 👁️ Computer vision — YOLOv8, in the browser

The original CrackWatch ran YOLO on a Python server. Here it runs **client-side** via `onnxruntime-web` (WASM) — the model (`best.onnx`) streams from the repo, inference happens on-device, and only the structured result touches the pod.

```mermaid
flowchart LR
    IMG["📷 Photo"] --> PRE["Letterbox → 640×640<br/>normalize RGB"]
    PRE --> ORT["🧠 best.onnx<br/>onnxruntime-web (WASM)"]
    ORT --> OUT["raw tensor<br/>[1, 8, 8400]"]
    OUT --> NMS["decode + NMS<br/>conf ≥ 0.30 · IoU 0.45"]
    NMS --> SCORE["per-defect scoring<br/>severity · cost"]
    SCORE --> POD["📊 pod report"]
    SCORE --> DRAW["🖼️ annotated boxes"]

    classDef a fill:#1a1726,stroke:#3a2d6b,color:#dcd2ff;
    classDef b fill:#0c2620,stroke:#1c4a3a,color:#d9fbe9;
    class IMG,PRE,ORT,OUT,NMS,SCORE,DRAW a
    class POD b
```

The model detects **4 road-damage classes**, each carrying a *type weight* that feeds the severity model:

| Class | `class_id` | Type weight | Why |
|---|:---:|:---:|---|
| 🕳️ Pothole | 3 | **1.00** | Immediate crash / tyre hazard |
| 🐊 Alligator crack | 2 | **1.00** | Signals sub-base failure |
| ↔️ Transverse crack | 1 | 0.75 | Thermal / structural, spreads |
| ↕️ Longitudinal crack | 0 | 0.70 | Often early-stage |

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="severity"></a>
## 🧮 The severity & cost model

This is the "research" core — a transparent, auditable pipeline (not a black box) that turns a detection into a **0–100 severity score**, a repair cost, and the cost of ignoring it. Mirrored from the pod's `/knowledge` rubric so the agent and the client agree.

#### Severity = weighted blend of four factors

```
severity = 100 × ( 0.30·area + 0.25·confidence + 0.20·density + 0.25·typeWeight )
```

| Factor | Weight | Source |
|---|:---:|---|
| **Area ratio** (defect px ÷ frame, capped) | `0.30` | bounding-box geometry |
| **Detection confidence** | `0.25` | YOLO class score |
| **Defect density** (how many in frame) | `0.20` | detection count |
| **Damage-type weight** | `0.25` | class lookup (table above) |

→ banded into **🟢 minor** (`<40`), **🟠 warning** (`40–69`), **🔴 critical** (`≥70`).

#### Cost engine

```
repair_cost      = mean(cost_band) × (1 + 2·area%)
cost_if_ignored  = repair_cost × { minor ×3 · warning ×4 · critical ×6 }
```

Cost bands are real, per damage type and severity (INR):

| Damage type | 🟢 Minor | 🟠 Warning | 🔴 Critical |
|---|---|---|---|
| Pothole | ₹1k–3k | ₹3k–10k | ₹10k–30k |
| Alligator crack | ₹3k–10k | ₹10k–40k | ₹40k–1.5L |
| Longitudinal crack | ₹0.5k–2k | ₹2k–8k | ₹8k–25k |
| Transverse crack | ₹0.8k–3k | ₹3k–12k | ₹12k–35k |
| Pipe damage | ₹5k–15k | ₹15k–50k | ₹50k–2L |
| Building crack | ₹2k–8k | ₹8k–30k | ₹30k–1L |

#### The triage matrix

Every defect lands somewhere on the **severity × cost** plane — which drives the repair plan's ordering:

```mermaid
quadrantChart
    title Damage triage — severity vs. repair cost
    x-axis Low cost --> High cost
    y-axis Low severity --> High severity
    quadrant-1 Fix now — barricade
    quadrant-2 Quick wins
    quadrant-3 Monitor
    quadrant-4 Plan & budget
    Pothole: [0.5, 0.78]
    Alligator crack: [0.72, 0.85]
    Longitudinal crack: [0.28, 0.45]
    Transverse crack: [0.34, 0.5]
    Pipe damage: [0.92, 0.78]
    Building crack: [0.62, 0.66]
    Spalling: [0.38, 0.4]
    Corrosion: [0.5, 0.52]
    Leak: [0.55, 0.68]
```

> 💡 The killer government feature isn't the repair cost — it's **`cost_if_ignored`**. A ₹10k pothole left to fail becomes a ₹60k reconstruction. CrackWatch puts that number on the dashboard.

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="data-model"></a>
## 🧬 Data model

Four Lemma tables, shared by citizens, inspectors, agents, and scheduled jobs:

```mermaid
erDiagram
    contractors ||--o{ reports : "assigned to"
    reports ||--o{ report_events : "audited by"
    profiles ||--o{ reports : "filed by"

    reports {
        serial ref
        enum status "new → resolved"
        enum damage_type
        float severity "0-100"
        int est_cost_inr
        int cost_if_ignored_inr
        text assigned_contractor
        text reporter_contact
    }
    contractors {
        text name
        text sector
        float negligence_score "wall of shame"
        int assigned_count
        int resolved_count
    }
    report_events {
        uuid report_id
        enum kind "triaged · approved · dispatched"
        text actor
    }
    profiles {
        text user_key "citizen identity"
        int xp
        int coins
        int level
        int streak_days
        json achievements
    }
```

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="gamification"></a>
## 🎮 Gamification — civic duty as a game

Reporting damage earns **XP, civic coins, streaks, and badges**, all persisted in the `profiles` table. The leaderboard is a single `records.list` query — no separate service.

#### Leveling curve

```
level = ⌊ √(xp / 100) ⌋ + 1
```

| Level | XP needed | | Level | XP needed |
|:---:|:---:|---|:---:|:---:|
| 2 | 100 | | 5 | 1,600 |
| 3 | 400 | | 7 | 3,600 |
| 4 | 900 | | 10 | 8,100 |

#### Where XP comes from (a typical active week)

```mermaid
pie showData
    title XP sources
    "Valid reports" : 55
    "Daily streak bonuses" : 20
    "Achievements unlocked" : 15
    "AI challenge wins" : 10
```

#### Point values & a sample of the 13 badges

| Action | Points | | Badge | Unlock |
|---|:---:|---|---|---|
| Critical defect | +15 | | 🕵️ First Report | 1 report |
| Pothole / warning | +10 | | 🔥 Road Warrior | 10 reports |
| Crack | +7 | | 🛠️ Civic Hero | 25 reports |
| Minor | +5 | | 🚨 Critical Finder | report a critical |
| Streak (per day) | +5 | | 🔍 Inspector | 3 sectors |
| False report | −5 | | 🔥🔥🔥 Legend | 30-day streak |

*(XP = points × 5; coins = points ÷ 2; first profile starts with a 50-coin bonus.)*

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="journey"></a>
## 🧭 The citizen journey

```mermaid
journey
    title A citizen's first report
    section Discover
      Open app, tap Report: 5: Citizen
      Pick a sector: 4: Citizen
    section Capture
      Snap a photo: 5: Citizen
      In-browser YOLO detects damage: 5: Citizen, AI
    section Reward
      See boxes + severity + cost: 5: Citizen
      Earn XP, coins, a badge: 5: Citizen
    section Impact
      Report appears on the map: 4: Citizen
      Inspector approves dispatch: 4: Inspector
      Contractor scored publicly: 3: Government
```

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="lifecycle"></a>
## 🎬 Report lifecycle — end to end

```mermaid
sequenceDiagram
    actor Citizen
    participant UI as Citizen App
    participant CV as In-browser YOLO
    participant DB as Lemma Tables
    participant AG as Triage Agent
    participant FN as Cost Engine
    actor Inspector

    Citizen->>UI: Report damage (photo + GPS)
    UI->>CV: detect (onnxruntime-web)
    CV-->>UI: boxes · class · confidence
    UI->>DB: create report + award XP/coins
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

<div align="center"><sub><a href="#toc">▲ back to top</a></sub></div>

---

<a id="stack"></a>
## 🛠️ Tech stack

| Layer | Tech |
|---|---|
| **Backend** | 🟢 **Lemma pod** — tables · agent · RAG · functions · workflow · schedule · auth |
| **Frontend** | React 19 · Vite 8 (single-file build) · Tailwind v4 · Framer Motion |
| **Computer vision** | YOLOv8 → ONNX · onnxruntime-web (WASM), in-browser |
| **Maps / routing** | Leaflet · CARTO tiles · OSRM (routing) · OSM Nominatim (geocoding) |
| **Functions** | Python (`Pod.from_env()`) |

<a id="layout"></a>
## 📁 Repository layout

```
crackwatch-lemma/
├── pod/                          # 🟢 the Lemma pod — the entire backend, as portable files
│   ├── pod.json  ·  DESIGN.md    #    metadata + the design note
│   ├── tables/                   #    reports · contractors · report_events · profiles
│   ├── agents/damage-triage/     #    AI triage agent (instruction + output_schema + grants)
│   ├── functions/                #    score_report (cost engine) · dispatch_repair
│   ├── workflows/report-intake/  #    triage → score → human approval → dispatch
│   ├── schedules/on-new-report/  #    DATASTORE trigger
│   ├── files/knowledge/          #    RAG folder  (severity + cost rubric)
│   ├── apps/                     #    citizen-app · govt-console · command-center
│   └── seed/                     #    sample data · rubric · demo leaderboard profiles
├── console/                      # 🖥️ government command-center frontend
│   └── src/lib/lemma-bridge.js   #    ⭐ fetch → Lemma pod
└── citizen/                      # 📱 citizen PWA (Map · Report · Rewards · Stats · Route)
    └── src/lib/lemma-bridge.js   #    ⭐ citizen bridge — real YOLO + gamification
```

<a id="run"></a>
## 🚀 Run it

> **Prereqs** — the [Lemma CLI](https://lemma.work) (`uv tool install lemma-terminal`), Node 20+, `lemma auth login`.

```bash
# 1 — deploy the pod (the entire backend)
lemma orgs create "CrackWatch"
lemma pods create crackwatch --org <org-id>
lemma pods import ./pod --pod crackwatch
bash pod/seed/seed.sh                          # sample contractors + reports
bash pod/seed/seed_profiles.sh                 # demo leaderboard profiles

# 2 — build & deploy the government console
cd console && npm install && npm run build      # vite-plugin-singlefile → dist/index.html
lemma apps deploy govt-console dist/index.html --pod crackwatch

# 3 — build & deploy the citizen app
cd ../citizen && npm install && npm run build
lemma apps deploy citizen-app dist/index.html --pod crackwatch
```

<a id="decisions"></a>
## 🧠 Engineering rationale

<details>
<summary><b>Why run YOLO in the browser instead of a pod function?</b></summary>

<br/>Client-side inference means **zero GPU backend to host**, instant feedback (no upload round-trip), and the pod only ever stores the small structured result — not raw images. The pod stays cheap and fast; the phone does the heavy lifting.
</details>

<details>
<summary><b>Why is the <code>profiles</code> table RLS-off / POD-visible?</b></summary>

<br/>The leaderboard needs to read across *all* players, and a citizen's identity here is a chosen display name rather than a Lemma account. RLS-off / POD visibility matches the other shared civic tables and keeps the leaderboard a single query. (Per-user private rows would make a multiplayer leaderboard impossible.)
</details>

<details>
<summary><b>Why the <code>fetch</code>-bridge pattern?</b></summary>

<br/>It let us migrate two production React apps onto Lemma **without touching a single component**. The bridge patches <code>window.fetch</code>, maps each legacy REST route to <code>records.list/create/update</code>, and returns a normal <code>Response</code>. The UI can't tell the difference — but there's no server behind it, just the pod.
</details>

<details>
<summary><b>Why mirror the rubric on both the client and the agent?</b></summary>

<br/>The client scorer gives citizens instant triage; the pod's <code>damage-triage</code> agent — grounded on the same <code>/knowledge</code> rubric via RAG — provides the authoritative, auditable score for the government workflow. Same rules, two enforcement points.
</details>

<a id="roadmap"></a>
## 🛣️ Build & roadmap

```mermaid
timeline
    title CrackWatch on Lemma
    section ✅ Shipped
        Pod backend : Tables · agent · functions · workflow · RAG · triggers
        Government console : Live on Lemma · real in-browser CV
        Citizen app : Map · Report · Rewards · Stats · safe Route
        Gamification : profiles table · leaderboard · 13 badges · Wall of Shame
    section 🔜 Next
        Live agentic loop : re-enable the DATASTORE schedule end-to-end
        More CV : building cracks (crack_seg) · video scan · authenticity check
        New surfaces : WhatsApp / Telegram reporting via Lemma
```

---

<div align="center">

### 📱 [citizen-app.apps.lemma.work](https://citizen-app.apps.lemma.work) &nbsp;·&nbsp; 🖥️ [govt-console.apps.lemma.work](https://govt-console.apps.lemma.work)

**Two apps. One Lemma pod. Zero glue.**

<sub>Built for the <strong>Gappy AI Hackathon</strong> · June 2026 · by Saud Satopay, Sahil Addagatla & Aryan Walunj</sub>

<sub><a href="#toc">▲ back to top</a></sub>

</div>
