import json

from langchain_core.prompts import ChatPromptTemplate

from src.agents.gemini_client import create_gemini_llm, extract_llm_text, parse_llm_json
from src.graph.state import (
    InvestigationState,
    InvestigationPlan,
    PluginSpec
)

from src.api.websockets.relay import sio


planner_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        (
            "You are an Elite Autonomous DFIR Analyst. "
            "Generate a tactical investigation plan for the given OS profile "
            "and evidence context. You MUST review the Iteration Memory "
            "to avoid repeating failed paths. "
            "For every plugin, provide a clear rationale and expected_outcome. "
            "Return ONLY valid JSON matching this schema: "
            '{"investigation_id": "...", "iteration": 1, "classification": [], '
            '"hypotheses": [], "plugin_plan": [{"plugin": "...", "priority": 1, '
            '"conditional": false, "rationale": "...", "expected_outcome": "...", "args": []}]}'
        )
    ),
    (
        "user",
        (
            "OS Profile: {os_profile}\n"
            "Evidence Path: {evidence_path}\n"
            "Iteration Memory: {iteration_memory}\n"
            "Context Summaries: {context_summaries}\n"
            "Loop Trigger: {loop_trigger}\n"
            "Generate the investigation plan."
        )
    )
])


def _fallback_plan(state: InvestigationState) -> InvestigationPlan:
    return InvestigationPlan(
        investigation_id=state.get("investigation_id", "unknown"),
        iteration=state.get("iteration", 0) + 1,
        classification=["memory_forensics"],
        hypotheses=[],
        plugin_plan=[
            PluginSpec(
                plugin="windows.pslist.PsList",
                priority=1,
                conditional=False,
                rationale="Fallback plugin execution",
                expected_outcome="List running processes",
                args=[]
            )
        ]
    )


async def plan_investigation_node(state: InvestigationState) -> dict:

    await sio.emit(
        'agent:state_change',
        {'agent': 'planner', 'status': 'active'},
        room=f"investigation:{state['investigation_id']}"
    )

    try:
        llm = create_gemini_llm(model="gemini-flash-latest", temperature=0.2)
        chain = planner_prompt | llm

        response = await chain.ainvoke({
            "os_profile": json.dumps(state.get("os_profile", {})),
            "evidence_path": state.get("evidence_path", "unknown"),
            "iteration_memory": json.dumps(state.get("iteration_memory", {})),
            "context_summaries": json.dumps(state.get("context_summaries", {})),
            "loop_trigger": state.get("loop_trigger", "none")
        })

        content = extract_llm_text(response)

        try:
            parsed = parse_llm_json(content)
            plan = InvestigationPlan(**parsed)
        except Exception:
            plan = _fallback_plan(state)

        await sio.emit(
            'agent:state_change',
            {'agent': 'planner', 'status': 'idle'},
            room=f"investigation:{state['investigation_id']}"
        )

        return {
            "investigation_plan": plan.model_dump(),
            "hypotheses": [
                h.model_dump()
                for h in plan.hypotheses
            ],
            "plugin_queue": [
                p.model_dump()
                for p in plan.plugin_plan
            ]
        }

    except Exception as e:

        await sio.emit(
            'agent:state_change',
            {
                'agent': 'planner',
                'status': 'error',
                'error': str(e)
            },
            room=f"investigation:{state['investigation_id']}"
        )

        plan = _fallback_plan(state)
        return {
            "investigation_plan": plan.model_dump(),
            "hypotheses": [],
            "plugin_queue": [p.model_dump() for p in plan.plugin_plan],
        }
