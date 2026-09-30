#!/usr/bin/env python3
"""Generate synthetic MalariaLink demo datasets.

ALL OUTPUT IS SYNTHETIC DEMO DATA.
It is not a patient extract and it is not a surveillance estimate.
Proportions are assumed so the software pipeline can be demonstrated.
Calibrate them with DHIS2/HMIS, the Malaria Atlas Project, and DHS/MIS
before anyone states an epidemiological claim.

Clinical placeholders below must stay aligned with rules/malaria_rules.yaml
once Phase 2 adds that file. They are not a validated Rwanda protocol.

TO BE VALIDATED against the Rwanda national malaria treatment guidelines
and WHO iCCM guidance by a clinician.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Configurable demo settings
# ---------------------------------------------------------------------------

GENERATOR_VERSION = "1.0.0"
SEED = 42
START_DATE = date(2024, 10, 1)
END_DATE = date(2026, 9, 30)

# Two pilot districts. Edit this tuple to move the pilot.
PILOT_DISTRICTS = ("Bugesera", "Nyagatare")

# Expected encounters per day before the seasonal multiplier.
# These are demo weights, not incidence rates.
DISTRICT_BASE_DAILY = {
    "Nyagatare": 2.6,
    "Bugesera": 2.3,
    "Kirehe": 1.5,
    "Gisagara": 1.2,
    "Rusizi": 1.0,
    "Gasabo": 0.55,
}

# Qualitative bimodal rain shape. Not fitted to a transmission model.
SEASON_FACTOR = {
    1: 0.90,
    2: 0.95,
    3: 1.25,
    4: 1.50,
    5: 1.35,
    6: 0.85,
    7: 0.70,
    8: 0.72,
    9: 0.95,
    10: 1.20,
    11: 1.45,
    12: 1.15,
}

# Scripted late-window surge so the RBC view has a stable story.
SURGE_DISTRICT = "Nyagatare"
SURGE_START = date(2026, 8, 15)
# Large on purpose. A modest multiplier disappears under Poisson noise and
# the September comparison stops looking like a surge.
SURGE_MULTIPLIER = 3.0

# PLACEHOLDER, TO BE VALIDATED.
# iCCM programs commonly refer sick infants under 2 months instead of
# managing them in the community. This is not a locally validated cutoff.
INFANT_REFER_MONTHS = 2

# PLACEHOLDER, TO BE VALIDATED.
# Common iCCM counseling is to reassess around day 3 if illness is not
# improving. Used here only to label a non-urgent referral when fever
# persists and the TDR is negative. Not a severity threshold.
PERSISTENT_FEVER_DAYS = 3

# Placeholder general danger signs (iCCM). Probabilities are demo assumptions.
DANGER_SIGN_P = {
    "convulsions": 0.012,
    "unable_to_drink": 0.028,
    "vomiting_everything": 0.022,
    "lethargy": 0.024,
    "severe_breathing_difficulty": 0.016,
}

# Share of rule-following decisions that the "paper register" records wrong.
# The Phase 2 rules engine must not imitate these flips.
NOISE_URGENT_TO_TREAT = 0.03
NOISE_URGENT_TO_REFER = 0.06
NOISE_TREAT_TO_REFER = 0.05
NOISE_REFER_TO_TREAT = 0.03
TDR_RECORDING_FLIP_P = 0.02

COMMODITIES = {
    "ACT": "ACT course (logistics unit, not a dose)",
    "RDT": "RDT kit",
    "injectable_artesunate": "injectable artesunate vial (logistics unit, not a dose)",
}

STOCKOUT_P = {"ACT": 0.05, "RDT": 0.04, "injectable_artesunate": 0.10}

# Mondays. 30 Sep 2026 is a Wednesday, so these are the September 2026 weeks.
BUGESERA_ACT_STOCKOUT_WEEKS = (
    date(2026, 9, 7),
    date(2026, 9, 14),
    date(2026, 9, 21),
    date(2026, 9, 28),
)
NYAGATARE_ARTESUNATE_PRESSURE_WEEKS = (
    date(2026, 8, 17),
    date(2026, 8, 24),
    date(2026, 8, 31),
    date(2026, 9, 7),
    date(2026, 9, 14),
    date(2026, 9, 21),
    date(2026, 9, 28),
)

# Approximate public district anchors. Offsets are schematic map positions,
# not Master Facility List coordinates.
DISTRICT_ANCHOR = {
    "Bugesera": (-2.18, 30.14),
    "Nyagatare": (-1.38, 30.32),
    "Kirehe": (-2.27, 30.66),
    "Gisagara": (-2.60, 29.85),
    "Rusizi": (-2.49, 29.00),
    "Gasabo": (-1.91, 30.09),
}

DISTRICT_CODE = {
    "Bugesera": "BUG",
    "Nyagatare": "NYG",
    "Kirehe": "KIR",
    "Gisagara": "GIS",
    "Rusizi": "RUS",
    "Gasabo": "GAS",
}

# district, sector, remote, latitude offset, longitude offset
FACILITY_SPECS: tuple[tuple[str, str, int, float, float], ...] = (
    ("Bugesera", "Nyamata", 0, 0.02, 0.01),
    ("Bugesera", "Rilima", 0, -0.04, 0.06),
    ("Bugesera", "Mayange", 0, 0.06, -0.03),
    ("Bugesera", "Mareba", 1, -0.08, -0.02),
    ("Bugesera", "Ntarama", 0, 0.01, 0.08),
    ("Bugesera", "Gashora", 1, -0.10, 0.05),
    ("Nyagatare", "Nyagatare", 0, 0.01, 0.02),
    ("Nyagatare", "Karangazi", 1, 0.10, 0.08),
    ("Nyagatare", "Rwimiyaga", 1, 0.07, -0.07),
    ("Nyagatare", "Matimba", 0, -0.05, 0.05),
    ("Nyagatare", "Mimuri", 0, -0.02, -0.06),
    ("Nyagatare", "Katabagemu", 1, 0.04, 0.11),
    ("Kirehe", "Kirehe", 0, 0.02, 0.02),
    ("Kirehe", "Gahara", 0, -0.05, -0.04),
    ("Kirehe", "Mahama", 1, 0.06, 0.07),
    ("Gisagara", "Gisagara", 0, 0.02, 0.01),
    ("Gisagara", "Save", 0, -0.04, 0.05),
    ("Gisagara", "Kibirizi", 0, 0.05, -0.04),
    ("Rusizi", "Kamembe", 0, 0.02, 0.03),
    ("Rusizi", "Bugarama", 1, -0.08, -0.02),
    ("Rusizi", "Gihundwe", 0, 0.04, -0.05),
    ("Gasabo", "Kimironko", 0, 0.03, 0.02),
    ("Gasabo", "Remera", 0, -0.02, 0.03),
    ("Gasabo", "Kacyiru", 0, 0.01, -0.02),
)

CASE_COLUMNS = [
    "case_id",
    "date",
    "district",
    "sector",
    "chw_id",
    "age_months",
    "sex",
    "temperature_c",
    "fever_days",
    "convulsions",
    "unable_to_drink",
    "vomiting_everything",
    "lethargy",
    "severe_breathing_difficulty",
    "tdr_result",
    "decision",
    "referral_completed",
    "arrival_delay_hours",
    "outcome",
]

OUTCOME_LEVELS = ("recovered", "complication", "died", "unknown")
DECISION_LEVELS = ("treat_at_home", "refer", "urgent_refer")
TDR_LEVELS = ("positive", "negative", "invalid")

DATA_DIR = Path(__file__).resolve().parent


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def burden_multiplier(district: str, day: date) -> float:
    factor = SEASON_FACTOR[day.month]
    if district == SURGE_DISTRICT and day >= SURGE_START:
        factor *= SURGE_MULTIPLIER
    return factor


def sample_age_months(rng: np.random.Generator) -> int:
    group = rng.choice(["under5", "child", "adult"], p=[0.62, 0.23, 0.15])
    if group == "under5":
        if rng.random() < 0.045:
            return int(rng.integers(0, INFANT_REFER_MONTHS))
        return int(rng.integers(INFANT_REFER_MONTHS, 60))
    if group == "child":
        return int(rng.integers(60, 180))
    return int(rng.integers(180, 720))


def sample_danger_signs(rng: np.random.Generator, age_months: int) -> dict[str, int]:
    scale = 1.4 if age_months < 12 else 1.0
    signs = {
        name: int(rng.random() < min(0.35, probability * scale))
        for name, probability in DANGER_SIGN_P.items()
    }
    if sum(signs.values()) == 1 and rng.random() < 0.35:
        absent = [name for name, value in signs.items() if value == 0]
        signs[str(rng.choice(absent))] = 1
    return signs


def sample_fever_days(rng: np.random.Generator) -> int:
    if rng.random() < 0.07:
        return 0
    return int(rng.choice([1, 2, 3, 4, 5, 6, 7], p=[0.34, 0.28, 0.16, 0.10, 0.06, 0.04, 0.02]))


def sample_temperature(rng: np.random.Generator, fever_days: int, danger_count: int) -> float:
    if fever_days == 0:
        temp = rng.normal(36.7, 0.25)
    else:
        temp = rng.normal(38.2 + min(fever_days, 5) * 0.08, 0.40)
    if danger_count:
        temp += rng.normal(0.25, 0.15)
    temp += rng.normal(0.0, 0.15)
    return float(np.round(np.clip(temp, 35.5, 41.5), 1))


def sample_tdr(
    rng: np.random.Generator,
    district: str,
    day: date,
    fever_days: int,
    temperature_c: float,
) -> str:
    febrile = fever_days > 0 or temperature_c >= 37.5
    if not febrile:
        p_positive, p_invalid = 0.08, 0.03
    else:
        p_positive = 0.58 + 0.10 * (SEASON_FACTOR[day.month] - 1.0)
        if district in PILOT_DISTRICTS:
            p_positive += 0.05
        if district == "Gasabo":
            p_positive -= 0.12
        if temperature_c >= 38.5:
            p_positive += 0.04
        p_positive = float(np.clip(p_positive, 0.20, 0.82))
        p_invalid = 0.04
    p_negative = 1.0 - p_positive - p_invalid
    result = str(rng.choice(list(TDR_LEVELS), p=[p_positive, p_negative, p_invalid]))
    if rng.random() < TDR_RECORDING_FLIP_P:
        others = [value for value in TDR_LEVELS if value != result]
        result = str(rng.choice(others))
    return result


def placeholder_rule_decision(record: dict[str, object]) -> str:
    """Apply placeholder rules to recorded features.

    Urgent referral is any placeholder danger sign or the infant convention.
    Nothing in this function reads a random model score.
    """
    danger = any(
        int(record[name]) == 1
        for name in (
            "convulsions",
            "unable_to_drink",
            "vomiting_everything",
            "lethargy",
            "severe_breathing_difficulty",
        )
    )
    if danger or int(record["age_months"]) < INFANT_REFER_MONTHS:
        return "urgent_refer"
    if record["tdr_result"] == "invalid":
        return "refer"
    if (
        record["tdr_result"] == "negative"
        and int(record["fever_days"]) >= PERSISTENT_FEVER_DAYS
    ):
        return "refer"
    return "treat_at_home"


def apply_recording_noise(rng: np.random.Generator, decision: str) -> str:
    roll = rng.random()
    if decision == "urgent_refer":
        if roll < NOISE_URGENT_TO_TREAT:
            return "treat_at_home"
        if roll < NOISE_URGENT_TO_TREAT + NOISE_URGENT_TO_REFER:
            return "refer"
    elif decision == "treat_at_home" and roll < NOISE_TREAT_TO_REFER:
        return "refer"
    elif decision == "refer" and roll < NOISE_REFER_TO_TREAT:
        return "treat_at_home"
    return decision


def completion_probability(decision: str, remote: int, rainy: bool) -> float:
    probability = 0.86 if decision == "urgent_refer" else 0.80
    if remote:
        probability -= 0.16
    if rainy:
        probability -= 0.06
    return float(np.clip(probability, 0.40, 0.95))


def sample_delay_hours(rng: np.random.Generator, decision: str, remote: int, rainy: bool) -> float:
    median = 3.5 if decision == "urgent_refer" else 6.0
    if remote:
        median *= 1.6
    if rainy:
        median *= 1.25
    delay = float(rng.lognormal(mean=np.log(median), sigma=0.45))
    return float(np.round(np.clip(delay, 0.4, 96.0), 1))


def outcome_weights(
    clinically_urgent: bool,
    decision: str,
    completed: int,
    delay: float | None,
) -> dict[str, float]:
    """Synthetic mechanistic outcomes.

    Complication and unknown are the teaching signal. Death stays uncommon
    so a group-by on this file cannot be mistaken for a case-fatality ratio.
    """
    if clinically_urgent and decision == "treat_at_home":
        return {"recovered": 0.70, "complication": 0.22, "died": 0.02, "unknown": 0.06}
    if clinically_urgent and completed == 0:
        return {"recovered": 0.64, "complication": 0.24, "died": 0.02, "unknown": 0.10}
    if clinically_urgent and delay is not None and delay >= 24:
        return {"recovered": 0.74, "complication": 0.18, "died": 0.02, "unknown": 0.06}
    if clinically_urgent:
        return {"recovered": 0.88, "complication": 0.08, "died": 0.01, "unknown": 0.03}
    if decision != "treat_at_home" and completed == 0:
        return {"recovered": 0.82, "complication": 0.10, "died": 0.01, "unknown": 0.07}
    if decision != "treat_at_home":
        return {"recovered": 0.94, "complication": 0.035, "died": 0.005, "unknown": 0.02}
    return {"recovered": 0.975, "complication": 0.015, "died": 0.002, "unknown": 0.008}


def inject_visible_protocol_misses(
    rows: list[dict[str, object]],
    rng: np.random.Generator,
    minimum_convulsion_misses: int = 8,
) -> None:
    """Force a few danger-sign rows to stay recorded as home care.

    Random label noise alone often misses the convulsions column, so the
    demo file would not reliably contain a case a reviewer can point at.
    Referral fields are cleared because the recorded decision is now home care.
    """
    already = sum(
        1 for row in rows if row["convulsions"] == 1 and row["decision"] == "treat_at_home"
    )
    need = minimum_convulsion_misses - already
    if need <= 0:
        return
    candidates = [
        index
        for index, row in enumerate(rows)
        if row["convulsions"] == 1 and row["decision"] == "urgent_refer"
    ]
    if len(candidates) < need:
        raise SystemExit(
            f"Not enough convulsions rows to inject {need} protocol misses "
            f"(candidates={len(candidates)})."
        )
    chosen = rng.choice(candidates, size=need, replace=False)
    for index in np.atleast_1d(chosen):
        row = rows[int(index)]
        row["decision"] = "treat_at_home"
        row["referral_completed"] = 0
        row["arrival_delay_hours"] = None
        row["outcome"] = draw_outcome(
            rng,
            outcome_weights(True, "treat_at_home", 0, None),
        )


def draw_outcome(rng: np.random.Generator, weights: dict[str, float]) -> str:
    labels = list(weights)
    probabilities = np.array([weights[label] for label in labels], dtype=float)
    probabilities = probabilities / probabilities.sum()
    return str(rng.choice(labels, p=probabilities))


def build_facilities() -> list[dict[str, object]]:
    facilities: list[dict[str, object]] = []
    per_district_index: dict[str, int] = defaultdict(int)
    for district, sector, remote, dlat, dlon in FACILITY_SPECS:
        per_district_index[district] += 1
        anchor_lat, anchor_lon = DISTRICT_ANCHOR[district]
        code = DISTRICT_CODE[district]
        local_index = per_district_index[district]
        facility_id = f"HC-{code}-{local_index:02d}"
        chw_ids = [f"CHW-{code}-{local_index:02d}-{chw:02d}" for chw in range(1, 5)]
        facilities.append(
            {
                "facility_id": facility_id,
                "name": f"{sector} Health Center",
                "district": district,
                "sector": sector,
                "pilot": int(district in PILOT_DISTRICTS),
                "remote": remote,
                "latitude": round(anchor_lat + dlat, 5),
                "longitude": round(anchor_lon + dlon, 5),
                "chw_ids": chw_ids,
            }
        )
    return facilities


def generate_cases(
    rng: np.random.Generator,
    facilities: list[dict[str, object]],
) -> tuple[pd.DataFrame, dict[tuple[str, date], int], dict[tuple[str, date], int]]:
    by_district: dict[str, list[dict[str, object]]] = defaultdict(list)
    for facility in facilities:
        by_district[str(facility["district"])].append(facility)

    rows: list[dict[str, object]] = []
    district_week_cases: dict[tuple[str, date], int] = defaultdict(int)
    district_week_urgent: dict[tuple[str, date], int] = defaultdict(int)

    day = START_DATE
    while day <= END_DATE:
        rainy = day.month in (3, 4, 5, 10, 11)
        for district, base in DISTRICT_BASE_DAILY.items():
            expected = base * burden_multiplier(district, day)
            n_cases = int(rng.poisson(expected))
            facility_pool = by_district[district]
            for _ in range(n_cases):
                facility = facility_pool[int(rng.integers(0, len(facility_pool)))]
                age_months = sample_age_months(rng)
                signs = sample_danger_signs(rng, age_months)
                fever_days = sample_fever_days(rng)
                temperature_c = sample_temperature(rng, fever_days, sum(signs.values()))
                record: dict[str, object] = {
                    "date": day.isoformat(),
                    "district": district,
                    "sector": facility["sector"],
                    "chw_id": rng.choice(list(facility["chw_ids"])),
                    "age_months": age_months,
                    "sex": "female" if rng.random() < 0.51 else "male",
                    "temperature_c": temperature_c,
                    "fever_days": fever_days,
                    **signs,
                }
                record["tdr_result"] = sample_tdr(rng, district, day, fever_days, temperature_c)
                rule_decision = placeholder_rule_decision(record)
                decision = apply_recording_noise(rng, rule_decision)
                clinically_urgent = rule_decision == "urgent_refer"

                delay: float | None = None
                completed = 0
                if decision in ("refer", "urgent_refer"):
                    if rng.random() < completion_probability(decision, int(facility["remote"]), rainy):
                        completed = 1
                        delay = sample_delay_hours(rng, decision, int(facility["remote"]), rainy)

                record["decision"] = decision
                record["referral_completed"] = completed
                record["arrival_delay_hours"] = delay
                record["outcome"] = draw_outcome(
                    rng,
                    outcome_weights(clinically_urgent, decision, completed, delay),
                )
                rows.append(record)
                district_week_cases[(district, week_start(day))] += 1
                if clinically_urgent:
                    district_week_urgent[(district, week_start(day))] += 1
        day += timedelta(days=1)

    inject_visible_protocol_misses(rows, rng)
    frame = pd.DataFrame(rows)
    frame = frame.sort_values(["date", "district", "sector", "chw_id"]).reset_index(drop=True)
    frame.insert(0, "case_id", [f"CASE-{index:06d}" for index in range(1, len(frame) + 1)])
    return frame[CASE_COLUMNS], district_week_cases, district_week_urgent


def generate_stock(
    rng: np.random.Generator,
    facilities: list[dict[str, object]],
    district_week_cases: dict[tuple[str, date], int],
    district_week_urgent: dict[tuple[str, date], int],
) -> pd.DataFrame:
    facilities_in_district: dict[str, int] = defaultdict(int)
    for facility in facilities:
        facilities_in_district[str(facility["district"])] += 1

    weeks: list[date] = []
    cursor = week_start(START_DATE)
    last = week_start(END_DATE)
    while cursor <= last:
        weeks.append(cursor)
        cursor += timedelta(days=7)

    rows: list[dict[str, object]] = []
    for facility in facilities:
        district = str(facility["district"])
        share = 1.0 / facilities_in_district[district]
        remote = int(facility["remote"])
        for week in weeks:
            case_share = district_week_cases[(district, week)] * share
            urgent_share = district_week_urgent[(district, week)] * share
            lambdas = {
                "ACT": max(0.4, case_share * 0.45),
                "RDT": max(0.6, case_share * 0.90),
                "injectable_artesunate": max(0.15, urgent_share * 0.85),
            }
            for commodity, unit in COMMODITIES.items():
                consumed = int(rng.poisson(lambdas[commodity]))
                roll = rng.random()
                stockout_p = STOCKOUT_P[commodity]
                if roll < stockout_p:
                    on_hand = 0
                elif roll < stockout_p + 0.08:
                    on_hand = int(max(0, round(max(consumed, 1) * rng.uniform(0.2, 1.2))))
                else:
                    on_hand = int(round(max(consumed, 1) * rng.uniform(3.0, 12.0)))

                if (
                    district == "Bugesera"
                    and commodity == "ACT"
                    and week in BUGESERA_ACT_STOCKOUT_WEEKS
                ):
                    on_hand = 0
                    consumed = max(consumed, 1)
                if (
                    district == SURGE_DISTRICT
                    and commodity == "injectable_artesunate"
                    and week in NYAGATARE_ARTESUNATE_PRESSURE_WEEKS
                ):
                    consumed = max(consumed, 2)
                    on_hand = 0 if remote else 1

                stockout = int(on_hand == 0)
                if stockout:
                    weeks_of_cover = 0.0
                elif consumed == 0:
                    weeks_of_cover = 52.0
                else:
                    weeks_of_cover = float(np.round(min(52.0, on_hand / consumed), 2))

                rows.append(
                    {
                        "facility_id": facility["facility_id"],
                        "facility_name": facility["name"],
                        "district": district,
                        "week_start": week.isoformat(),
                        "commodity": commodity,
                        "unit": unit,
                        "stock_on_hand": on_hand,
                        "quantity_consumed": consumed,
                        "stockout": stockout,
                        "weeks_of_cover": weeks_of_cover,
                    }
                )
    return pd.DataFrame(rows)


def mean_daily_cases(cases: pd.DataFrame, month: int, district: str | None = None, year: int | None = None) -> float:
    dates = pd.to_datetime(cases["date"])
    mask = dates.dt.month == month
    if year is not None:
        mask = mask & (dates.dt.year == year)
    if district is not None:
        mask = mask & (cases["district"] == district)
    n_days = int(dates[mask].nunique())
    if n_days == 0:
        return 0.0
    return float(mask.sum()) / n_days


def validate(
    cases: pd.DataFrame,
    facilities: pd.DataFrame,
    stock: pd.DataFrame,
) -> dict[str, object]:
    errors: list[str] = []

    def check(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    check(len(cases) >= 5000, f"expected at least 5000 cases, found {len(cases)}")
    check(list(cases.columns) == CASE_COLUMNS, "case columns differ from the contract")
    check(set(cases["decision"]).issubset(DECISION_LEVELS), "unexpected decision value")
    check(set(cases["tdr_result"]).issubset(TDR_LEVELS), "unexpected TDR value")
    check(set(cases["sex"]).issubset({"female", "male"}), "unexpected sex value")
    check(set(cases["outcome"]).issubset(OUTCOME_LEVELS), "unexpected outcome value")
    check(cases["case_id"].is_unique, "case_id is not unique")
    check(int(cases["age_months"].min()) >= 0, "negative age")
    check(float(cases["temperature_c"].min()) >= 35.5, "temperature below generated range")
    check(float(cases["temperature_c"].max()) <= 41.5, "temperature above generated range")

    allowed_null = {"arrival_delay_hours"}
    for column in CASE_COLUMNS:
        if column in allowed_null:
            continue
        check(int(cases[column].isna().sum()) == 0, f"nulls in {column}")

    treat_share = float((cases["decision"] == "treat_at_home").mean())
    refer_share = float((cases["decision"] == "refer").mean())
    urgent_share = float((cases["decision"] == "urgent_refer").mean())
    check(treat_share > 0.50, f"treat_at_home should be the majority, got {treat_share:.3f}")
    check(0.04 <= urgent_share <= 0.20, f"urgent share out of demo band: {urgent_share:.3f}")
    check(0.05 <= refer_share <= 0.30, f"refer share out of demo band: {refer_share:.3f}")

    invalid_n = int((cases["tdr_result"] == "invalid").sum())
    check(invalid_n >= 50, f"too few invalid TDR results: {invalid_n}")

    referred = cases[cases["decision"].isin(["refer", "urgent_refer"])]
    non_arrival = float((referred["referral_completed"] == 0).mean())
    check(non_arrival >= 0.10, f"non-arrival among referrals is only {non_arrival:.3f}")

    home = cases["decision"] == "treat_at_home"
    check(int(cases.loc[home, "referral_completed"].sum()) == 0, "home care row marked arrived")
    check(
        int(cases.loc[home, "arrival_delay_hours"].notna().sum()) == 0,
        "home care row has an arrival delay",
    )
    arrived = cases["referral_completed"] == 1
    check(int(cases.loc[arrived, "arrival_delay_hours"].isna().sum()) == 0, "arrival missing a delay")
    not_arrived_referral = referred["referral_completed"] == 0
    check(
        int(referred.loc[not_arrived_referral, "arrival_delay_hours"].notna().sum()) == 0,
        "non-arrival has a delay",
    )

    missed = (cases["convulsions"] == 1) & (cases["decision"] == "treat_at_home")
    check(int(missed.sum()) >= 5, "expected some visible protocol misses on convulsions")
    infants = cases["age_months"] < INFANT_REFER_MONTHS
    check(int(infants.sum()) >= 20, "expected infant rows for the placeholder age rule")

    for district in PILOT_DISTRICTS:
        check(district in set(cases["district"]), f"missing pilot district {district}")
        check(int((facilities["district"] == district).sum()) >= 4, f"pilot {district} has too few facilities")

    april = mean_daily_cases(cases, 4)
    july = mean_daily_cases(cases, 7)
    check(april > july * 1.4, f"April daily mean {april:.2f} is not clearly above July {july:.2f}")

    nyg_2025 = mean_daily_cases(cases, 9, district=SURGE_DISTRICT, year=2025)
    nyg_2026 = mean_daily_cases(cases, 9, district=SURGE_DISTRICT, year=2026)
    check(
        nyg_2026 > nyg_2025 * 1.8,
        f"Nyagatare Sep 2026 ({nyg_2026:.2f}/day) is not a clear surge over 2025 ({nyg_2025:.2f}/day)",
    )

    check(set(stock["facility_id"]).issubset(set(facilities["facility_id"])), "stock facility_id mismatch")
    check(float(stock["stockout"].mean()) >= 0.03, "stockouts are too rare to demo")

    bug_weeks = {day.isoformat() for day in BUGESERA_ACT_STOCKOUT_WEEKS}
    bug = stock[
        (stock["district"] == "Bugesera")
        & (stock["commodity"] == "ACT")
        & (stock["week_start"].isin(bug_weeks))
    ]
    check(len(bug) > 0 and bool((bug["stockout"] == 1).all()), "Bugesera ACT story stockout missing")

    art_weeks = {day.isoformat() for day in NYAGATARE_ARTESUNATE_PRESSURE_WEEKS}
    remote_ids = set(facilities.loc[facilities["remote"] == 1, "facility_id"])
    art = stock[
        (stock["district"] == SURGE_DISTRICT)
        & (stock["commodity"] == "injectable_artesunate")
        & (stock["week_start"].isin(art_weeks))
        & (stock["facility_id"].isin(remote_ids))
    ]
    check(len(art) > 0 and bool((art["stockout"] == 1).all()), "Nyagatare remote artesunate stockout missing")

    complication_home = float(
        ((cases["decision"] == "treat_at_home") & (cases["outcome"] == "complication")).mean()
    )
    urgent_lost = referred[(referred["decision"] == "urgent_refer") & (referred["referral_completed"] == 0)]
    complication_lost = float((urgent_lost["outcome"] == "complication").mean()) if len(urgent_lost) else 0.0
    check(
        complication_lost > complication_home,
        "lost urgent referrals should show a higher complication share than home care",
    )
    died_share = float((cases["outcome"] == "died").mean())
    check(died_share < 0.02, f"synthetic death share too high to be safe on a slide: {died_share:.3f}")

    if errors:
        joined = "\n".join(f"- {item}" for item in errors)
        raise SystemExit(f"Validation failed:\n{joined}")

    dates = pd.to_datetime(cases["date"])
    monthly = (
        cases.assign(month=dates.dt.to_period("M").astype(str))
        .groupby("month")
        .size()
        .astype(int)
        .to_dict()
    )
    return {
        "n_cases": int(len(cases)),
        "decision_counts": {key: int((cases["decision"] == key).sum()) for key in DECISION_LEVELS},
        "decision_share": {
            "treat_at_home": round(treat_share, 4),
            "refer": round(refer_share, 4),
            "urgent_refer": round(urgent_share, 4),
        },
        "tdr_counts": {key: int((cases["tdr_result"] == key).sum()) for key in TDR_LEVELS},
        "referral_non_completion_share": round(non_arrival, 4),
        "invalid_tdr": invalid_n,
        "protocol_miss_convulsions_treated_at_home": int(missed.sum()),
        "infants_under_placeholder_threshold": int(infants.sum()),
        "april_daily_mean": round(april, 3),
        "july_daily_mean": round(july, 3),
        "nyagatare_sep_2025_daily_mean": round(nyg_2025, 3),
        "nyagatare_sep_2026_daily_mean": round(nyg_2026, 3),
        "outcome_counts": {key: int((cases["outcome"] == key).sum()) for key in OUTCOME_LEVELS},
        "stock_rows": int(len(stock)),
        "stockout_share": round(float(stock["stockout"].mean()), 4),
        "facilities": int(len(facilities)),
        "monthly_case_counts": monthly,
    }


def write_outputs(cases: pd.DataFrame, facilities: pd.DataFrame, stock: pd.DataFrame, summary: dict[str, object]) -> None:
    public_facilities = facilities.drop(columns=["chw_ids"])
    cases.to_csv(DATA_DIR / "cases_synthetic.csv", index=False)
    public_facilities.to_csv(DATA_DIR / "facilities.csv", index=False)
    stock.to_csv(DATA_DIR / "stock_synthetic.csv", index=False)

    meta = {
        "label": "Synthetic demo data",
        "synthetic": True,
        "clinical_use": False,
        "generator_version": GENERATOR_VERSION,
        "seed": SEED,
        "start_date": START_DATE.isoformat(),
        "end_date": END_DATE.isoformat(),
        "pilot_districts": list(PILOT_DISTRICTS),
        "disclaimer": "Decision support tool. Not a replacement for clinical judgment.",
        "validation_banner": (
            "TO BE VALIDATED against the Rwanda national malaria treatment guidelines "
            "and WHO iCCM guidance by a clinician."
        ),
        "placeholders": {
            "infant_refer_months": INFANT_REFER_MONTHS,
            "persistent_fever_days": PERSISTENT_FEVER_DAYS,
            "danger_signs": list(DANGER_SIGN_P),
            "no_temperature_cutoff": True,
            "no_dose_calculation": True,
        },
        "scripted_story": {
            "surge_district": SURGE_DISTRICT,
            "surge_start": SURGE_START.isoformat(),
            "surge_multiplier": SURGE_MULTIPLIER,
            "bugesera_act_stockout_weeks": [day.isoformat() for day in BUGESERA_ACT_STOCKOUT_WEEKS],
            "nyagatare_artesunate_pressure_weeks": [
                day.isoformat() for day in NYAGATARE_ARTESUNATE_PRESSURE_WEEKS
            ],
        },
        "phase2_label_definitions": {
            "severe_case": "any danger sign == 1 OR age_months < infant_refer_months; do not use decision",
            "referral_not_completed": "decision in {refer, urgent_refer} AND referral_completed == 0",
        },
        "summary": summary,
    }
    (DATA_DIR / "generation_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")


def main() -> None:
    rng = np.random.default_rng(SEED)
    facilities = build_facilities()
    cases, week_cases, week_urgent = generate_cases(rng, facilities)
    facility_frame = pd.DataFrame(facilities)
    stock = generate_stock(rng, facilities, week_cases, week_urgent)
    summary = validate(cases, facility_frame, stock)
    write_outputs(cases, facility_frame, stock, summary)

    print("MalariaLink synthetic data")
    print("SYNTHETIC DEMO DATA - not for clinical use")
    print(f"Cases: {summary['n_cases']}")
    print(f"Decision share: {summary['decision_share']}")
    print(f"Referral non-completion: {summary['referral_non_completion_share']}")
    print(f"April vs July daily mean: {summary['april_daily_mean']} vs {summary['july_daily_mean']}")
    print(
        "Nyagatare Sep 2025 vs 2026 daily mean: "
        f"{summary['nyagatare_sep_2025_daily_mean']} vs {summary['nyagatare_sep_2026_daily_mean']}"
    )
    print(f"Stock rows: {summary['stock_rows']}  stockout share: {summary['stockout_share']}")
    print(f"Wrote files under {DATA_DIR}")
    print("Validation: PASSED")


if __name__ == "__main__":
    main()
