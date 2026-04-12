import sys
import os
import requests
import subprocess

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml_engine.voice_chat_v2.graph import create_graph

print("Generating temporary test token via Node...")
token = ""
try:
    node_cmd = """
const jwt = require("jsonwebtoken");
require("dotenv").config();
const token = jwt.sign({ userId: "123456789012345678901234", role: "worker" }, process.env.JWT_SECRET || "fallback", { expiresIn: "10d" });
console.log(token);
    """
    result = subprocess.run(["node", "-e", node_cmd], cwd="server", capture_output=True, text=True, encoding="utf-8")
    # Extract only the last line to ignore any dotenv debug messages printed to stdout
    token = result.stdout.strip().split('\n')[-1].strip()
except Exception as e:
    print(f"Token generation failed: {e}")

print("\nInitializing LangGraph...")
graph = create_graph()

print(f"\n--- Interactive LangGraph Test ---")
user_text = input("Enter your simulated reply (leave blank to test retry): ")

initial_state = {
    "language": "Hindi",
    "user_token": token,
    "user_input": user_text,
    "jobs_list": ["Uber", "DoorDash"],
    "skills_list": ["Driving"]
}

print(f"\n[Running LangGraph...]")

try:
    result_state = graph.invoke(initial_state)

    print("\n✅ --- Final State Result ---")
    print(f"🤖 Chatbot Greets / Replies: {result_state.get('final_summary')}")
    print(f"👤 User Replied: \"{initial_state['user_input']}\"")
    print(f"🧠 Detected Mood: {result_state.get('mood')} (Score: {result_state.get('sentiment_score')})")
    print(f"📍 Next Step in Graph: {result_state.get('current_step')}")
    
except Exception as e:
    print(f"❌ Exception: {e}")
