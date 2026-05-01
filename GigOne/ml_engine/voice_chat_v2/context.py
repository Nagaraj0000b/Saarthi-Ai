import os
import requests
from typing import Dict, List

# Connect to the Node backend running on port 5000 (from server/.env)
NODE_BACKEND_URL = os.environ.get("NODE_BACKEND_URL", "http://127.0.0.1:5000")

def load_user_profile(user_token: str) -> Dict[str, List[str]]:
    """Fetch user registered jobs and skills via the Node API."""
    headers = {"Authorization": f"Bearer {user_token}"}
    try:
        response = requests.get(f"{NODE_BACKEND_URL}/api/auth/profile", headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        user_data = data.get("data", data)
        return {
            "jobs": user_data.get("jobs", []),
            "skills": user_data.get("skills", [])
        }
    except Exception as e:
        print(f"Error loading user profile: {e}")
        return {"jobs": [], "skills": []}

def load_weather_traffic(user_token: str, lat: float, lon: float) -> Dict[str, str]:
    """Fetch live weather and traffic conditions using the Node backend API."""
    headers = {"Authorization": f"Bearer {user_token}"}
    try:
        url = f"{NODE_BACKEND_URL}/api/chat/context?lat={lat}&lon={lon}"
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        return {
            "weather_condition": data.get("weather", "unavailable"),
            "traffic_condition": data.get("traffic", "unavailable")
        }
    except Exception as e:
        print(f"Error loading weather/traffic: {e}")
        return {
            "weather_condition": "unavailable",
            "traffic_condition": "unavailable"
        }
