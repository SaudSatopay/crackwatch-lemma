#!/usr/bin/env bash
# Seed demo citizen profiles so the gamification leaderboard + podium look alive.
# Run AFTER the profiles table exists:  lemma pods import ./crackwatch/tables/profiles --pod crackwatch
# From the workspace root:               bash crackwatch/seed/seed_profiles.sh
# Safe to re-run — duplicate user_key inserts are skipped (unique constraint).
export PATH="$HOME/.local/bin:$PATH"
export PYTHONUTF8=1
L="lemma --pod crackwatch"

echo "==> Seeding demo citizen profiles…"
$L records create profiles --data '{"user_key":"Priya Sharma","name":"Priya Sharma","xp":2450,"coins":380,"level":5,"streak_days":12,"last_report_date":"2026-06-26","total_reports":41,"total_points":490,"verifications":8,"ai_challenge_score":14,"ai_challenges_played":16,"achievements":["first_report","five_reports","ten_reports","twenty_five_reports","streak_3","streak_7","critical_finder","multi_sector"],"sectors_reported":["road","building","pipeline","bridge"],"recent_reports":[]}' || echo "  (skip — exists)"
$L records create profiles --data '{"user_key":"Rohan Mehta","name":"Rohan Mehta","xp":1680,"coins":240,"level":5,"streak_days":7,"last_report_date":"2026-06-26","total_reports":28,"total_points":336,"verifications":5,"ai_challenge_score":9,"ai_challenges_played":12,"achievements":["first_report","five_reports","ten_reports","twenty_five_reports","streak_3","streak_7","critical_finder"],"sectors_reported":["road","pipeline","bridge"],"recent_reports":[]}' || echo "  (skip — exists)"
$L records create profiles --data '{"user_key":"Ananya Iyer","name":"Ananya Iyer","xp":1120,"coins":160,"level":4,"streak_days":4,"last_report_date":"2026-06-26","total_reports":19,"total_points":224,"verifications":3,"ai_challenge_score":6,"ai_challenges_played":8,"achievements":["first_report","five_reports","ten_reports","streak_3","critical_finder","multi_sector"],"sectors_reported":["road","building","pipeline"],"recent_reports":[]}' || echo "  (skip — exists)"
$L records create profiles --data '{"user_key":"Vikram Singh","name":"Vikram Singh","xp":640,"coins":95,"level":3,"streak_days":2,"last_report_date":"2026-06-25","total_reports":11,"total_points":128,"verifications":1,"ai_challenge_score":3,"ai_challenges_played":5,"achievements":["first_report","five_reports","ten_reports","critical_finder"],"sectors_reported":["road","building"],"recent_reports":[]}' || echo "  (skip — exists)"
$L records create profiles --data '{"user_key":"Meera Nair","name":"Meera Nair","xp":310,"coins":70,"level":2,"streak_days":1,"last_report_date":"2026-06-26","total_reports":6,"total_points":62,"verifications":0,"ai_challenge_score":1,"ai_challenges_played":2,"achievements":["first_report","five_reports"],"sectors_reported":["road"],"recent_reports":[]}' || echo "  (skip — exists)"
$L records create profiles --data '{"user_key":"Arjun Reddy","name":"Arjun Reddy","xp":95,"coins":60,"level":1,"streak_days":0,"last_report_date":"2026-06-24","total_reports":2,"total_points":19,"verifications":0,"ai_challenge_score":0,"ai_challenges_played":0,"achievements":["first_report"],"sectors_reported":["road"],"recent_reports":[]}' || echo "  (skip — exists)"

echo "==> Done. Open the citizen app → Rewards → Rank."
