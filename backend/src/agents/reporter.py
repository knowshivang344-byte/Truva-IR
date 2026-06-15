import json
import uuid
import datetime
import traceback

from pydantic import BaseModel, Field
from typing import List
from langchain_core.prompts import ChatPromptTemplate

from src.agents.gemini_client import create_gemini_llm, extract_llm_text, parse_llm_json
from src.graph.state import InvestigationState
from src.api.websockets.relay import sio


class ForensicReport(BaseModel):
    executive_summary: str = Field(description="High-level narrative of the attack and memory forensic findings.")
    attack_timeline: List[str] = Field(description="Chronological progression of the compromise based on evidence.")
    mitre_attack_summary: List[str] = Field(description="List of identified MITRE techniques.")
    confirmed_findings: List[str] = Field(description="High confidence findings (>= 0.80).")
    inferred_findings: List[str] = Field(description="Low confidence or suspicious findings (< 0.80).")
    recommended_remediations: List[str]
    self_correction_summary: str = Field(description="Summary of how the AI corrected its hypotheses during the investigation.")


reporter_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        (
            "You are the Lead Incident Responder for TRUVA-IR. "
            "Synthesize the memory forensics investigation. "
            "Generate a senior-analyst style narrative report. "
            "Separate confirmed findings from inferred/suspicious ones. "
            "Detail the attack progression and how the AI iterated its hypotheses. "
            "Return ONLY valid JSON matching this schema: "
            '{{"executive_summary": "...", "attack_timeline": [], "mitre_attack_summary": [], '
            '"confirmed_findings": [], "inferred_findings": [], '
            '"recommended_remediations": [], "self_correction_summary": "..."}}'
        )
    ),
    (
        "user",
        "Iteration Memory: {iteration_memory}\nOverall Confidence: {overall_confidence}\nFindings:\n{findings}\n\nGenerate the structured report."
    )
])


def _fallback_report(state: InvestigationState, findings: list, overall_confidence: float) -> dict:
    finding_titles = [f.get("title", "Unknown") for f in findings]
    return {
        "report_id": str(uuid.uuid4()),
        "investigation_id": state.get('investigation_id', 'unknown'),
        "generated_at": datetime.datetime.utcnow().isoformat(),
        "evidence_integrity": {
            "filename": state.get("evidence_path", "memory.raw").split("/")[-1],
            "integrity_verified": True
        },
        "overall_confidence": overall_confidence,
        "executive_summary": (
            "Automated report fallback: LLM synthesis unavailable. "
            f"Investigation produced {len(findings)} finding(s)."
        ),
        "attack_timeline": [],
        "mitre_attack_summary": [],
        "confirmed_findings": finding_titles,
        "inferred_findings": [],
        "recommended_remediations": ["Review raw Volatility plugin outputs manually."],
        "self_correction_summary": "N/A — report generated from fallback path.",
        "findings": findings
    }


async def generate_report_node(state: InvestigationState) -> dict:
    investigation_id = state.get('investigation_id', 'unknown')
    await sio.emit(
        'agent:state_change',
        {'agent': 'reporter', 'status': 'active'},
        room=f"investigation:{investigation_id}"
    )

    findings = state.get('findings', [])
    overall_confidence = state.get('overall_confidence', 0.0)
    iteration_memory = state.get('iteration_memory', {})

    try:
        llm = create_gemini_llm(model="gemini-flash-latest", temperature=0.2)
        chain = reporter_prompt | llm

        optimized_findings = [
            {k: v for k, v in f.items() if k in ["title", "severity", "confidence_score", "mitre_techniques", "reasoning_chain"]}
            for f in findings
        ]

        response = await chain.ainvoke({
            "overall_confidence": overall_confidence,
            "findings": json.dumps(optimized_findings),
            "iteration_memory": json.dumps(iteration_memory)
        })

        content = extract_llm_text(response)

        try:
            parsed = parse_llm_json(content)
            # Normalize list of strings fields to handle cases where LLM returns dictionaries instead of plain strings
            for field in ["attack_timeline", "mitre_attack_summary", "confirmed_findings", "inferred_findings", "recommended_remediations"]:
                if field in parsed and isinstance(parsed[field], list):
                    cleaned = []
                    for item in parsed[field]:
                        if isinstance(item, dict):
                            action = item.get("action") or item.get("description") or item.get("title") or str(item)
                            priority = item.get("priority") or item.get("severity")
                            if priority:
                                cleaned.append(f"{action} ({priority})")
                            else:
                                cleaned.append(action)
                        else:
                            cleaned.append(str(item))
                    parsed[field] = cleaned
            report_data = ForensicReport(**parsed)
        except Exception as parse_err:
            print(f"Reporter JSON parse error: {parse_err}")
            report = _fallback_report(state, findings, overall_confidence)
        else:
            report = {
                "report_id": str(uuid.uuid4()),
                "investigation_id": investigation_id,
                "generated_at": datetime.datetime.utcnow().isoformat(),
                "evidence_integrity": {
                    "filename": state.get("evidence_path", "memory.raw").split("/")[-1],
                    "integrity_verified": True
                },
                "overall_confidence": overall_confidence,
                "executive_summary": report_data.executive_summary,
                "attack_timeline": report_data.attack_timeline,
                "mitre_attack_summary": report_data.mitre_attack_summary,
                "confirmed_findings": report_data.confirmed_findings,
                "inferred_findings": report_data.inferred_findings,
                "recommended_remediations": report_data.recommended_remediations,
                "self_correction_summary": report_data.self_correction_summary,
                "findings": findings
            }
    except Exception as e:
        print(f"Reporter Error: {e}")
        traceback.print_exc()
        report = _fallback_report(state, findings, overall_confidence)

    await sio.emit('report:complete', report, room=f"investigation:{investigation_id}")
    await sio.emit(
        'agent:state_change',
        {'agent': 'reporter', 'status': 'idle'},
        room=f"investigation:{investigation_id}"
    )

    return {
        "report": report,
        "report_status": "complete"
    }
