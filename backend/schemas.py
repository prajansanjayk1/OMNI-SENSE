"""
Project Omni-Sense - Tiered Spatial Credit Intelligence Early Warning System
Pydantic Schemas for Data Payloads, XAI Feature Attribution, and Dynamic Loan Restructuring
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class TierLevel(str, Enum):
    """Risk tier classification levels"""
    TIER_1 = "tier_1"  # Baseline monitoring
    TIER_2 = "tier_2"  # Elevated risk triggers
    TIER_3 = "tier_3"  # Critical default breach


class AgentType(str, Enum):
    """Autonomous agent types in the swarm"""
    PLANNER = "planner"
    DECOMPOSER = "decomposer"
    AUDITOR = "auditor"
    CHASER = "chaser"
    EYE = "eye"
    COMPLIANCE = "compliance"
    FRAUD = "fraud"
    MEMORY = "memory"
    KNOWLEDGE = "knowledge"
    REASONING = "reasoning"
    DECISION = "decision"
    REPORTER = "reporter"


class AgentLogEntry(BaseModel):
    """Individual agent execution log entry"""
    agent_type: AgentType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message: str
    data_payload: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    execution_time_ms: Optional[float] = None


class ECourtsData(BaseModel):
    """Simulated E-Courts litigation data payload"""
    corporate_id: str
    active_litigations: int = Field(ge=0)
    case_types: List[str] = []
    total_claim_amount: Optional[float] = None
    last_filing_date: Optional[datetime] = None
    court_jurisdiction: Optional[str] = None


class GSTNetworkData(BaseModel):
    """Simulated GST network delta tracking payload"""
    corporate_id: str
    gstin: str
    reported_revenue_growth: float  # Percentage
    actual_transaction_velocity: int  # Transactions per month
    supplier_network_delta: int  # Net change in active suppliers
    return_filing_delay_days: Optional[int] = Field(None, ge=0)


class SmartMeterData(BaseModel):
    """Simulated smart-meter grid voltage monitoring payload"""
    corporate_id: str
    facility_id: str
    avg_voltage_drop: float  # Percentage from baseline
    consumption_pattern_anomaly: float  # Deviation score
    peak_hours_shift: Optional[str] = None
    equipment_status_flags: List[str] = []


class FastagMobilityData(BaseModel):
    """Simulated Fastag/NETC fleet logistics tracking payload"""
    corporate_id: str
    fleet_size: int = Field(gt=0)
    weekly_toll_transits: int = Field(ge=0)
    avg_transit_velocity: float  # Transits per week
    route_divergence_index: float  # Deviation from expected routes
    idle_vehicle_percentage: float = Field(ge=0.0, le=100.0)


class SARSatelliteData(BaseModel):
    """Simulated Synthetic Aperture Radar satellite imagery analysis payload"""
    corporate_id: str
    facility_coordinates: tuple  # (lat, lon)
    capture_date: datetime
    raw_material_stockpile_coverage: float  # Percentage of outdoor storage area
    volumetric_depletion_rate: float  # Percentage change from baseline
    thermal_activity_signature: str  # "high", "medium", "low", "none"
    infrastructure_change_detected: bool = False


class SHAPContribution(BaseModel):
    """Individual SHAP feature attribution contribution"""
    feature_name: str
    contribution_percentage: float = Field(ge=0.0, le=100.0)
    direction: Literal["positive", "negative"]
    baseline_value: Optional[float] = None
    current_value: Optional[float] = None


class XAIAttributionReport(BaseModel):
    """Complete XAI feature attribution report"""
    corporate_id: str
    default_probability: float = Field(ge=0.0, le=1.0)
    shap_contributions: List[SHAPContribution]
    model_version: str = "v1.0.0"
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    feature_importance_ranking: List[str] = []


class RestructuringSchedule(BaseModel):
    """Dynamic loan restructuring schedule parameters"""
    original_emi: float = Field(gt=0)
    original_tenure_months: int = Field(gt=0)
    proposed_emi: Optional[float] = Field(None, gt=0)
    proposed_tenure_months: Optional[int] = Field(None, gt=0)
    moratorium_months: int = Field(default=0, ge=0)
    interest_rate_reduction_bps: Optional[int] = Field(None, ge=0)
    velocity_linked_adjustment: bool = False


class RestructuringSimulation(BaseModel):
    """Complete restructuring simulation output"""
    corporate_id: str
    current_outstanding: float = Field(gt=0)
    original_schedule: RestructuringSchedule
    proposed_schedule: RestructuringSchedule
    projected_recovery_rate: float = Field(ge=0.0, le=100.0)
    npv_impact: Optional[float] = None
    risk_mitigation_score: float = Field(ge=0.0, le=100.0)
    recommended_action: Literal["approve", "reject", "review"]


class GraphState(BaseModel):
    """LangGraph-style shared state framework for agent swarm"""
    corporate_id: str
    current_tier: TierLevel = TierLevel.TIER_1
    agent_logs: List[AgentLogEntry] = []
    is_anomaly_detected: bool = False
    default_probability: float = Field(default=0.0, ge=0.0, le=1.0)
    shap_contributions: List[SHAPContribution] = []
    
    # Agent-specific data payloads
    ecourts_data: Optional[ECourtsData] = None
    gst_data: Optional[GSTNetworkData] = None
    smartmeter_data: Optional[SmartMeterData] = None
    fastag_data: Optional[FastagMobilityData] = None
    sar_data: Optional[SARSatelliteData] = None
    
    # Timestamp tracking
    analysis_started_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Restructuring context
    restructuring_simulation: Optional[RestructuringSimulation] = None


class AnalyzeRequest(BaseModel):
    """Request payload for /api/analyze endpoint"""
    corporate_id: str
    corporate_name: Optional[str] = None
    industry_sector: Optional[str] = None
    analysis_depth: Literal["quick", "standard", "deep"] = "standard"


class AnalyzeResponse(BaseModel):
    """Response payload for /api/analyze endpoint"""
    corporate_id: str
    status: Literal["success", "error", "in_progress"]
    current_tier: TierLevel
    default_probability: float
    anomaly_detected: bool
    agent_logs: List[AgentLogEntry]
    shap_contributions: List[SHAPContribution]
    message: str
    processing_time_ms: float


class RestructureRequest(BaseModel):
    """Request payload for /api/restructure endpoint"""
    corporate_id: str
    current_outstanding: float = Field(gt=0)
    original_emi: float = Field(gt=0)
    original_tenure_months: int = Field(gt=0)
    proposed_emi: Optional[float] = Field(None, gt=0)
    proposed_tenure_months: Optional[int] = Field(None, gt=0)
    moratorium_months: int = Field(default=0, ge=0)
    interest_rate_reduction_bps: Optional[int] = Field(None, ge=0)
    velocity_linked: bool = False


class StreamEvent(BaseModel):
    """WebSocket stream event payload"""
    event_type: Literal["agent_update", "tier_change", "anomaly_detected", "analysis_complete"]
    corporate_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any]
    tier: Optional[TierLevel] = None


class VoiceCommand(BaseModel):
    """Voice command payload for conversational interface"""
    command_text: str
    intent: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)


class VoiceResponse(BaseModel):
    """Voice response payload from AI assistant"""
    response_text: str
    audio_data: Optional[str] = None  # Base64 encoded audio
    action_triggered: Optional[str] = None
    screen_navigation: Optional[Literal["screen_1", "screen_2", "screen_3"]] = None
    state_update: Optional[Dict[str, Any]] = None


class WebSocketMessage(BaseModel):
    """Unified WebSocket message format"""
    message_type: Literal["stream_event", "voice_command", "voice_response", "state_update"]
    payload: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Validator for ensuring SHAP contributions sum to 100%
@validator('shap_contributions')
def validate_shap_sum(cls, v):
    if v:
        total = sum(item.contribution_percentage for item in v)
        if not (99.0 <= total <= 101.0):  # Allow small floating point errors
            raise ValueError(f"SHAP contributions must sum to 100%, got {total}%")
    return v


# Validator for ensuring at least one agent log entry exists when anomaly is detected
@validator('agent_logs')
def validate_logs_with_anomaly(cls, v, values):
    if values.get('is_anomaly_detected') and not v:
        raise ValueError("Agent logs required when anomaly is detected")
    return v

class ChatRequest(BaseModel):
    """REST request for chat"""
    command_text: str
    corporate_id: Optional[str] = None

class ChatResponse(BaseModel):
    """REST response for chat"""
    response_text: str
    action_triggered: Optional[str] = None
    screen_navigation: Optional[str] = None
    state_update: Optional[Dict[str, Any]] = None

class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    role: str
    branch_id: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class EmailVerificationRequest(BaseModel):
    token: str

class SupportTicketCreate(BaseModel):
    subject: str
    description: str

class LoanApplicationCreate(BaseModel):
    amount: float
    term_months: int
    purpose: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str
    email: str
    name: str

class RefreshRequest(BaseModel):
    refresh_token: str

class AuditLogEntry(BaseModel):
    id: int
    timestamp: str
    username: str
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    status: str

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: int
    created_at: str
    type: Optional[str] = None

class NotificationCreate(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    title: str
    message: str
    type: Optional[str] = "info"

class LoginHistoryResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: str
    timestamp: str
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    status: str
    failure_reason: Optional[str] = None

class UserAdminUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None
    branch_id: Optional[str] = None
    department: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    name: str
    branch_id: Optional[str] = None
    department: Optional[str] = None
    status: str
    last_login: Optional[str] = None
    profile_picture: Optional[str] = None

class BranchCreate(BaseModel):
    id: str
    name: str
    location: Optional[str] = None

class BranchResponse(BaseModel):
    id: str
    name: str
    location: Optional[str] = None

class DepartmentCreate(BaseModel):
    name: str
    branch_id: str

class DepartmentResponse(BaseModel):
    id: int
    name: str
    branch_id: str


