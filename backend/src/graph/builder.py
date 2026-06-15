from typing import Literal
from langgraph.graph import StateGraph, END
from src.graph.state import InvestigationState
from src.debug_log import with_node_logging

# Nodes
from src.agents.planner import plan_investigation_node
from src.agents.executor import execute_plugins_node
from src.agents.verifier import verify_findings_node
from src.agents.reporter import generate_report_node

async def evaluate_loop_node(state: InvestigationState) -> dict:
    # Just a pass-through to increment iteration and check state
    return {
        "iteration": state.get("iteration", 0) + 1
    }

def loop_decision_fn(state: InvestigationState) -> Literal['revise_plan', 'generate_report']:
    iteration = state.get("iteration", 0)
    max_iterations = state.get("max_iterations", 3)
    loop_trigger = state.get("loop_trigger")
    
    if iteration >= max_iterations:
        return 'generate_report'
        
    if loop_trigger in ["CONTRADICTION_DETECTED", "LOW_CONFIDENCE"]:
        return 'revise_plan'
        
    return 'generate_report'

def build_investigation_graph():
    builder = StateGraph(InvestigationState)
    
    builder.add_node('plan_investigation', with_node_logging('planner', plan_investigation_node))
    builder.add_node('execute_plugins', with_node_logging('executor', execute_plugins_node))
    builder.add_node('verify_findings', with_node_logging('verifier', verify_findings_node))
    builder.add_node('evaluate_loop', evaluate_loop_node)
    builder.add_node('generate_report', with_node_logging('reporter', generate_report_node))
    
    builder.set_entry_point('plan_investigation')
    
    builder.add_edge('plan_investigation', 'execute_plugins')
    builder.add_edge('execute_plugins', 'verify_findings')
    builder.add_edge('verify_findings', 'evaluate_loop')
    
    builder.add_conditional_edges(
        'evaluate_loop',
        loop_decision_fn,
        {
            'revise_plan': 'plan_investigation',
            'generate_report': 'generate_report'
        }
    )
    
    builder.add_edge('generate_report', END)
    
    return builder.compile()
