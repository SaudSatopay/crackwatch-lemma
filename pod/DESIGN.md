# CrackWatch on Lemma — Pod Design Note

Rebuild of the hackathon-winning **CrackWatch** infrastructure-damage command center
as a native Lemma pod for the Gappy AI Hackathon. We reuse the problem, the real
severity/cost logic, and the narrative; we rebuild the operational loop on Lemma
(tables + agent + functions + workflow + human approval + surface + app).

## Problem & users
Civic infrastructure damage (potholes, cracks, leaks) is reported chaotically and
**73% is never fixed**. Three real users:
- **Citizen** — reports damage (photo + location) via chat or app.
- **Inspector / municipal authority** — triages, approves dispatch of high-severity
  repairs, watches the live queue.
- **Contractor** — assigned repairs; held accountable by a public negligence score.

**Unit of work:** a `report`, lifecycle `new → triaged → pending_approval → dispatched → resolved` (+ `rejected`).

## Hero moment (the 60-second "oh")
A citizen sends a pothole photo → seconds later the command center shows a fully
triaged report — *Alligator Crack, 82/100 critical, ₹40K now vs ₹2.4L if ignored,
fails in ~6 weeks* — with that critical case already waiting in the inspector's
approval inbox. Approve → contractor assigned, citizen notified, negligence board
updates. No one clicked a form to make the triage happen.

## Tables (all shared — `enable_rls: false` — civic data the whole team works)
- **reports** — the unit of work (photo, location, damage_type, severity + label,
  est_cost_inr, cost_if_ignored_inr, repair plan, failure_forecast, priority_score,
  status, assigned_contractor, ai_analysis JSON, workflow_run_id).
- **contractors** — accountability (name, sector, assigned/resolved/overdue counts,
  avg_fix_days, negligence_score, status). The "wall of shame".
- **report_events** — audit timeline (report_id, kind, note, actor).

> No FK constraints in the bundle (avoids import-ordering coupling); relations are
> plain UUID columns joined in code/queries.

## Files — `/knowledge` (built-in RAG)
- `crackwatch_rubric.md` — the severity scoring rubric + INR repair-cost tables +
  cost-if-ignored multipliers, ported verbatim from CrackWatch's `severity.py` /
  `cost_engine.py`. The triage agent grounds on this (real RAG, not vibes).

## Agent (judgment) — `damage-triage`
Input: a report (photo + description + location). Views the photo, searches
`/knowledge`. Rich `output_schema`: `damage_type, severity (0-100), severity_label,
area_ratio, confidence, summary, failure_forecast, recommended_action`. Toolsets:
`POD`, `WORKSPACE_CLI` (for `view_image`). Grants: `reports:read`, `/knowledge:read`.
(One rich agent — heuristic #1: the CV-perception + severity judgment in one pass.)

## Functions (deterministic — port CrackWatch's engines)
- **score_report** — from the agent's classification → compute `est_cost_inr`,
  `cost_if_ignored_inr` (×3 / ×4 / ×6), `repair_method/eta/crew_size`,
  `priority_score`; write them onto the report; status → `triaged`. Faithful port of
  `cost_engine.py`. Grants: `reports:read,write`.
- **dispatch_repair** — on approval: status → `dispatched`, assign contractor by
  sector, bump `contractors.assigned_count`, write a `report_events` row. Grants:
  `reports`, `contractors`, `report_events` (read/write).
- **resolve_report** *(enhancement)* — status → `resolved`, bump resolved_count,
  recompute `negligence_score`, write event.

## Workflow — `report-intake`
Trigger: a new `reports` row (DATASTORE_EVENT, INSERT). `report_id` =
`start.metadata.record_id`.
```
AGENT damage-triage → FUNCTION score_report → DECISION (severity_label == 'critical')
  ├─ critical → FORM authority_approval (inspector approves + confirms contractor)
  │              → FUNCTION dispatch_repair → END
  └─ else     → FUNCTION dispatch_repair (auto-dispatch) → END
```
The FORM is the human approval gate — the agentic-work-with-a-human-checkpoint hero.

## Surface
- **telegram** (primary demo — built-in long-polling, only needs a bot token): citizen
  sends photo + location → a `reports` row is created → the workflow fires.
- **WhatsApp** is the production equivalent (CrackWatch already used Twilio WhatsApp);
  wire it if a connector account is available.

## App — `command-center` (the product)
Single-page operator UI (no-build HTML first; Vite/React if time), live via
`datastore.watchChanges`:
- Priority queue of reports (severity color, **cost-if-ignored**, status)
- Inspector **approval inbox** (parked workflow forms)
- Contractor **"wall of shame"** (negligence leaderboard)
- Report detail (AI analysis, cost, forecast)

## Seed (so it demos itself)
`seed/seed.sh`: ~4 contractors, ~8 reports across severities/statuses, one parked at
the approval form, leaderboard populated. Plus upload `/knowledge/crackwatch_rubric.md`.

## Deliberately NOT ported (product judgment — no wasted complexity)
Live YOLO/CV model (the agent does perception instead), citizen gamification
(XP/coins), fraud detection, heatmaps. Judges reward a tight real loop, not feature
sprawl. The **severity + cost logic IS ported faithfully** — that's the credible core.

## Success criteria (final smoke test)
Create a report (or send via Telegram) → `reports` row is triaged with severity +
cost + forecast → the critical one shows an approval form in the inspector's inbox →
approve → status `dispatched`, contractor assigned & counts updated → command-center
shows the whole journey + the leaderboard.

## Build order
tables → files(`/knowledge`) → functions → agent → workflow → surface → app → seed → verify.
