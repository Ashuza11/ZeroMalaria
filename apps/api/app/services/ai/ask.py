"""Single-assistant case Q&A from local protocol files only."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.services.ai.guardrails import (
    guard_agent_text,
    sanitize_case_snapshot,
    scrub_injection,
)
from app.services.ai.router import load_protocol_excerpts

REPO_ROOT = Path(__file__).resolve().parents[5]
CLINICAL_CONFIG = REPO_ROOT / "rules" / "clinical_config.yaml"
MALARIA_RULES = REPO_ROOT / "rules" / "malaria_rules.yaml"

OUT_OF_SCOPE = {
    "en": "Refer to nurse. AI-generated, verify with protocol",
    "rw": "Baza umuforomo. AI-generated, verify with protocol",
    "fr": "Référez à l'infirmière. AI-generated, verify with protocol",
}


def _lang(code: str) -> str:
    c = (code or "en").lower()
    if c.startswith("rw"):
        return "rw"
    if c.startswith("fr"):
        return "fr"
    return "en"


def _protocol_blob() -> str:
    parts = [load_protocol_excerpts()]
    for path in (CLINICAL_CONFIG, MALARIA_RULES):
        if path.exists():
            parts.append(path.read_text(encoding="utf-8")[:4000])
    return "\n".join(parts)


def answer_case_question(
    question: str,
    case: dict[str, Any],
    *,
    language: str = "en",
) -> dict[str, Any]:
    lang = _lang(language)
    snap = sanitize_case_snapshot({**case, "language": lang})
    q = scrub_injection(question).lower()
    decision = str(snap.get("decision") or snap.get("rules_decision") or "treat_at_home")
    protocol = _protocol_blob().lower()

    # Out of scope: drugs, weather, jokes, identity
    if any(w in q for w in ("dose", "tablet", "prescribe", "coartem", "artesunate", "weather", "football", "joke")):
        return {
            "answer": OUT_OF_SCOPE[lang],
            "out_of_scope": True,
            "citations": [],
            "provenance": ["AI"],
            "provider_used": "local",
            "needs_native_review": lang == "rw",
            "snapshot": snap,
        }

    citations: list[str] = []
    if "danger" in protocol or any(snap["danger_signs"].values()):
        citations.append("docs/protocol/excerpts.md#DS-01")
    if "infant" in q or snap.get("age_band") == "under_2m":
        citations.append("rules/clinical_config.yaml#infant_refer_months")
    if "vomit" in q or "kuruka" in q or "vomit" in q:
        citations.append("docs/protocol/excerpts.md#DS-01")
    if "come back" in q or "return" in q or "subira" in q or "revenir" in q:
        citations.append("rules/clinical_config.yaml#persistent_fever_days")
    if not citations:
        citations.append("docs/protocol/excerpts.md#GEN-01")

    factors = ", ".join(snap.get("top_factors") or []) or "none listed"
    score = snap.get("ml_score")

    if lang == "rw":
        body = (
            f"Icyemezo gifunguye ni {decision}. "
            f"Ibimenyetso by'akaga byagaragaye niba biriho bigomba kohereza byihutirwa. "
            f"ML score (demo): {score}. Factors: {factors}. "
            f"Niba umwana ahinduka nabi (urugero: kuruka byose), subiza isuzuma kandi uhite wohereza."
        )
    elif lang == "fr":
        body = (
            f"La décision verrouillée est {decision}. "
            f"Tout signe de danger confirme un renvoi urgent. "
            f"Score ML (démo): {score}. Facteurs: {factors}. "
            f"Si l'enfant vomit tout, réévaluez et référez selon le protocole."
        )
    else:
        body = (
            f"The locked recommendation is {decision}. "
            f"Confirmed danger signs always mean urgent referral. "
            f"ML score (synthetic demo): {score}. Top factors: {factors}. "
            f"If the child starts vomiting everything, reassess and refer per protocol."
        )

    if "why" in q or "kuki" in q or "pourquoi" in q:
        body = (
            (f"Kuki: amategeko n'ibisubizo byawe bishyigikira {decision}. " if lang == "rw" else "")
            + (f"Pourquoi: les règles et vos réponses soutiennent {decision}. " if lang == "fr" else "")
            + (f"Why: rules and your answers support {decision}. " if lang == "en" else "")
            + body
        )
    if "what should" in q or "ngomba" in q or "que faire" in q:
        body = (
            ("Ubu: emeza icyemezo, sobanura umuryango, kandi tangira uburyo bwo kohereza niba bisabwa. " if lang == "rw" else "")
            + ("Maintenant: confirmez, expliquez à la famille, organisez le renvoi si besoin. " if lang == "fr" else "")
            + ("Now: confirm the decision, explain to the family, and arrange referral if required. " if lang == "en" else "")
            + body
        )

    body = body + " AI-generated, verify with protocol"
    text, rejected = guard_agent_text(body, decision, lang)
    return {
        "answer": text,
        "out_of_scope": False,
        "citations": citations,
        "provenance": ["Rule", "AI"],
        "provider_used": "local",
        "needs_native_review": lang == "rw",
        "rejected": rejected,
        "snapshot": snap,
    }
