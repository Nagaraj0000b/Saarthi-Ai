from langgraph.graph import StateGraph, START, END
from .state import VoiceChatState
from .nodes import greeting_node, mood_node, platform_node, earnings_node, hours_node, final_summary_node, retry_node

def start_router(state: VoiceChatState) -> str:
    """Routes to the correct node based on the conversation's current_step."""
    step = state.get("current_step")
    
    if not step or step == "start":
        return "greeting_node"
    elif step == "waiting_for_mood":
        return "mood_node"
    elif step == "platform_selection":
        return "platform_node"
    elif step == "earnings_extraction":
        return "earnings_node"
    elif step == "hours_extraction":
        return "hours_node"
    elif step == "final_summarization":
        return "final_summary_node"
    else:
        # Default or fallback
        return "greeting_node"

def create_graph():
    """Initializes the StateGraph holding the conversational flow logic."""
    workflow = StateGraph(VoiceChatState)

    # Nodes
    workflow.add_node("greeting_node", greeting_node)
    workflow.add_node("mood_node", mood_node)
    workflow.add_node("platform_node", platform_node)
    workflow.add_node("earnings_node", earnings_node)
    workflow.add_node("hours_node", hours_node)
    workflow.add_node("final_summary_node", final_summary_node)
    workflow.add_node("retry_node", retry_node)

    # Starting Router
    workflow.add_conditional_edges(START, start_router)

    # Flow Logic
    # Most nodes return to END because they expect a new user input via a new invoke() call.
    workflow.add_edge("greeting_node", END)
    workflow.add_edge("mood_node", END)
    workflow.add_edge("platform_node", END)
    workflow.add_edge("earnings_node", END)
    workflow.add_edge("retry_node", END)

    # Hours node flows directly into final summary node without waiting for new input
    workflow.add_edge("hours_node", "final_summary_node")
    workflow.add_edge("final_summary_node", END)

    return workflow.compile()
