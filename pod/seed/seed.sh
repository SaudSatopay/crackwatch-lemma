#!/usr/bin/env bash
# Seed CrackWatch demo data. Run AFTER `lemma pods import ./crackwatch` succeeds.
# From the workspace root:  bash crackwatch/seed/seed.sh
set -e
export PATH="$HOME/.local/bin:$PATH"
export MSYS_NO_PATHCONV=1   # Git Bash: keep pod paths like /knowledge from being rewritten to C:\...
L="lemma --pod crackwatch"

echo "==> Uploading the rubric into /knowledge (RAG)…"
$L files upload "crackwatch/seed/knowledge/crackwatch_rubric.md" /knowledge/crackwatch_rubric.md || true

echo "==> Contractors (the wall of shame)…"
$L records create contractors --data '{"name":"Apex Roadworks","sector":"Ward 7","contact":"apex@city.gov","assigned_count":6,"resolved_count":5,"overdue_count":1,"avg_fix_days":4.2,"negligence_score":12,"status":"active"}'
$L records create contractors --data '{"name":"Metro Civil Co","sector":"Ward 3","contact":"metro@city.gov","assigned_count":9,"resolved_count":3,"overdue_count":6,"avg_fix_days":11.5,"negligence_score":58,"status":"flagged"}'
$L records create contractors --data '{"name":"Skyline Infra","sector":"Ward 12","contact":"skyline@city.gov","assigned_count":4,"resolved_count":4,"overdue_count":0,"avg_fix_days":3.1,"negligence_score":3,"status":"active"}'
$L records create contractors --data '{"name":"Unity Builders","sector":"Ward 7","contact":"unity@city.gov","assigned_count":7,"resolved_count":2,"overdue_count":5,"avg_fix_days":14.0,"negligence_score":71,"status":"flagged"}'

echo "==> Pre-filled reports so the board isn't empty…"
$L records create reports --data '{"title":"Alligator cracking, MG Road","description":"Large interconnected cracks across the lane near the signal.","location_text":"MG Road x 5th Ave","sector":"Ward 7","reporter_channel":"app","damage_type":"alligator_crack","severity":82,"severity_label":"critical","area_ratio":18,"confidence":0.9,"failure_forecast":"Surface failure likely within ~6 weeks","est_cost_inr":48000,"cost_if_ignored_inr":288000,"repair_method":"Full-depth reclamation + overlay","repair_eta":"2-5 days","crew_size":8,"priority_score":100,"status":"dispatched","assigned_contractor":"Apex Roadworks"}'
$L records create reports --data '{"title":"Pothole near bus stop","description":"Deep pothole, two-wheelers swerving.","location_text":"Sector 3 bus stop","sector":"Ward 3","reporter_channel":"whatsapp","damage_type":"pothole","severity":74,"severity_label":"critical","area_ratio":9,"confidence":0.86,"failure_forecast":"Expanding fast in monsoon","est_cost_inr":21000,"cost_if_ignored_inr":126000,"repair_method":"Full-depth repair","repair_eta":"3-6 h","crew_size":5,"priority_score":100,"status":"resolved","assigned_contractor":"Metro Civil Co"}'
$L records create reports --data '{"title":"Hairline transverse crack","description":"Thin crack across the service road.","location_text":"Ward 12 lane 4","sector":"Ward 12","reporter_channel":"web","damage_type":"transverse_crack","severity":33,"severity_label":"minor","area_ratio":3,"confidence":0.8,"failure_forecast":"Slow; monitor over 6-12 months","est_cost_inr":2100,"cost_if_ignored_inr":6300,"repair_method":"Crack filling","repair_eta":"1-2 h","crew_size":2,"priority_score":20,"status":"dispatched","assigned_contractor":"Skyline Infra"}'

echo "==> One LIVE report (minimal fields) — this is the hero: triage should fill it in."
$L records create reports --data '{"title":"Possible pipe leak flooding road","description":"Water bubbling up through the asphalt; the surface is sinking around it.","location_text":"Ward 7, Industrial Rd","sector":"Ward 7","reporter_channel":"telegram","status":"new"}'

echo "==> Done. Try:  lemma records list reports   |   open the command-center app"
