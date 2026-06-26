#input_type_name: DispatchInput
#output_type_name: DispatchResult
#function_name: dispatch_repair

from typing import Optional
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class DispatchInput(BaseModel):
    report_id: str
    approved: bool = True
    contractor_id: Optional[str] = None
    note: Optional[str] = None
    actor: Optional[str] = "system"


class DispatchResult(BaseModel):
    report_id: str
    status: str
    assigned_contractor: Optional[str] = None


async def dispatch_repair(ctx: FunctionContext, data: DispatchInput) -> DispatchResult:
    pod = Pod.from_env()
    report = pod.table("reports").get(data.report_id)

    # Rejected at review -> close it out.
    if not data.approved:
        pod.table("reports").update(data.report_id, {"status": "rejected"})
        pod.table("report_events").create({
            "report_id": data.report_id, "kind": "rejected",
            "note": data.note or "Rejected at review", "actor": data.actor or "inspector",
        })
        return DispatchResult(report_id=data.report_id, status="rejected")

    # Pick a contractor: explicit id, else an active one in the report's sector, else any active.
    contractor = None
    if data.contractor_id:
        try:
            contractor = pod.table("contractors").get(data.contractor_id)
        except Exception:
            contractor = None
    if contractor is None:
        sector = (report or {}).get("sector")
        rows = pod.records.list(
            "contractors", limit=100,
            filter=[{"field": "status", "op": "eq", "value": "active"}],
        ).to_dict()["items"]
        pool = [c for c in rows if sector and c.get("sector") == sector] or rows
        contractor = pool[0] if pool else None

    upd = {"status": "dispatched"}
    cname = None
    if contractor:
        cname = contractor.get("name")
        upd["assigned_contractor_id"] = str(contractor["id"])
        upd["assigned_contractor"] = cname
        pod.table("contractors").update(str(contractor["id"]), {
            "assigned_count": int(contractor.get("assigned_count") or 0) + 1,
        })

    pod.table("reports").update(data.report_id, upd)
    pod.table("report_events").create({
        "report_id": data.report_id, "kind": "dispatched",
        "note": data.note or (f"Dispatched to {cname}" if cname else "Dispatched (no contractor in pool)"),
        "actor": data.actor or "system",
    })
    return DispatchResult(report_id=data.report_id, status="dispatched", assigned_contractor=cname)
