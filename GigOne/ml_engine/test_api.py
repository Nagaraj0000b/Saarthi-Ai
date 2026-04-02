"""
GigOne Saarthi — API Testing Script
===================================
This script tests the Machine Learning Inference API to ensure it 
is running and correctly filtering recommendations based on 
user registration and skill compatibility.

Technical Terms Defined:
-----------------------
- API Request: A message sent to a server asking for information.
- Payload: The data sent in a request (like user location or time).
- Status Code: A number from the server indicating if the request was 
  successful (200 means OK).
- Filtering: The process of removing items that do not meet certain criteria.
"""

import requests
import json

def run_api_tests():
    """
    Sends multiple test requests to the API and prints the results.
    """
    BASE_URL = "http://localhost:8000"

    # Test 1: Simple Connectivity Check
    print("--------------------------------------------------")
    print("TEST 1: Connectivity Check")
    print("--------------------------------------------------")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
    except Exception as error:
        print(f"Error: Could not connect to the API. {error}")
        return

    # Standard user context template
    user_template = {
        "hour": 13,
        "day": 2,
        "weather": "Rain",
        "temp": 28.5,
        "traffic": "heavy",
        "congestion_percent": 65,
        "hours_today": 3.5,
        "hours_last_3_days": 12.0,
        "consecutive_days": 4,
        "mood_score": 0.2,
        "burnout_risk": "low",
        "skill_bike": 0,
        "skill_car": 0,
        "skill_digital": 0,
        "registered_jobs": []
    }

    # Test 2: Registered Bike worker in the rain
    print("\n--------------------------------------------------")
    print("TEST 2: Registered Bike Worker (Multiple Jobs)")
    print("--------------------------------------------------")
    user_2 = user_template.copy()
    user_2["skill_bike"] = 1
    user_2["registered_jobs"] = ["Swiggy", "Zomato", "Blinkit", "Zepto"]
    
    response = requests.post(f"{BASE_URL}/recommend", json=user_2)
    recommendations = response.json()

    print(f"Requested: {user_2['registered_jobs']}")
    print(f"Received: {[r['job'] for r in recommendations]}")
    
    print(f"\n{'Rank':<5} {'Job':<16} {'Type':<18} {'Earnings':>8}  {'Compatible'}")
    print("-" * 65)
    for index, item in enumerate(recommendations, 1):
        compatibility_status = "YES" if item["is_compatible"] else "NO"
        print(f"{index:<5} {item['job']:<16} {item['job_type']:<18} {item['predicted_earning']:>8.1f}  {compatibility_status}")

    # Test 3: Registration Filtering (Subset)
    print("\n--------------------------------------------------")
    print("TEST 3: Registration Filtering (Only Uber and Ola)")
    print("--------------------------------------------------")
    user_3 = user_template.copy()
    user_3["skill_car"] = 1
    user_3["registered_jobs"] = ["Uber", "Ola"]
    
    response = requests.post(f"{BASE_URL}/recommend", json=user_3)
    recommendations = response.json()
    
    jobs_returned = [r['job'] for r in recommendations]
    print(f"Requested: {user_3['registered_jobs']}")
    print(f"Received: {jobs_returned}")
    
    if all(j in user_3["registered_jobs"] for j in jobs_returned) and len(jobs_returned) > 0:
        print("SUCCESS: Only registered jobs were returned.")
    else:
        print("FAILURE: Registration filtering failed.")

    # Test 4: Compatibility Filtering
    print("\n--------------------------------------------------")
    print("TEST 4: Compatibility Filtering (Registered but No Skills)")
    print("--------------------------------------------------")
    user_4 = user_template.copy()
    user_4["skill_bike"] = 1
    user_4["skill_digital"] = 0
    user_4["registered_jobs"] = ["Swiggy", "DataEntry Inc"] # Swiggy (bike), DataEntry (digital)
    
    response = requests.post(f"{BASE_URL}/recommend", json=user_4)
    recommendations = response.json()
    
    jobs_returned = [r['job'] for r in recommendations]
    print(f"Requested: {user_4['registered_jobs']}")
    print(f"Received: {jobs_returned}")
    
    if "DataEntry Inc" not in jobs_returned and "Swiggy" in jobs_returned:
        print("SUCCESS: Incompatible job was filtered out.")
    else:
        print("FAILURE: Compatibility filtering failed.")

    print("\n--------------------------------------------------")
    print("ALL TESTS COMPLETED")
    print("--------------------------------------------------")

if __name__ == "__main__":
    run_api_tests()
