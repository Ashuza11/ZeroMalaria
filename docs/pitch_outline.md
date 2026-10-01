# 5-minute pitch outline — ZeroMalaria

**Audience:** AI for Public Good Challenge, University of Rwanda / UR UNIPOD  
**Institutional owner:** Rwanda Biomedical Centre (RBC)  
**Synthetic demo data.** Decision support tool. Not a replacement for clinical judgment.

## 1. Problem (45s)
Village-level malaria triage still runs on memory and paper. Danger-sign checks are not standardized. Referred patients are not tracked. Severe cases are recognized late or lost between the village and the health facility. That broken loop causes preventable complications and deaths.

## 2. User (30s)
Primary user is the Community Health Worker: a non-physician volunteer, often on a low-end Android phone, often offline, often preferring Kinyarwanda. Secondary user is the health-center nurse who must know who is coming and how urgent they are. Tertiary user is the RBC or district officer who must see surge and stock pressure in time to act.

## 3. Current situation (30s)
Paper registers. Inconsistent triage. No closed-loop referral. Delayed visibility of outbreaks and stockouts. Online-only apps fail in the same villages that need them most.

**Existing tools and gaps** (*source: RBC problem canvas, to be verified*):

| Tool | What it does | Gap ZeroMalaria targets |
| --- | --- | --- |
| RapidSMS (CHW SMS) | Aggregated reporting | Async; no real-time decision support; no referral loop closure |
| ePOCT+ | Facility clinical decision support | Misses village-to-clinic handover |
| Drone medicine delivery | Supply logistics | Does not fix triage accuracy or patient journey tracking |

## 4. Data (30s)
A real deployment would sit next to cEMR, national malaria protocols, referral records, and HMIS/eLMIS. **This prototype uses synthetic demo data** built from public guideline categories, clearly labeled in the UI and README. We do not claim clinical performance from these files.

## 5. Solution (90s)
ZeroMalaria is three modules on one offline-first architecture:

1. **CHW app** — guided one-question triage, local rules engine, digital handover, referral timeline, “patient has not arrived” alerts. Works in airplane mode.
2. **Health center inbox** — urgency-sorted referrals, one-tap Received / Arrived / Treated.
3. **RBC dashboard** — KPIs, district map, baseline forecast band, referral funnel, stock pressure.

**Safety:** Deterministic RBC rules produce the decision locally. Voice and the handoff generator cannot change it. The CHW always confirms and every recommendation shows why.

## 6. Impact (30s)
Impact is the closed loop: standardized danger-sign checks, digital handover, follow-up when a patient never arrives, and earlier visibility of surge and stockouts. We will not invent a percent of deaths averted from synthetic data.

## 7. Ethics and safety (30s)
Privacy by design (pseudonymous IDs, no real patients). Human in the loop. Clinical rules in one editable YAML marked for clinician validation against Rwanda national guidelines and WHO iCCM. Bias and calibration must be reviewed before any pilot claim. See `ethics_and_safety.md`.

## 8. Pilot plan (30s)
Two districts: **Gisagara** and **Nyamagabe** (*source: RBC problem canvas, to be verified*; seed also includes Nyamasheke / Nyagatare for demo breadth). Start with willing CHW cohorts and linked health centers. Validate rules with RBC clinicians. Measure process metrics first (completed danger-sign checks, referral receipt, arrival confirmation), not clinical outcomes, until protocol validation is complete.

## 9. Sustainability (20s)
RBC ownership of rules and data governance. Offline-first PWA keeps costs low. Open, auditable decision layers. Align with existing HMIS/eLMIS rather than replacing them.

## 10. Ask (20s)
We ask for: clinician validation of the rules file; a supervised CHW pilot in the two districts; and a data-governance agreement under RBC so synthetic weights can be replaced with calibrated public sources.
