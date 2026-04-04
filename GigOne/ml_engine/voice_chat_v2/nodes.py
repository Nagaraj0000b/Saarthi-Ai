import os
import requests
from typing import Dict, Any
from .state import VoiceChatState

NODE_BACKEND_URL = os.environ.get("NODE_BACKEND_URL", "http://127.0.0.1:5000")

def greeting_node(state: VoiceChatState) -> Dict[str, Any]:
    """Requests localized greeting from Node backend."""
    headers = {"Authorization": f"Bearer {state.get('user_token', '')}"}
    payload = {
        "language": state.get("language", "English"),
        "platforms": state.get("jobs_list", []),
        "skills": state.get("skills_list", [])
    }
    try:
        response = requests.post(f"{NODE_BACKEND_URL}/api/chat/raw-greeting", headers=headers, json=payload, timeout=5)
        response.raise_for_status()
        greeting = response.json().get("greeting", "Hello!")
    except Exception as e:
        print(f"Greeting error: {e}")
        greeting = "Hi there! How was your shift?"
        
    return {
        "final_summary": greeting,  # Use final_summary to hold the response output to the user
        "current_step": "waiting_for_mood" 
    }

def mood_node(state: VoiceChatState) -> Dict[str, Any]:
    """Analyzes the user_input for mood using the Node backend sentiment analysis."""
    headers = {"Authorization": f"Bearer {state.get('user_token', '')}"}
    payload = {
        "language": state.get("language", "English"),
        "text": state.get("user_input", "")
    }
    
    try:
        response = requests.post(f"{NODE_BACKEND_URL}/api/chat/raw-sentiment", headers=headers, json=payload, timeout=5)
        response.raise_for_status()
        result = response.json()
        
        mood_str = result.get("summary", "Neutral")
        score = float(result.get("score", 0.0))
    except Exception as e:
        print(f"Sentiment error: {e}")
        mood_str = "Neutral"
        score = 0.0

    return {
        "mood": mood_str,
        "sentiment_score": score,
        "current_step": "platform_selection"
    }
