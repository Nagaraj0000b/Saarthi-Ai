import xgboost as xgb
import pandas as pd
import pickle
import json
import os

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "models")

MODEL_PATH = os.path.join(MODEL_DIR, "gigone_xgb_model.json")
ENCODERS_PATH = os.path.join(MODEL_DIR, "label_encoders.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

# Load Models
model = xgb.Booster()
model.load_model(MODEL_PATH)

with open(ENCODERS_PATH, "rb") as f:
    encoders = pickle.load(f)
    
with open(METADATA_PATH, "r") as f:
    metadata = json.load(f)

JOB_TO_TYPE = {
    "Uber": "Cab Taxi", "Ola": "Cab Taxi", "BluSmart": "Cab Taxi", 
    "Namma Yatri": "Cab Taxi", "InDriver": "Cab Taxi",
    "Rapido": "Bike Taxi",
    "Swiggy": "Food Delivery", "Zomato": "Food Delivery",
    "Blinkit": "Quick Commerce", "Zepto": "Quick Commerce", 
    "BigBasket": "Quick Commerce", "JioMart": "Quick Commerce",
    "Amazon Flex": "Logistics", "Delhivery": "Logistics", "BlueDart": "Logistics",
    "Dunzo": "Hyperlocal",
    "Other": "Other"
}

# Assume a driver has a Cab (SUV) AND a Bike registered, so all jobs are compatible.
USER_VEHICLES = {"Uber": "Cab (SUV)", "Swiggy": "Bike", "Rapido": "Bike", "Amazon Flex": "Mini Truck", "Blinkit": "Bike"}

def resolve_vehicle(job):
    # Match the correct vehicle to the job to ensure compliance
    if job in ["Uber", "Ola", "BluSmart", "InDriver", "Namma Yatri"]: return "Cab (SUV)"
    if job in ["Amazon Flex", "BlueDart"]: return "Mini Truck"
    return "Bike"

scenarios = [
    {"name": "🌧️ Rain + 🔴 High Traffic", "weather": "Rain", "traffic": "heavy", "congestion": 85},
    {"name": "🌧️ Rain + 🟢 Low Traffic", "weather": "Rain", "traffic": "clear", "congestion": 20},
    {"name": "🔥 Heat Wave + 🟢 Low Traffic", "weather": "Extreme Heat", "traffic": "clear", "congestion": 15},
    {"name": "🔥 Heat Wave + 🔴 High Traffic", "weather": "Extreme Heat", "traffic": "heavy", "congestion": 80},
    {"name": "☁️ Normal Weather + 🟡 Normal Traffic", "weather": "Clear", "traffic": "moderate", "congestion": 50},
    {"name": "☁️ Normal Weather + 🟢 Low Traffic", "weather": "Clear", "traffic": "clear", "congestion": 10},
]

# Baseline context
base_context = {
    "hour": 14, "day": 2, "temp": 30.0, "burnout_risk": "low",
    "hours_today": 2.0, "hours_last_3_days": 12.0, "consecutive_days": 2, "mood_score": 0.8
}

report_lines = ["# ML Recommendation Scenarios Analysis\n"]
report_lines.append("Testing simulated predictions across edge cases assuming a driver with a **Cab** and a **Bike**.\n")

for scenario in scenarios:
    report_lines.append(f"## {scenario['name']}")
    report_lines.append(f"**Conditions**: Weather=`{scenario['weather']}`, Traffic=`{scenario['traffic']}` ({scenario['congestion']}% congestion)\n")
    report_lines.append("| Job Platform | Job Type | Assigned Vehicle | Predicted Earnings (₹/hr) |")
    report_lines.append("|---|---|---|---|")
    
    results = []
    
    for job, job_type in JOB_TO_TYPE.items():
        if job == "Other": continue
        
        vehicle = resolve_vehicle(job)
        
        data = {
            "job": encoders["job"].transform([job])[0],
            "job_type": encoders["job_type"].transform([job_type])[0],
            "weather": encoders["weather"].transform([scenario['weather']])[0] if scenario['weather'] in encoders['weather'].classes_ else encoders['weather'].transform(['Clear'])[0],
            "traffic": encoders["traffic"].transform([scenario['traffic']])[0],
            "vehicle": encoders["vehicle"].transform([vehicle])[0],
            "burnout_risk": encoders["burnout_risk"].transform([base_context['burnout_risk']])[0],
            "hour": base_context['hour'],
            "day": base_context['day'],
            "temp": base_context['temp'] if scenario['weather'] != "Extreme Heat" else 42.0,
            "congestion_percent": scenario['congestion'],
            "is_compatible": 1,
            "hours_today": base_context["hours_today"],
            "hours_last_3_days": base_context["hours_last_3_days"],
            "consecutive_days": base_context["consecutive_days"],
            "mood_score": base_context["mood_score"]
        }
        
        df = pd.DataFrame([data])
        ordered_df = df[metadata["feature_columns"]]
        dmatrix = xgb.DMatrix(ordered_df)
        pred = model.predict(dmatrix)[0]
        results.append((job, job_type, vehicle, pred))
        
    results.sort(key=lambda x: x[3], reverse=True)
    
    for job, job_type, vehicle, pred in results:
        report_lines.append(f"| **{job}** | {job_type} | {vehicle} | ₹{pred:.1f}/hr |")
        
    report_lines.append("\n")

out_file = "C:\\Users\\nagar\\.gemini\\antigravity\\brain\\082dade9-8afe-4e79-a610-737d0cf76b4d\\analysis_results.md"
with open(out_file, "w", encoding="utf-8") as f:
    f.write("\n".join(report_lines))
    
print(f"Scenarios generated successfully: {out_file}")
