import sys
import os
import requests
import subprocess
import json

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml_engine.voice_chat_v2.graph import create_graph

def get_token():
    try:
        node_cmd = """
const jwt = require("jsonwebtoken");
require("dotenv").config();
const token = jwt.sign({ userId: "123456789012345678901234", role: "worker" }, process.env.JWT_SECRET || "fallback", { expiresIn: "10d" });
console.log(token);
        """
        result = subprocess.run(["node", "-e", node_cmd], cwd="server", capture_output=True, text=True, encoding="utf-8")
        return result.stdout.strip().split('\n')[-1].strip()
    except Exception as e:
        print(f"Token generation failed: {e}")
        return None

def run_test():
    token = get_token()
    if not token:
        return

    graph = create_graph()
    
    # --- TURN 1: START ---
    print("\n--- TURN 1: START ---")
    state = {
        "language": "Hindi",
        "user_token": token,
        "jobs_list": ["Uber", "Swiggy"],
        "skills_list": ["Driving"]
    }

    state = graph.invoke(state)
    print(f"🤖 AI: {state.get('final_summary')}")
    print(f"📍 Step: {state.get('current_step')}")

    # --- TURN 2: MOOD ---
    print("\n--- TURN 2: MOOD ---")
    state["user_input"] = "I am feeling good today"
    state = graph.invoke(state)
    print(f"👤 User: {state.get('user_input')}")
    print(f"🧠 Mood: {state.get('mood')} (Score: {state.get('sentiment_score')})")
    print(f"🤖 AI: {state.get('final_summary')}")
    print(f"📍 Step: {state.get('current_step')}")

    # --- TURN 3: PLATFORM ---
    print("\n--- TURN 3: PLATFORM ---")
    state["user_input"] = "I worked on Uber"
    state = graph.invoke(state)
    print(f"👤 User: {state.get('user_input')}")
    print(f"🚕 Platform: {state.get('selected_platform')}")
    print(f"🤖 AI: {state.get('final_summary')}")
    print(f"📍 Step: {state.get('current_step')}")

    # --- TURN 4: VALID EARNINGS ---
    print("\n--- TURN 4: VALID EARNINGS ---")
    state["user_input"] = "I made around three hundered rupees"
    state = graph.invoke(state)
    print(f"👤 User: {state.get('user_input')}")
    print(f"💰 Earnings: {state.get('expected_earnings')}")
    print(f"🤖 AI: {state.get('final_summary')}")
    print(f"📍 Step: {state.get('current_step')}")

    # --- TURN 5: INVALID HOURS (RETRY) ---
    print("\n--- TURN 5: INVALID HOURS (RETRY) ---")
    state["user_input"] = "I worked for some time"
    state = graph.invoke(state)
    print(f"👤 User: {state.get('user_input')}")
    print(f"⏱️ Hours: {state.get('hours_worked')}")
    print(f"🤖 AI: {state.get('final_summary')}")
    print(f"📍 Step: {state.get('current_step')}")
    
    assert state.get("current_step") == "hours_extraction", "Should not advance on invalid hours."
    print("✅ Successfully handled invalid hours input (Retry triggered).")

    # --- TURN 6: EMPTY HOURS (RETRY) ---
    print("\n--- TURN 6: EMPTY HOURS (RETRY) ---")
    state["user_input"] = ""
    state = graph.invoke(state)
    print(f"👤 User: {state.get('user_input')}")
    print(f"⏱️ Hours: {state.get('hours_worked')}")
    print(f"🤖 AI: {state.get('final_summary')}")
    print(f"📍 Step: {state.get('current_step')}")
    
    assert state.get("current_step") == "hours_extraction", "Should not advance on empty hours."
    print("✅ Successfully handled empty hours input (Retry triggered).")

    # --- TURN 7: VALID HOURS ---
    print("\n--- TURN 7: VALID HOURS ---")
    state["user_input"] = "I worked for five hours"
    state = graph.invoke(state)
    print(f"👤 User: {state.get('user_input')}")
    print(f"⏱️ Hours: {state.get('hours_worked')}")
    print(f"🤖 AI: {state.get('final_summary')}")
    print(f"📍 Step: {state.get('current_step')}")

    # Assertions
    assert state.get("hours_worked") is not None, "Hours were not extracted."
    assert state.get("current_step") == "final_summarization", "Did not advance to final summarization step."
    print("\n✅ Flow successfully progressed to final summarization.")

if __name__ == "__main__":
    run_test()
