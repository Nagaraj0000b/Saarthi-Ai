import sys
import os
import subprocess

sys.path.append(os.path.join(os.path.dirname(__file__), "ml_engine"))

from voice_chat_v2.graph import create_graph

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
    print("Starting Phase 7 Test...")
    token = get_token()
    if not token:
        print("Could not generate token. Exiting.")
        return

    app = create_graph()
    
    # 1. Start / Greeting
    state = {
        "user_token": token,
        "language": "English",
        "jobs_list": ["Uber", "Lyft"],
        "skills_list": ["Driving"],
        "weather_condition": "rainy",
        "traffic_condition": "heavy",
        "current_step": "start"
    }
    
    print("\n--- TURN 1: START ---")
    state = app.invoke(state)
    print("AI:", state.get("final_summary"))
    print("current_step:", state.get("current_step"))
    assert state["current_step"] == "waiting_for_mood"
    
    # 2. Mood
    print("\n--- TURN 2: MOOD ---")
    state["user_input"] = "I feel great today"
    state = app.invoke(state)
    print("AI:", state.get("final_summary"))
    print("current_step:", state.get("current_step"))
    assert state["current_step"] == "platform_selection"
    
    # 3. Platform
    print("\n--- TURN 3: PLATFORM ---")
    state["user_input"] = "I drove for Uber"
    state = app.invoke(state)
    print("AI:", state.get("final_summary"))
    print("current_step:", state.get("current_step"))
    assert state["current_step"] == "earnings_extraction"
    
    # 4. Earnings
    print("\n--- TURN 4: EARNINGS ---")
    state["user_input"] = "I made 150 dollars"
    state = app.invoke(state)
    print("AI:", state.get("final_summary"))
    print("current_step:", state.get("current_step"))
    assert state["current_step"] == "hours_extraction"
    
    # 5. Hours -> Final Summary
    print("\n--- TURN 5: HOURS ---")
    state["user_input"] = "I worked 6 hours"
    
    # Since hours_node has an edge directly to final_summary_node,
    # invoking it now should run hours_node THEN final_summary_node in the same cycle!
    state = app.invoke(state)
    print("AI:", state.get("final_summary"))
    print("current_step:", state.get("current_step"))
    
    assert state["current_step"] == "completed", f"Expected completed, got {state['current_step']}"
    
    summary = state.get("final_summary", "").lower()
    print("\nSUCCESS: Flow completed successfully!")
    print("Please manually verify if weather/traffic is mentioned above.")

if __name__ == "__main__":
    run_test()

