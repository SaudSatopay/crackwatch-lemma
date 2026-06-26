# CrackWatch Severity & Repair-Cost Rubric

The single source of truth the **damage-triage** agent grounds on. Ported from
CrackWatch's `severity.py` and `cost_engine.py`. All costs in INR, based on Indian
municipal road-repair rates.

---

## 1. Severity scoring (0–100)

Composite of four factors:

```
severity = 100 × (
    0.30 × min(area_ratio × 50, 1.0)   # how much of the frame the damage covers
  + 0.25 × confidence                  # detection certainty (0–1)
  + 0.20 × density                     # min(defect_count / 10, 1.0)
  + 0.25 × type_weight                 # damage-type danger (table below)
)
```

**Severity labels:**

| Score | Label |
|------:|-------|
| ≥ 70 | **critical** |
| 40–69 | **warning** |
| < 40 | **minor** |

**Damage-type weights** (higher = inherently more dangerous):

| Damage type | Weight |
|---|---:|
| pothole / alligator_crack | 1.00 |
| pipe_damage | 0.95 |
| leak | 0.90 |
| building_crack | 0.85 |
| transverse_crack | 0.75 |
| longitudinal_crack / crack | 0.70 |
| corrosion | 0.60 |
| spalling | 0.50 |

**Structural integrity** of an asset (for area forecasts):
`integrity = max(0, 100 − (avg_severity × 0.6 + max_severity × 0.4))`.

---

## 2. Repair cost & plan (per damage type × severity)

Each cell = `₹min–₹max · method · time · crew`. The estimate scales with area:
`cost = avg(min,max) × (1 + (area_ratio/100) × 2)` → 1×–3×.

### Pothole (D40)
- **minor** — ₹1,000–3,000 · Throw-and-roll patch · 30 min · crew 2
- **warning** — ₹3,000–10,000 · Semi-permanent patch · 1–2 h · crew 3
- **critical** — ₹10,000–30,000 · Full-depth repair · 3–6 h · crew 5

### Alligator crack (D20) — most severe
- **minor** — ₹3,000–10,000 · Surface seal coat · 2–4 h · crew 3
- **warning** — ₹10,000–40,000 · Mill and overlay · 1–2 days · crew 6
- **critical** — ₹40,000–150,000 · Full-depth reclamation + overlay · 2–5 days · crew 8

### Longitudinal crack (D00)
- **minor** — ₹500–2,000 · Crack sealing · 1–2 h · crew 2
- **warning** — ₹2,000–8,000 · Routing and sealing · 2–4 h · crew 3
- **critical** — ₹8,000–25,000 · Full-depth patching · 4–8 h · crew 5

### Transverse crack (D10)
- **minor** — ₹800–3,000 · Crack filling · 1–2 h · crew 2
- **warning** — ₹3,000–12,000 · Partial-depth repair · 3–5 h · crew 4
- **critical** — ₹12,000–35,000 · Full-depth reclamation · 6–10 h · crew 6

### Spalling (concrete)
- **minor** — ₹2,000–5,000 · Surface grinding · 1–2 h · crew 2
- **warning** — ₹5,000–15,000 · Concrete patching · 2–4 h · crew 3
- **critical** — ₹15,000–50,000 · Structural repair + overlay · 1–3 days · crew 6

### Corrosion
- **minor** — ₹3,000–8,000 · Rust treatment + sealant · 2–3 h · crew 2
- **warning** — ₹8,000–25,000 · Section replacement · 4–8 h · crew 4
- **critical** — ₹25,000–80,000 · Structural reinforcement · 2–5 days · crew 6

### Leak / pipe_damage
- **minor** — ₹1,500–5,000 · Joint sealing · 1–2 h · crew 2
- **warning** — ₹5,000–20,000 · Pipe repair + resurfacing · 4–8 h · crew 4
- **critical** — ₹20,000–60,000 · Pipeline replacement · 1–3 days · crew 6

### Building crack
- **minor** — ₹2,000–8,000 · Epoxy injection · 2–3 h · crew 2
- **warning** — ₹8,000–30,000 · Structural patching + reinforcement · 1–2 days · crew 4
- **critical** — ₹30,000–100,000 · Structural reinforcement + underpinning · 3–7 days · crew 8

---

## 3. Cost if ignored (the headline number)

Unrepaired damage worsens. Multiply the estimate to project the cost in ~6 months:

| Severity | Multiplier |
|---|---:|
| minor | **× 3** |
| warning | **× 4** |
| critical | **× 6** |

> e.g. a critical alligator crack at ₹40,000 today → **₹2,40,000** if ignored.

---

## 4. Priority (urgency) score

| Severity | Urgency |
|---|---:|
| critical | 100 |
| warning | 60 |
| minor | 20 |

Use urgency to rank the dispatch queue. Break ties by `cost_if_ignored` (higher first).

---

## 5. Failure forecast guidance

Estimate time-to-failure from severity + type:
- **critical** structural (alligator/pothole/pipe/building) → days to ~6 weeks.
- **warning** → ~2–6 months if untreated.
- **minor** → degrades over 6–12 months; cheap now, multiplies later.

State the honest basis ("based on severity + damage type"); never overclaim a precise date.
