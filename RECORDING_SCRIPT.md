# CrackWatch on Lemma — 60-second demo script

**Goal:** show the full loop — citizen reports with real on-device AI → it lands in the pod → the government acts on it → prove the whole backend is *one Lemma pod*. ~150 words of voiceover; keep the pace brisk.

**Tabs to pre-open (logged into Lemma):**
1. Citizen app — `https://citizen-app.apps.lemma.work` (on the **Report** tab, a real road-damage photo ready to upload)
2. Government console — `https://govt-console.apps.lemma.work`
3. A terminal at the repo root (for the pod reveal), or the Lemma dashboard for the `crackwatch` pod

---

| Time | On screen | Voiceover |
|---|---|---|
| **0:00–0:07** | Citizen app open on the Report screen. Title card: *"CrackWatch — entire backend = one Lemma pod."* | "Bad roads cause crashes — and reporting them is broken on both ends. CrackWatch fixes that, with no backend of its own." |
| **0:07–0:20** | Tap **Submit**. The spinner says "Analyzing with AI…", then the photo appears with **YOLO boxes + confidence**, a severity score, and an INR repair estimate. A **rewards** card pops: +XP, +coins, a new badge. | "Snap a pothole. A real YOLOv8 model runs *in the browser* — boxes, severity, repair cost. The report saves to the pod, and you earn XP, coins, and badges." |
| **0:20–0:28** | Switch to the **Map** tab — the new report is pinned. Then the **Rewards → Rank** tab: the leaderboard podium with civic players. | "It's on the live map instantly. And there's a civic leaderboard — reporting damage is a game you win by fixing your city." |
| **0:28–0:42** | Switch to the **Government console**. The same report is on the inspector's map. Open the **Repair Plan**: priority queue, **repair cost vs. cost-if-ignored**. Click **Approve / Dispatch** on a critical one. | "Same pod, other side: the government console. The exact report is here — triaged, priced, and ranked by what it costs to *ignore* it. The inspector approves the dispatch — human in the loop." |
| **0:42–0:54** | Cut to terminal: `lemma tables list` and `lemma pods get crackwatch` (or the Lemma dashboard) showing tables, the **damage-triage agent**, the **report-intake workflow**, the **/knowledge** RAG file, and the **on-new-report** trigger. | "And the whole backend? One Lemma pod — tables, an AI triage agent grounded on a rubric with built-in RAG, a human-approval workflow, event triggers. No Postgres, no vector DB, no agent runtime." |
| **0:54–1:00** | Back to a split of both apps; end card: *"CrackWatch on Lemma · github.com/SaudSatopay/crackwatch-lemma"* | "Two apps, one pod, zero glue. CrackWatch — built on Lemma." |

---

### Director's notes
- **Use a real road photo** for the scan (not "Load Demo") — the on-device YOLO is the wow moment; let the boxes draw on screen.
- First scan may take a beat while the model downloads from CDN — **pre-warm** by opening the Report tab and doing one throwaway scan before recording.
- The **rewards pop** and the **leaderboard podium** are the emotional beats — linger ~1s on each.
- The cost-if-ignored number on the console is the "serious" beat — it reframes a pothole as a budget line.
- For 0:42–0:54, the Lemma dashboard view of the pod is more legible on camera than CLI text if you have it open.
- Keep cuts hard and fast; the story is *citizen → pod → government → "it's all one pod."*
