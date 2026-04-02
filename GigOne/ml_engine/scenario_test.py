import requests
import json

def test_user_scenario():
    BASE_URL = "http://localhost:8000"
    
    # User Scenario: Registered for Swiggy, Zomato, Uber, Ola
    # Skills: cab (skill_car) and bike driving (skill_bike)
    payload = {
        "hour": 14, # 2 PM
        "day": 3,   # Wednesday
        "weather": "Rain",
        "temp": 26.5,
        "traffic": "heavy",
        "congestion_percent": 75,
        "registered_jobs": ["Swiggy", "Zomato", "Uber", "Ola"],
        "skill_car": 1,
        "skill_bike": 1,
        "skill_heavy": 0,
        "skill_clean": 0,
        "skill_trade": 0,
        "skill_care": 0,
        "skill_digital": 0,
        "skill_support": 0,
        "hours_today": 2.5,
        "hours_last_3_days": 18.0,
        "consecutive_days": 4,
        "mood_score": 0.7,
        "burnout_risk": "low"
    }

    print("--------------------------------------------------")
    print("SCENARIO TEST: Multi-Skilled Registered Worker")
    print(f"Registered: {payload['registered_jobs']}")
    print(f"Skills: Car Driving, Bike Driving")
    print(f"Conditions: {payload['weather']}, {payload['traffic']} traffic")
    print("--------------------------------------------------\n")

    try:
        response = requests.post(f"{BASE_URL}/recommend", json=payload)
        if response.status_code == 200:
            recommendations = response.json()
            
            print(f"{'Rank':<5} {'Job':<12} {'Type':<30} {'Earnings':>8}")
            print("-" * 60)
            for index, item in enumerate(recommendations, 1):
                print(f"{index:<5} {item['job']:<12} {item['job_type']:<30} {item['predicted_earning']:>8.1f}")
            
            if not recommendations:
                print("No recommendations found for the given criteria.")
        else:
            print(f"Error: API returned status code {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error connecting to API: {e}")

if __name__ == "__main__":
    test_user_scenario()
