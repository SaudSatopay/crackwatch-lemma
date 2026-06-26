#input_type_name: ScoreReportInput
#output_type_name: ScoreReportResult
#function_name: score_report

from typing import Optional
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod

# --- Ported from CrackWatch cost_engine.py / severity.py (INR, Indian municipal rates) ---
# (min, max, method, eta, crew) per damage_type x severity_label
REPAIR_COSTS = {
    "pothole": {"minor": (1000, 3000, "Throw-and-roll patch", "30 min", 2),
                "warning": (3000, 10000, "Semi-permanent patch", "1-2 h", 3),
                "critical": (10000, 30000, "Full-depth repair", "3-6 h", 5)},
    "alligator_crack": {"minor": (3000, 10000, "Surface seal coat", "2-4 h", 3),
                "warning": (10000, 40000, "Mill and overlay", "1-2 days", 6),
                "critical": (40000, 150000, "Full-depth reclamation + overlay", "2-5 days", 8)},
    "longitudinal_crack": {"minor": (500, 2000, "Crack sealing", "1-2 h", 2),
                "warning": (2000, 8000, "Routing and sealing", "2-4 h", 3),
                "critical": (8000, 25000, "Full-depth patching", "4-8 h", 5)},
    "transverse_crack": {"minor": (800, 3000, "Crack filling", "1-2 h", 2),
                "warning": (3000, 12000, "Partial-depth repair", "3-5 h", 4),
                "critical": (12000, 35000, "Full-depth reclamation", "6-10 h", 6)},
    "spalling": {"minor": (2000, 5000, "Surface grinding", "1-2 h", 2),
                "warning": (5000, 15000, "Concrete patching", "2-4 h", 3),
                "critical": (15000, 50000, "Structural repair + overlay", "1-3 days", 6)},
    "corrosion": {"minor": (3000, 8000, "Rust treatment + sealant", "2-3 h", 2),
                "warning": (8000, 25000, "Section replacement", "4-8 h", 4),
                "critical": (25000, 80000, "Structural reinforcement", "2-5 days", 6)},
    "leak": {"minor": (1500, 5000, "Joint sealing", "1-2 h", 2),
                "warning": (5000, 20000, "Pipe repair + resurfacing", "4-8 h", 4),
                "critical": (20000, 60000, "Pipeline replacement", "1-3 days", 6)},
    "pipe_damage": {"minor": (5000, 15000, "Pipe patch repair", "2-4 h", 3),
                "warning": (15000, 50000, "Section replacement", "1-2 days", 5),
                "critical": (50000, 200000, "Full pipeline replacement", "3-10 days", 8)},
    "building_crack": {"minor": (2000, 8000, "Epoxy injection", "2-3 h", 2),
                "warning": (8000, 30000, "Structural patching + reinforcement", "1-2 days", 4),
                "critical": (30000, 100000, "Structural reinforcement + underpinning", "3-7 days", 8)},
}
IGNORE_MULT = {"minor": 3.0, "warning": 4.0, "critical": 6.0}
URGENCY = {"minor": 20, "warning": 60, "critical": 100}
VALID_TYPES = {"pothole", "longitudinal_crack", "transverse_crack", "alligator_crack",
               "spalling", "corrosion", "leak", "building_crack", "pipe_damage", "other"}


def _label(sev: float) -> str:
    if sev >= 70:
        return "critical"
    if sev >= 40:
        return "warning"
    return "minor"


class ScoreReportInput(BaseModel):
    report_id: str
    damage_type: Optional[str] = None
    severity: Optional[float] = None
    severity_label: Optional[str] = None
    area_ratio: Optional[float] = None


class ScoreReportResult(BaseModel):
    report_id: str
    severity_label: str
    est_cost_inr: int
    cost_if_ignored_inr: int
    repair_method: str
    repair_eta: str
    crew_size: int
    priority_score: int
    status: str


async def score_report(ctx: FunctionContext, data: ScoreReportInput) -> ScoreReportResult:
    pod = Pod.from_env()

    dmg = (data.damage_type or "other").strip().lower().replace(" ", "_")
    sev = float(data.severity) if data.severity is not None else 50.0
    label = (data.severity_label or _label(sev)).strip().lower()
    if label not in IGNORE_MULT:
        label = _label(sev)
    area = float(data.area_ratio) if data.area_ratio is not None else 5.0

    table = REPAIR_COSTS.get(dmg) or REPAIR_COSTS["longitudinal_crack"]
    cmin, cmax, method, eta, crew = table.get(label) or table["minor"]
    cost_avg = (cmin + cmax) / 2.0
    area_mult = 1.0 + (area / 100.0) * 2.0          # area scaling: 1x .. 3x
    est = int(cost_avg * area_mult)
    ignored = int(est * IGNORE_MULT.get(label, 3.0))
    priority = URGENCY.get(label, 20)
    status = "pending_approval" if label == "critical" else "triaged"

    pod.table("reports").update(data.report_id, {
        "severity": sev,
        "severity_label": label,
        "area_ratio": area,
        "damage_type": dmg if dmg in VALID_TYPES else "other",
        "est_cost_inr": est,
        "cost_if_ignored_inr": ignored,
        "repair_method": method,
        "repair_eta": eta,
        "crew_size": crew,
        "priority_score": priority,
        "status": status,
    })

    return ScoreReportResult(
        report_id=data.report_id, severity_label=label, est_cost_inr=est,
        cost_if_ignored_inr=ignored, repair_method=method, repair_eta=eta,
        crew_size=crew, priority_score=priority, status=status,
    )
