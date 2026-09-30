from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class TriageRequest(BaseModel):
    age_months: int = Field(ge=0, le=1200)
    sex: Literal["female", "male"] = "female"
    temperature_c: float = Field(ge=30, le=45)
    fever_days: int = Field(ge=0, le=30)
    convulsions: bool = False
    unable_to_drink: bool = False
    vomiting_everything: bool = False
    lethargy: bool = False
    severe_breathing_difficulty: bool = False
    tdr_result: Literal["positive", "negative", "invalid"] = "positive"
    language: str = "en"
    use_ml: bool = True
    free_text: Optional[str] = None


class TriageResponse(BaseModel):
    decision: str
    rules_decision: str
    reasons: list[str]
    triggered_rules: list[str]
    ml_escalated: bool
    severe_risk: Optional[float] = None
    referral_noncompletion_risk: Optional[float] = None
    shap_factors: list[str] = []
    confidence: Optional[float] = None
    human_confirmation_required: bool = True
    disclaimer: str
    synthetic_note: str
    extracted_from_text: Optional[dict[str, Any]] = None


class ReferralCreate(BaseModel):
    client_uuid: str
    facility_id: str
    chw_id: str = "CHW-DEMO-01"
    district: str
    sector: str = ""
    age_months: int
    sex: str = "female"
    decision: Literal["refer", "urgent_refer"]
    reasons: list[str] = []
    summary: str = ""
    case_id: Optional[str] = None
    convulsions: bool = False
    unable_to_drink: bool = False
    vomiting_everything: bool = False
    lethargy: bool = False
    severe_breathing_difficulty: bool = False
    temperature_c: Optional[float] = None
    fever_days: Optional[int] = None
    tdr_result: Optional[str] = None


class ReferralOut(BaseModel):
    id: str
    client_uuid: str
    facility_id: str
    chw_id: str
    district: str
    sector: str
    age_months: int
    sex: str
    decision: str
    reasons: list[str]
    summary: str
    status: str
    created_at: datetime
    received_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    treated_at: Optional[datetime] = None
    demo_flag: bool = False
    overdue: bool = False


class StatusUpdate(BaseModel):
    status: Literal["received", "arrived", "treated"]


class SyncItem(BaseModel):
    client_uuid: str
    type: Literal["referral", "triage"]
    payload: dict[str, Any]


class SyncRequest(BaseModel):
    items: list[SyncItem]


class SyncResponse(BaseModel):
    accepted: int
    duplicates: int
    results: list[dict[str, Any]]


class ExtractRequest(BaseModel):
    text: str
    language: str = "en"


class HealthOut(BaseModel):
    status: str
    synthetic: bool = True
    disclaimer: str
    demo_today: str
