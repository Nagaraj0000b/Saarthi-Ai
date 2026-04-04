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
        response = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-greeting", headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        greeting = response.json().get("summary", "Hello!")
    except Exception as e:
        print(f"Greeting error: {e}")
        greeting = "Hi there! How was your shift?"
        
    return {
        "final_summary": greeting,
        "current_step": "waiting_for_mood" 
    }

def mood_node(state: VoiceChatState) -> Dict[str, Any]:
    """Analyzes mood and then asks for platform selection."""
    headers = {"Authorization": f"Bearer {state.get('user_token', '')}"}
    
    # 1. Analyze Sentiment
    payload_sentiment = {
        "language": state.get("language", "English"),
        "text": state.get("user_input", "")
    }
    
    try:
        resp_sent = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-sentiment", headers=headers, json=payload_sentiment, timeout=30)
        resp_sent.raise_for_status()
        result = resp_sent.json()
        
        is_valid = result.get("isValid", True)
        mood_str = result.get("summary", "Neutral")
        
        if not is_valid or mood_str == "Invalid":
            return retry_node(state)
            
        score = float(result.get("score", 0.0))
    except Exception as e:
        print(f"Sentiment error: {e}")
        mood_str = "Neutral"
        score = 0.0

    # 2. Get Acknowledgment and "Ask Platform" question
    payload_reply = {
        "language": state.get("language", "English"),
        "state": "ask_platform",
        "platforms": state.get("jobs_list", []),
        "skills": state.get("skills_list", []),
        "dailyMood": { "moodLabel": mood_str }
    }
    
    try:
        resp_reply = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-reply", headers=headers, json=payload_reply, timeout=30)
        resp_reply.raise_for_status()
        reply = resp_reply.json().get("summary", "Got it. Which platform did you work on today?")
    except Exception as e:
        print(f"Mood acknowledgment error: {e}")
        reply = f"I see you're feeling {mood_str}. Which platform did you work on today?"

    return {
        "mood": mood_str,
        "sentiment_score": score,
        "final_summary": reply,
        "current_step": "platform_selection"
    }

def platform_node(state: VoiceChatState) -> Dict[str, Any]:
    """Extracts platform and moves to earnings extraction."""
    headers = {"Authorization": f"Bearer {state.get('user_token', '')}"}
    
    # 1. Extract Platform from user input
    payload_extract = {
        "text": state.get("user_input", ""),
        "platforms": state.get("jobs_list", [])
    }
    
    try:
        resp_ext = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-extract", headers=headers, json=payload_extract, timeout=30)
        resp_ext.raise_for_status()
        data = resp_ext.json()
        platform = data.get("platform")
    except Exception as e:
        print(f"Extraction error: {e}")
        platform = None

    # 2. Verify Platform
    valid_platforms = [p.lower() for p in state.get("jobs_list", [])]
    if not platform or platform.lower() not in valid_platforms:
        # Trigger retry_platform
        return retry_node(state)

    # 3. Get Acknowledgment and "Ask Earnings" question
    payload_reply = {
        "language": state.get("language", "English"),
        "state": "ask_earnings",
        "platforms": state.get("jobs_list", []),
        "dailyMood": { "moodLabel": state.get("mood", "Neutral") },
        "extractedData": { "platform": platform }
    }
    
    try:
        resp_reply = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-reply", headers=headers, json=payload_reply, timeout=30)
        resp_reply.raise_for_status()
        reply = resp_reply.json().get("summary", f"Got it, {platform}. How much did you earn today?")
    except Exception as e:
        print(f"Platform acknowledgment error: {e}")
        reply = f"Got it, {platform}. How much did you earn today?"

    return {
        "selected_platform": platform,
        "final_summary": reply,
        "current_step": "earnings_extraction"
    }

def earnings_node(state: VoiceChatState) -> Dict[str, Any]:
    """Extracts earnings and moves to hours extraction."""
    headers = {"Authorization": f"Bearer {state.get('user_token', '')}"}
    
    # 1. Extract Earnings from user input
    payload_extract = {
        "text": state.get("user_input", ""),
        "platforms": state.get("jobs_list", [])
    }
    
    try:
        resp_ext = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-extract", headers=headers, json=payload_extract, timeout=30)
        resp_ext.raise_for_status()
        data = resp_ext.json()
        earnings = data.get("earnings")
    except Exception as e:
        print(f"Extraction error: {e}")
        earnings = None

    # 2. Verify Earnings
    if not earnings:
        # Trigger retry_earnings
        return retry_node(state)

    # 3. Get Acknowledgment and "Ask Hours" question
    payload_reply = {
        "language": state.get("language", "English"),
        "state": "ask_hours",
        "platforms": state.get("jobs_list", []),
        "dailyMood": { "moodLabel": state.get("mood", "Neutral") },
        "extractedData": { 
            "platform": state.get("selected_platform"),
            "earnings": str(earnings)
        }
    }
    
    try:
        resp_reply = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-reply", headers=headers, json=payload_reply, timeout=30)
        resp_reply.raise_for_status()
        reply = resp_reply.json().get("summary", f"Got it, {earnings}. How many hours did you work?")
    except Exception as e:
        print(f"Earnings acknowledgment error: {e}")
        reply = f"Got it, {earnings}. How many hours did you work?"

    return {
        "expected_earnings": str(earnings),
        "final_summary": reply,
        "current_step": "hours_extraction"
    }

def hours_node(state: VoiceChatState) -> Dict[str, Any]:
    """Extracts hours and moves to final summarization."""
    headers = {"Authorization": f"Bearer {state.get('user_token', '')}"}
    
    # 1. Extract Hours from user input
    payload_extract = {
        "text": state.get("user_input", ""),
        "platforms": state.get("jobs_list", [])
    }
    
    try:
        resp_ext = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-extract", headers=headers, json=payload_extract, timeout=30)
        resp_ext.raise_for_status()
        data = resp_ext.json()
        hours = data.get("hours")
    except Exception as e:
        print(f"Extraction error: {e}")
        hours = None

    # 2. Verify Hours
    if not hours:
        # Trigger retry_hours
        return retry_node(state)

    return {
        "hours_worked": str(hours),
        "current_step": "final_summarization"
    }

def final_summary_node(state: VoiceChatState) -> Dict[str, Any]:
    """Generates the final summary including weather and traffic context."""
    headers = {"Authorization": f"Bearer {state.get('user_token', '')}"}
    
    payload_reply = {
        "language": state.get("language", "English"),
        "state": "complete",
        "platforms": state.get("jobs_list", []),
        "dailyMood": { "moodLabel": state.get("mood", "Neutral") },
        "extractedData": { 
            "platform": state.get("selected_platform"),
            "earnings": state.get("expected_earnings"),
            "hours": state.get("hours_worked")
        },
        "weather": {"nextShift": {"description": state.get("weather_condition", "clear")}},
        "traffic": {"traffic_level": state.get("traffic_condition", "light")}
    }
    
    try:
        resp_reply = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-reply", headers=headers, json=payload_reply, timeout=30)
        resp_reply.raise_for_status()
        reply = resp_reply.json().get("summary", "Thanks for sharing! Have a great next shift.")
    except Exception as e:
        print(f"Final summary error: {e}")
        reply = "Thanks for sharing! Have a great next shift."

    return {
        "final_summary": reply,
        "current_step": "completed"
    }

def retry_node(state: VoiceChatState) -> Dict[str, Any]:
    """Handles empty or unintelligible user input by requesting a retry prompt from Node."""
    headers = {"Authorization": f"Bearer {state.get('user_token', '')}"}
    
    # Map current step to the appropriate backend retry state
    current = state.get("current_step", "")
    if "platform" in current or "job" in current:
        retry_state = "retry_platform"
    elif "earning" in current:
        retry_state = "retry_earnings"
    elif "hour" in current:
        retry_state = "retry_hours"
    else:
        retry_state = "retry" # default retry for mood/greeting

    payload = {
        "language": state.get("language", "English"),
        "state": retry_state,
        "platforms": state.get("jobs_list", []),
        "skills": state.get("skills_list", []),
        "dailyMood": { "moodLabel": state.get("mood", "Neutral") },
        "extractedData": {
            "platform": state.get("selected_platform"),
            "earnings": state.get("expected_earnings"),
            "hours": state.get("hours_worked")
        }
    }
    
    try:
        response = requests.post(f"{NODE_BACKEND_URL}/api/chat-v2/raw-reply", headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        reply = response.json().get("summary", "I didn't quite catch that. Could you repeat?")
    except Exception as e:
        print(f"Retry error: {e}")
        reply = "I didn't quite catch that. Could you please repeat?"

    return {
        "final_summary": reply
    }
