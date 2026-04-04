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

def load_weather_traffic(lat: float, lon: float) -> Dict[str, str]:
    """Fetch live weather and traffic conditions using external APIs (not numbers, conditions only)."""
    weather_condition = "unavailable"
    traffic_condition = "unavailable"
    
    # OpenWeather fetching
    weather_key = os.environ.get("OPENWEATHER_API_KEY")
    if weather_key:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={weather_key}"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                weather_desc = res.json().get("weather", [{}])[0].get("description", "")
                if weather_desc:
                    weather_condition = weather_desc
        except Exception as e:
            print(f"Weather fetch error: {e}")
            
    # TomTom Traffic fetching
    tomtom_key = os.environ.get("TOMTOM_API_KEY")
    if tomtom_key:
        try:
            url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&key={tomtom_key}"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                flow_data = res.json().get("flowSegmentData", {})
                current_speed = flow_data.get("currentSpeed", 0)
                free_flow = flow_data.get("freeFlowSpeed", 1)
                
                # Turn numbers into conditions per requirements
                if current_speed < free_flow * 0.5:
                    traffic_condition = "heavy traffic"
                elif current_speed < free_flow * 0.8:
                    traffic_condition = "moderate traffic"
                else:
                    traffic_condition = "light traffic"
        except Exception as e:
            print(f"Traffic fetch error: {e}")
            
    return {
        "weather_condition": weather_condition,
        "traffic_condition": traffic_condition
    }
