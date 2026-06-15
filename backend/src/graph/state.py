from typing import TypedDict, List, Dict, Optional, Literal
from pydantic import BaseModel

class PluginSpec(BaseModel):
    plugin: str
    priority: int
    conditional: bool
    rationale: str
    expected_outcome: str
    args: List[str] = []

class Hypothesis(BaseModel):
    id: str
    description: str
    confidence_prior: float
    supporting_plugins: List[str]

class InvestigationPlan(BaseModel):
    investigation_id: str
    iteration: int
    classification: List[str]
    hypotheses: List[Hypothesis]
    plugin_plan: List[PluginSpec]
    revision_rationale: Optional[str] = None

class PluginOutput(BaseModel):
    plugin: str
    raw: str
    exit_code: int
    stderr: str
    duration_ms: int
    parsed: List[dict]

class RawFinding(BaseModel):
    id: str
    title: str
    description: str
    severity: Literal['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
    evidence_citations: List[dict]
    corroborating_plugins: List[str]
    mitre_techniques: List[str]

class AnalystReasoning(BaseModel):
    interpretation: str
    forensic_significance: str
    confidence_justification: str

class VerifiedFinding(RawFinding):
    confidence_score: float
    confidence_label: str
    is_hallucination: bool
    reasoning_chain: AnalystReasoning

class InvestigationState(TypedDict):
    investigation_id: str
    case_id: str
    iteration: int
    max_iterations: int
    
    evidence_path: str
    evidence_sha256: str
    os_profile: dict
    benchmark_mode: bool
    
    investigation_plan: dict
    hypotheses: List[dict]
    plugin_queue: List[dict]
    executed_plugins: List[str]
    
    plugin_outputs: Dict[str, dict]
    execution_log: List[dict]
    
    findings: List[dict]
    confidence_scores: Dict[str, float]
    overall_confidence: float
    contradictions: List[dict]
    hallucinations: List[dict]
    loop_trigger: Optional[str]
    
    iteration_log: List[dict]
    iteration_memory: Dict[str, dict]
    context_summaries: Dict[str, str]
    best_iteration: int
    
    report: Optional[dict]
    report_status: str
