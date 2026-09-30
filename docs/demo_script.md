# 3-minute live demo script — ZeroMalaria

**Synthetic demo data.** Decision support tool. Not a replacement for clinical judgment.  
Pilot framing districts: **Gisagara** and **Nyamagabe** (*source: RBC problem canvas, to be verified*).

## Setup (before judges enter)

1. Seed: `.\.venv\Scripts\python apps\api\app\seed.py` (or `make seed`)
2. API: `cd apps\api` → `..\..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000`
3. Web: `cd apps\web` → `npm run dev`
4. Login as `rbc.admin` / `demo1234` (username + password only — no role buttons)
5. Open Presenter menu → **Live Demo Board** (`/demo/board`) on a large screen

## Minute-by-minute

### 0:00–0:25 — Problem vs existing tools
Village paper triage; RapidSMS is async with no decision support; ePOCT+ stops at the facility door; drones fix stock not triage accuracy. ZeroMalaria closes the **village → clinic → follow-up** loop.

### 0:25–1:10 — Live Demo Board (cross-role)
On `/demo/board`, click **Run loop demo**. Point at the three panes:

1. CHW creates urgent referral  
2. Health center inbox receives it (badge / new row)  
3. Status moves Received → Arrived; RBC pane stays on the same data stream  

Say: one action ripples across roles — not three disconnected apps.

### 1:10–1:50 — Voice guided urgent case
Login as CHW → `/app/chw` → **Tangira isuzuma ryo mu majwi** (or Presenter → Scripted voice demo).  
Convulsions case → red **Byihutirwa / URGENT**. Emphasize: rules lock urgency; ML cannot downgrade; no drug names. Confirm → handover.

### 1:50–2:20 — Nurse thread
`/app/referrals` → open the urgent row → mark **Received** → send quick message “Prepare transport”.  
CHW **My referrals** advances; overdue **Alerts** for never-arrived cases.

### 2:20–3:00 — RBC dashboard
`/app/dashboard`: hotspot banner **Potential increase detected (statistical signal)** (never “outbreak confirmed”), funnel drop-off, stock pressure, **Synthetic demo data** badge. Close on disclaimer.

## Offline backup (if Wi‑Fi fails)

Presenter → Simulate offline → Case B on `/m/triage` → urgent still works → restore network → sync clears pending.
