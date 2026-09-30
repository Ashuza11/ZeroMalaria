# 3-minute live demo script — ZeroMalaria

**Synthetic demo data.** Decision support tool. Not a replacement for clinical judgment.

## Setup (before judges enter)

1. Seed API: `.\.venv\Scripts\python apps\api\app\seed.py`
2. API: `cd apps\api` then `..\..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000`
3. Web: `cd apps\web` then `npm run dev`
4. Open phone-width window on `http://localhost:5173`
5. Optional: use **Demo Mode** on Home (replays scripted cases even offline)

## Minute-by-minute

### 0:00–0:20 — Problem and user
Paper triage in the village. Danger signs are not checked the same way every time. Nobody knows if a referred child arrived. Introduce the CHW on an Android phone. Language screen defaults to **Kinyarwanda**. Point at the disclaimer.

### 0:20–1:00 — Case A (treat at home)
Desktop: login as CHW → `/app/chw` → New triage (StepperLayout with Listen). Tap to enable voice if prompted.
Phone: Home → New patient (or Demo Mode → Case A).

| Field | Value |
| --- | --- |
| Age | 36 months |
| Sex | Female |
| Temperature | 38.6 °C |
| Fever | 2 days |
| Danger signs | All no |
| TDR | Positive |

**Expected:** green **Treat at home**, reasons show no danger sign, CHW confirms. No drug dose on screen.

### 1:00–1:50 — Case B (urgent, airplane mode)
Toggle airplane mode / DevTools Offline. New patient / Demo Case B.

| Field | Value |
| --- | --- |
| Age | 28 months |
| Sex | Male |
| Temperature | 39.4 °C |
| Fever | 2 days |
| Convulsions | Yes |
| TDR | Positive |

**Expected:** red **URGENT referral**. Say out loud: a model cannot turn this amber or green. Confirm → handover with QR and SMS text. Sync badge shows pending/offline. Restore network → badge clears.

### 1:50–2:15 — Health center
Open `/facility`. Case B appears at top. Tap **Received**. CHW **My referrals** timeline moves to received.

### 2:15–2:35 — Missed arrival
Open **Alerts**. Seeded overdue referral (or Demo Mode seed) shows: *Patient has not arrived, follow up*.

### 2:35–3:00 — RBC dashboard
Open `/rbc`. If online, point at the **Potential increase detected (statistical signal)** banner (top district vs baseline — not outbreak confirmation). Show KPI strip, Nyagatare surge, referral funnel (where patients are lost), Bugesera ACT / Nyagatare artesunate stock pressure. **Synthetic demo data** badge stays visible. Close on disclaimer and: metrics here prove the architecture, not clinical performance.
