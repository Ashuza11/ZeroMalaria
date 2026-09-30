#!/usr/bin/env python3
"""Train ZeroMalaria triage models on SYNTHETIC data only.

Metrics demonstrate the architecture. They are NOT clinical performance.

Labels (documented, not CSV columns):
  severe_case = any danger sign OR age_months < infant_refer_months
  referral_not_completed = decision in {refer, urgent_refer} AND referral_completed == 0
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import yaml
from sklearn.calibration import calibration_curve
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_sample_weight

try:
    import shap  # type: ignore

    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = REPO_ROOT / "data" / "cases_synthetic.csv"
RULES_PATH = REPO_ROOT / "rules" / "malaria_rules.yaml"
OUT_DIR = Path(__file__).resolve().parent / "artifacts"
METRICS_PATH = Path(__file__).resolve().parent / "metrics.json"

FEATURE_COLUMNS = [
    "age_months",
    "temperature_c",
    "fever_days",
    "convulsions",
    "unable_to_drink",
    "vomiting_everything",
    "lethargy",
    "severe_breathing_difficulty",
    "tdr_positive",
    "tdr_negative",
    "tdr_invalid",
    "sex_female",
]

DANGER_COLS = [
    "convulsions",
    "unable_to_drink",
    "vomiting_everything",
    "lethargy",
    "severe_breathing_difficulty",
]


def load_infant_months() -> int:
    with RULES_PATH.open(encoding="utf-8") as handle:
        cfg = yaml.safe_load(handle)
    return int(cfg.get("infant_refer_months", 2))


def prepare_frame(df: pd.DataFrame, infant_months: int) -> pd.DataFrame:
    out = df.copy()
    out["severe_case"] = (
        (out[DANGER_COLS].fillna(0).astype(int).sum(axis=1) > 0)
        | (out["age_months"].astype(int) < infant_months)
    ).astype(int)
    out["referral_not_completed"] = (
        out["decision"].isin(["refer", "urgent_refer"]) & (out["referral_completed"].fillna(0).astype(int) == 0)
    ).astype(int)
    tdr = out["tdr_result"].astype(str).str.lower()
    out["tdr_positive"] = (tdr == "positive").astype(int)
    out["tdr_negative"] = (tdr == "negative").astype(int)
    out["tdr_invalid"] = (tdr == "invalid").astype(int)
    out["sex_female"] = (out["sex"].astype(str).str.lower() == "female").astype(int)
    return out


def best_threshold(y_true: np.ndarray, proba: np.ndarray) -> tuple[float, dict]:
    """Pick threshold maximizing recall, with F1 as tie-break (severe-case priority)."""
    best_t = 0.5
    best = {"recall": -1.0, "precision": -1.0, "f1": -1.0}
    for t in np.linspace(0.05, 0.95, 37):
        pred = (proba >= t).astype(int)
        rec = float(recall_score(y_true, pred, zero_division=0))
        prec = float(precision_score(y_true, pred, zero_division=0))
        f1 = float(f1_score(y_true, pred, zero_division=0))
        if rec > best["recall"] + 1e-9 or (abs(rec - best["recall"]) < 1e-9 and f1 > best["f1"]):
            best = {"recall": rec, "precision": prec, "f1": f1}
            best_t = float(t)
    return best_t, best


def eval_at_threshold(y_true: np.ndarray, proba: np.ndarray, threshold: float) -> dict:
    pred = (proba >= threshold).astype(int)
    cm = confusion_matrix(y_true, pred).tolist()
    try:
        auc = float(roc_auc_score(y_true, proba))
    except ValueError:
        auc = None
    frac_pos, mean_pred = calibration_curve(y_true, proba, n_bins=8, strategy="quantile")
    return {
        "threshold": threshold,
        "recall": float(recall_score(y_true, pred, zero_division=0)),
        "precision": float(precision_score(y_true, pred, zero_division=0)),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
        "roc_auc": auc,
        "confusion_matrix": cm,
        "calibration": {
            "fraction_of_positives": [float(x) for x in frac_pos],
            "mean_predicted_value": [float(x) for x in mean_pred],
            "note": "Rough calibration on synthetic holdout — architecture only",
        },
    }


def train_pair(X_train, y_train, X_val, y_val, X_test, y_test, maximize_recall: bool):
    sw = compute_sample_weight("balanced", y_train)
    lr = LogisticRegression(max_iter=2000, class_weight="balanced", solver="lbfgs")
    gb = GradientBoostingClassifier(random_state=42)
    lr.fit(X_train, y_train, sample_weight=sw)
    gb.fit(X_train, y_train, sample_weight=sw)

    models = {"logistic_regression": lr, "gradient_boosting": gb}
    results = {}
    chosen_name = "gradient_boosting"
    chosen_thr = 0.5

    for name, model in models.items():
        val_proba = model.predict_proba(X_val)[:, 1]
        if maximize_recall:
            thr, _ = best_threshold(y_val, val_proba)
        else:
            thr, _ = best_threshold(y_val, val_proba)
        test_proba = model.predict_proba(X_test)[:, 1]
        results[name] = {
            "validation_tuned": eval_at_threshold(y_val, val_proba, thr),
            "test": eval_at_threshold(y_test, test_proba, thr),
        }
        if name == chosen_name:
            chosen_thr = thr

    return models, results, chosen_name, chosen_thr


def main() -> None:
    if not DATA_PATH.exists():
        print(f"Missing {DATA_PATH}", file=sys.stderr)
        sys.exit(1)

    infant_months = load_infant_months()
    raw = pd.read_csv(DATA_PATH)
    df = prepare_frame(raw, infant_months)

    with RULES_PATH.open(encoding="utf-8") as handle:
        rules_cfg = yaml.safe_load(handle)
    feature_labels = rules_cfg.get("feature_labels_en") or {}

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    metrics: dict = {
        "disclaimer": "Metrics from SYNTHETIC demo data. Architecture demonstration only. NOT clinical performance.",
        "synthetic": True,
        "clinical_use": False,
        "caveat": (
            "severe_case is defined from danger-sign columns and age that are also model features, "
            "so high test metrics are expected on this synthetic construction and do NOT imply "
            "clinical discrimination. referral_not_completed is harder; recall-first thresholding "
            "trades precision for recall by design."
        ),
        "label_definitions": {
            "severe_case": (
                f"1 if any of {DANGER_COLS} is 1 OR age_months < {infant_months}; "
                "NOT derived from noisy decision column"
            ),
            "referral_not_completed": (
                "1 if decision in {refer, urgent_refer} AND referral_completed == 0; "
                "trained on referred rows only"
            ),
        },
        "n_rows": int(len(df)),
        "severe_case_prevalence": float(df["severe_case"].mean()),
        "split": "70/15/15 stratified",
        "tasks": {},
    }

    # --- severe_case on all rows ---
    X = df[FEATURE_COLUMNS].astype(float).values
    y = df["severe_case"].astype(int).values
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.1765, random_state=42, stratify=y_temp
    )  # 0.1765 * 0.85 ≈ 0.15

    models_s, results_s, chosen_s, thr_s = train_pair(
        X_train, y_train, X_val, y_val, X_test, y_test, maximize_recall=True
    )
    metrics["tasks"]["severe_case"] = {
        "chosen_model": chosen_s,
        "threshold": thr_s,
        "models": results_s,
        "n_train": int(len(y_train)),
        "n_val": int(len(y_val)),
        "n_test": int(len(y_test)),
    }

    # --- referral_not_completed on referred rows ---
    referred = df[df["decision"].isin(["refer", "urgent_refer"])].copy()
    Xr = referred[FEATURE_COLUMNS].astype(float).values
    yr = referred["referral_not_completed"].astype(int).values
    Xr_temp, Xr_test, yr_temp, yr_test = train_test_split(
        Xr, yr, test_size=0.15, random_state=42, stratify=yr
    )
    Xr_train, Xr_val, yr_train, yr_val = train_test_split(
        Xr_temp, yr_temp, test_size=0.1765, random_state=42, stratify=yr_temp
    )
    models_r, results_r, chosen_r, thr_r = train_pair(
        Xr_train, yr_train, Xr_val, yr_val, Xr_test, yr_test, maximize_recall=True
    )
    metrics["tasks"]["referral_not_completed"] = {
        "chosen_model": chosen_r,
        "threshold": thr_r,
        "models": results_r,
        "n_train": int(len(yr_train)),
        "n_val": int(len(yr_val)),
        "n_test": int(len(yr_test)),
        "n_referred_rows": int(len(referred)),
        "prevalence": float(referred["referral_not_completed"].mean()),
    }

    # SHAP explainer on severe GB when available; else feature_importances_ fallback
    gb_severe = models_s["gradient_boosting"]
    explainer = None
    if HAS_SHAP:
        background = shap.sample(X_train, min(100, len(X_train)), random_state=42)
        explainer = shap.TreeExplainer(gb_severe, data=background)
    metrics["shap_available"] = HAS_SHAP

    bundle = {
        "feature_columns": FEATURE_COLUMNS,
        "feature_labels_en": feature_labels,
        "infant_refer_months": infant_months,
        "severe_case": {
            "lr": models_s["logistic_regression"],
            "gb": models_s["gradient_boosting"],
            "threshold": thr_s,
            "chosen": chosen_s,
            "feature_importances": getattr(gb_severe, "feature_importances_", None),
        },
        "referral_not_completed": {
            "lr": models_r["logistic_regression"],
            "gb": models_r["gradient_boosting"],
            "threshold": thr_r,
            "chosen": chosen_r,
        },
        "severe_shap_explainer": explainer,
        "synthetic": True,
        "note": "Architecture demo only — not clinical performance",
    }
    joblib.dump(bundle, OUT_DIR / "model_bundle.joblib")
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("ZeroMalaria ML training (SYNTHETIC — not clinical performance)")
    print(f"severe_case prevalence: {metrics['severe_case_prevalence']:.3f}")
    print(
        "severe GB test recall:",
        results_s["gradient_boosting"]["test"]["recall"],
        "precision:",
        results_s["gradient_boosting"]["test"]["precision"],
    )
    print(
        "referral_not_completed GB test recall:",
        results_r["gradient_boosting"]["test"]["recall"],
    )
    print(f"Wrote {OUT_DIR / 'model_bundle.joblib'} and {METRICS_PATH}")


if __name__ == "__main__":
    main()
