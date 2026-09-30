# Phase 8 — demo polish notes

**Synthetic demo data.** Use these checks before presenting to judges.

## Before demo

- [ ] Run `seed.py` so demo referrals, overdue alert, and demo users exist.
- [ ] API on `:8000`, web on `:5173`; login or quick demo role switcher works.
- [ ] **Synthetic demo data** badge visible on RBC and disclaimers on triage result.
- [ ] Demo Mode (Presenter menu) replays Case A / Case B offline if network fails.

## During demo

- [ ] Case B: say urgent referral **cannot** be downgraded by ML.
- [ ] Facility: **Received / Arrived / Treated** updates with success toast; inbox polls ~8s.
- [ ] RBC: hotspot banner reads **Potential increase detected (statistical signal)** — never “outbreak confirmed”.
- [ ] Alerts: overdue referral message for closed-loop story.

## Visual / UX

- [ ] Kinyarwanda default on language screen; English one tap.
- [ ] CHW mobile shell ≤480px; facility/RBC use desktop sidebar where applicable.
- [ ] No drug doses on treat-at-home screen.

## If something breaks

- Fall back to Demo Mode scripted cases on CHW home.
- RBC offline: KPI mock + empty hotspot signals (no crash).
- Re-seed: `.\.venv\Scripts\python apps\api\app\seed.py`

See also: [demo_script.md](demo_script.md), [qa_cheatsheet.md](qa_cheatsheet.md).
