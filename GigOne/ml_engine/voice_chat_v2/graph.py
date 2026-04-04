from langgraph.graph import StateGraph, START, END
from .state import VoiceChatState

def start_node(state: VoiceChatState):
    """Dummy initial node to satisfy graph constraints."""
    return {"current_step": "started"}

def create_graph():
    """Initializes the base StateGraph with language constraints to be added later."""
    workflow = StateGraph(VoiceChatState)
    
    # Base nodes
    workflow.add_node("start_chat", start_node)
    
    # Language matching prompt logic will be attached to LLM wrapper functions
    # System Constraint Example: "You must respond strictly in {state['language']}"
    
    # Basic edges
    workflow.add_edge(START, "start_chat")
    workflow.add_edge("start_chat", END)
    
    return workflow.compile()
