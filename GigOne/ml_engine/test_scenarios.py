import pandas as pd
import numpy as np
import xgboost as xgb
import pickle
import os
import json

# --- Configuration ---
MODEL_DIR = 'ml_engine/models'
ENCODER_PATH = os.path.join(MODEL_DIR, 'saarthi_encoders.pkl')
EARNINGS_MODEL_PATH = os.path.join(MODEL_DIR, 'saarthi_earnings_model.json')
WELLBEING_MODEL_PATH = os.path.join(MODEL_DIR, 'saarthi_wellbeing_model.json')

# Load models and encoders
with open(ENCODER_PATH, 'rb') as f:
    encoders = pickle.load(f)

model_earnings = xgb.Booster()
model_earnings.load_model(EARNINGS_MODEL_PATH)

model_wellbeing = xgb.Booster()
model_wellbeing.load_model(WELLBEING_MODEL_PATH)

# Define the features exactly as seen during training
FEATURE_COLS = [
    'gender', 'domain', 'job_type', 'platform', 'domain_experience_years',
    'skill_level', 'is_location_based', 'city', 'temperature_celsius',
    'humidity_percentage', 'congestion_percent', 'traffic_level',
    'moodLabel', 'moodScore', 'hours_today', 'hours_last_3_days', 'consecutive_days'
]

def predict_scenario(scenario_data):
    # 1. Convert scenario to DataFrame
    df_test = pd.DataFrame([scenario_data])
    
    # 2. Encode categorical fields using the saved encoders
    for col, le in encoders.items():
        if col in df_test.columns and col != 'burnout_risk':
            # Handle unknown labels gracefully
            if df_test[col].iloc[0] not in le.classes_:
                df_test[col] = le.transform([le.classes_[0]]) # Default to first class if unknown
            else:
                df_test[col] = le.transform(df_test[col])
    
    # 3. Ensure columns are in the right order
    X = df_test[FEATURE_COLS]
    dmatrix = xgb.DMatrix(X, feature_names=FEATURE_COLS)
    
    # 4. Get Predictions
    pred_earnings = model_earnings.predict(dmatrix)[0]
    
    # Wellbeing prediction (get class label)
    pred_wellbeing_probs = model_wellbeing.predict(dmatrix)[0]
    burnout_label_idx = np.argmax(pred_wellbeing_probs)
    
    # Map index back to label (High=0, Low=1, Medium=2 typically)
    # We'll use the metadata or a hardcoded map since the burnout encoder was separate
    burnout_map = {0: 'High', 1: 'Low', 2: 'Medium'}
    burnout_label = burnout_map.get(burnout_label_idx, 'Unknown')
    
    return round(float(pred_earnings), 2), burnout_label

# --- TEST SUITE: 10 REAL-WORLD SCENARIOS ---
scenarios = [
    {
        "name": "The Exhausted Zomato Driver",
        "data": {
            "gender": "Male", "domain": "Location_Transport_Delivery", "job_type": "Food Delivery",
            "platform": "Zomato", "domain_experience_years": 2, "skill_level": "Low",
            "is_location_based": True, "city": "Bangalore", "temperature_celsius": 24.0,
            "humidity_percentage": 85, "congestion_percent": 110.0, "traffic_level": "heavy",
            "moodLabel": "stressed", "moodScore": -0.8, "hours_today": 11.5,
            "hours_last_3_days": 32.0, "consecutive_days": 12
        }
    },
    {
        "name": "The High-Earning Freelancer",
        "data": {
            "gender": "Female", "domain": "Web_Freelance", "job_type": "Software Development",
            "platform": "Upwork", "domain_experience_years": 8, "skill_level": "High",
            "is_location_based": False, "city": "Hyderabad", "temperature_celsius": 32.0,
            "humidity_percentage": 40, "congestion_percent": 5.0, "traffic_level": "clear",
            "moodLabel": "excited", "moodScore": 0.9, "hours_today": 4.0,
            "hours_last_3_days": 12.0, "consecutive_days": 2
        }
    },
    {
        "name": "The Newbie Micro-tasker (Tired)",
        "data": {
            "gender": "Male", "domain": "Web_Microtasks", "job_type": "Data Entry",
            "platform": "Amazon MTurk", "domain_experience_years": 0, "skill_level": "Low",
            "is_location_based": False, "city": "Delhi", "temperature_celsius": 42.0,
            "humidity_percentage": 20, "congestion_percent": 0.0, "traffic_level": "clear",
            "moodLabel": "tired", "moodScore": -0.3, "hours_today": 9.0,
            "hours_last_3_days": 25.0, "consecutive_days": 5
        }
    },
    {
        "name": "The Mid-Day Salon Worker (Normal)",
        "data": {
            "gender": "Female", "domain": "Location_Personal_Care", "job_type": "Salon at Home",
            "platform": "Urban Company", "domain_experience_years": 4, "skill_level": "Medium",
            "is_location_based": True, "city": "Mumbai", "temperature_celsius": 29.0,
            "humidity_percentage": 70, "congestion_percent": 35.0, "traffic_level": "moderate",
            "moodLabel": "neutral", "moodScore": 0.0, "hours_today": 5.0,
            "hours_last_3_days": 15.0, "consecutive_days": 3
        }
    },
    {
        "name": "The Monsoon Gridlock Rider",
        "data": {
            "gender": "Male", "domain": "Location_Transport_Ride", "job_type": "Auto-Rickshaw",
            "platform": "Namma Yatri", "domain_experience_years": 10, "skill_level": "High",
            "is_location_based": True, "city": "Bangalore", "temperature_celsius": 21.0,
            "humidity_percentage": 95, "congestion_percent": 180.0, "traffic_level": "severe",
            "moodLabel": "frustrated", "moodScore": -0.9, "hours_today": 8.0,
            "hours_last_3_days": 20.0, "consecutive_days": 6
        }
    },
    {
        "name": "The Successful Tutor",
        "data": {
            "gender": "Female", "domain": "Location_Education", "job_type": "Academic Tutoring",
            "platform": "Vedantu", "domain_experience_years": 5, "skill_level": "High",
            "is_location_based": True, "city": "Chennai", "temperature_celsius": 30.0,
            "humidity_percentage": 65, "congestion_percent": 15.0, "traffic_level": "clear",
            "moodLabel": "happy", "moodScore": 0.8, "hours_today": 3.0,
            "hours_last_3_days": 9.0, "consecutive_days": 1
        }
    },
    {
        "name": "The Night Shift Security Pro",
        "data": {
            "gender": "Male", "domain": "Web_Freelance", "job_type": "Cyber-security",
            "platform": "Toptal", "domain_experience_years": 12, "skill_level": "High",
            "is_location_based": False, "city": "Pune", "temperature_celsius": 18.0,
            "humidity_percentage": 30, "congestion_percent": 0.0, "traffic_level": "clear",
            "moodLabel": "neutral", "moodScore": 0.1, "hours_today": 10.0,
            "hours_last_3_days": 30.0, "consecutive_days": 7
        }
    },
    {
        "name": "The Struggling Delivery Newbie",
        "data": {
            "gender": "Male", "domain": "Location_Transport_Delivery", "job_type": "Grocery Delivery",
            "platform": "Zepto", "domain_experience_years": 0, "skill_level": "Low",
            "is_location_based": True, "city": "Delhi", "temperature_celsius": 44.0,
            "humidity_percentage": 15, "congestion_percent": 60.0, "traffic_level": "moderate",
            "moodLabel": "stressed", "moodScore": -0.6, "hours_today": 12.0,
            "hours_last_3_days": 36.0, "consecutive_days": 14
        }
    }
]

print("\n" + "="*80)
print(f"{'SCENARIO NAME':<30} | {'EARNINGS (EST)':<15} | {'BURNOUT RISK':<12}")
print("-" * 80)

for s in scenarios:
    earning, risk = predict_scenario(s['data'])
    print(f"{s['name']:<30} | Rs. {earning:<13} | {risk:<12}")

print("="*80 + "\n")
