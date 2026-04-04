from langgraph.graph import StateGraph, START, END
from .state import VoiceChatState
from .nodes import greeting_node, mood_node

def create_graph():
    """Initializes the StateGraph holding the conversational flow logic."""
    workflow = StateGraph(VoiceChatState)
    
    # Nodes
    workflow.add_node("greeting_node", greeting_node)
    workflow.add_node("mood_node", mood_node)
    
    # Sequential processing (basic mapping for Phase 2 constraint testing)
    workflow.add_edge(START, "greeting_node")
    workflow.add_edge("greeting_node", "mood_node")
    workflow.add_edge("mood_node", END)
    
    return workflow.compile()
