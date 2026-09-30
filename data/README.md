# Synthetic demo data

**Synthetic demo data.** These files were generated for the MalariaLink hackathon prototype. They are not cEMR rows, not HMIS extracts, and not a description of real patients.

**Decision support tool. Not a replacement for clinical judgment.** The generator does not implement a treatment protocol and it does not calculate doses.

Phase 0 plan and schema overview: [`docs/README.md`](../docs/README.md).

## How to regenerate

From the repository root:

```powershell
python -m pip install -r data/requirements.txt
python data/generate_synthetic.py
```

Requires Python 3.10 or newer, NumPy, and pandas. The seed is `42` in `generate_synthetic.py`. Re-running overwrites:

- `cases_synthetic.csv` (5,000+ encounters)
- `facilities.csv`
- `stock_synthetic.csv`
- `generation_meta.json`

Do not hand-edit the CSVs. Change the constants at the top of the script, then regenerate. Pilot membership is the tuple `PILOT_DISTRICTS` (default Bugesera and Nyagatare).

The script exits with an error if its own checks fail (volume, class balance, invalid TDRs, non-arrival, seasonality, the scripted surge, the scripted stockouts). A passing run prints `Validation: PASSED`.

## What was intentionally left out

No names, phone numbers, national IDs, village names, or free-text clinical notes. CHW and case identifiers are pseudonymous (`CHW-BUG-01-01`, `CASE-000001`). Faker is not used here; there is nothing personal to fake. Facility coordinates are offsets from approximate district anchors so a later map has markers. They are not official GPS points from the Master Facility List.

## How a row is built

The window is 1 October 2024 through 30 September 2026.

1. Each district has an assumed base of encounters per day. A month factor raises volume in March–May and October–December and lowers it around July. This copies the **shape** of Rwanda's bimodal rains. It is not a model fitted to incidence.
2. From 15 August 2026, Nyagatare is multiplied by 3 so the dashboard story is a surge against September 2025. The factor is large because a smaller one disappears into day-to-day randomness. That shock is scripted.
3. Inside a district, the encounter is assigned to a health center and one of four CHW ids at that center.
4. Age is mostly under five, with a thin tail of older children and adults, and a small infant share.
5. Placeholder danger signs are uncommon and slightly clustered. A second sign is more likely once one is present.
6. Fever duration and temperature are correlated. Temperature includes Gaussian measurement noise. **Temperature never selects the decision.** There is no invented fever cutoff.
7. TDR results are `positive`, `negative`, or `invalid`. Invalid results are common enough to demo a repeat-test referral. A small share of TDR values are then flipped to mimic a recording error. Positivity varies a little with season and district. Those positivity weights are assumptions.
8. A placeholder rule assigns a clean decision. Recording noise then changes a minority of labels so the file contains the inconsistent paper practice the product is meant to reduce. On top of that random noise, the generator forces at least eight `convulsions = 1` rows to `treat_at_home` and clears any referral fields on those rows. A reviewer can always point at a missed danger sign. Uncomplicated visits recorded as `refer` come from the random over-referral noise.

### Placeholder rules inside the generator

These constants are the Phase 1 copy of the future `rules/malaria_rules.yaml`.

> TO BE VALIDATED against the Rwanda national malaria treatment guidelines and WHO iCCM guidance by a clinician.

| Recorded feature | Placeholder decision | Notes |
| --- | --- | --- |
| Any of convulsions, unable to drink or feed, vomiting everything, lethargy or unconsciousness, severe breathing difficulty | `urgent_refer` | Widely cited iCCM general danger signs. Severe breathing difficulty is one bucket; chest indrawing is not a separate column until a clinician splits it. |
| `age_months` < 2 | `urgent_refer` | Common iCCM programmatic convention for sick young infants. Placeholder threshold `INFANT_REFER_MONTHS`. |
| TDR `invalid`, and no row above fired | `refer` | Operational repeat-test referral, not a severity grade. |
| TDR `negative` and `fever_days` ≥ 3, and no row above fired | `refer` | Placeholder follow-up interval only. Not a severe-malaria cutoff. |
| Otherwise | `treat_at_home` | Includes uncomplicated TDR-positive fever and mild TDR-negative illness with short fever. The label means "no referral in this demo," not a drug order. |

The rules engine in Phase 2 must follow this table (once a clinician edits the YAML). It must not learn the noisy `decision` column as if the noise were correct care.

### Referral, delay, and outcome

- Home-care rows have `referral_completed = 0` and an empty `arrival_delay_hours`. Empty delay means "no arrival," which covers both home care and referrals that never arrived. Filter on `decision` before interpreting completion.
- Referred rows arrive about four times out of five, less often from facilities marked `remote` and in the rain months March–May and October–November. Non-arrival is required by the checks to stay above 10% of referrals.
- Arrival delay is a lognormal draw, shorter for `urgent_refer`, longer when remote or rainy, clipped to 0.4–96 hours.
- `outcome` is `recovered`, `complication`, `died`, or `unknown`. Weights are mechanistic and invented: a danger-sign case recorded as home care, or an urgent referral that never arrives, more often ends as `complication` or `unknown`. Death is kept rare on purpose.

**Do not quote outcome rates, completion rates, or case counts from these files as epidemiology or as impact.**

### Stock

Each facility has a weekly row for `ACT`, `RDT`, and `injectable_artesunate`. Consumption is a Poisson draw scaled from that district's synthetic encounters that week, shared across its facilities. On-hand stock is mostly several weeks of cover, sometimes low, sometimes zero.

Units are logistics counts only (courses, kits, vials). They are not milligram doses and must not be shown as dosing advice.

Scripted shortages, so Demo Mode does not depend on luck:

- Bugesera, commodity `ACT`, week starts 2026-09-07, 2026-09-14, 2026-09-21, 2026-09-28: stockout at every Bugesera facility.
- Nyagatare, commodity `injectable_artesunate`, week starts from 2026-08-17 through 2026-09-28: remote facilities stock out; other Nyagatare facilities sit at a token remainder.

`weeks_of_cover` is on-hand divided by consumed, capped at 52, and 0 when the shelf is empty.

## Labels for the Phase 2 models

Derive these in the training script. They are not extra CSV columns, so the case file stays on the agreed schema.

- `severe_case` = 1 when any danger-sign column is 1 or `age_months` < `INFANT_REFER_MONTHS`. Do **not** use `decision`. That column includes non-severe referrals (invalid TDR, persistent fever) and protocol misses.
- `referral_not_completed` = 1 when `decision` is `refer` or `urgent_refer` and `referral_completed` is 0. Fit that model on referred rows only.

Any metric computed from this file demonstrates that the training path runs. It does not demonstrate clinical performance.

## Calibrate before any public claim

Replace the assumed weights in `generate_synthetic.py` with figures the team can cite. The script does not download these sources.

| Parameter in the script | Public place to calibrate it |
| --- | --- |
| District volume and the seasonal shape | RBC malaria reports, HMIS / DHIS2 |
| Age and care-seeking mix | DHS and the Malaria Indicator Survey |
| Geographic risk if the pilot map needs a real surface | Malaria Atlas Project |
| Danger-sign frequency | iCCM studies and the national protocol, after clinician review |
| Facility list and coordinates | Ministry of Health Master Facility List |
| ACT, RDT, and injectable artesunate stock | eLMIS and RBC supply chain |

Until that calibration happens, the honest sentence in the UI and on stage is: **Synthetic demo data.**

## Commit-style summary — Phase 1

Add a seeded generator for synthetic encounters, facilities, and commodity stock, with placeholder iCCM rules, visible protocol-deviation noise, non-arriving referrals, and scripted surge and stockout weeks for the demo.
