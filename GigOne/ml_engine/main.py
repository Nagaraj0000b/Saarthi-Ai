from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import xgboost as xgb
import pandas as pd
import numpy as np
import pickle
import json
import os
import uvicorn

# ══════════════════════════════════════════════════════════════
#                       CONFIG & LOADING
# ══════════════════════════════════════════════════════════════

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "models")

# NEW MODELS
MODEL_PATH = os.path.join(MODEL_DIR, "saarthi_earnings_model.json")
BURNOUT_MODEL_PATH = os.path.join(MODEL_DIR, "saarthi_wellbeing_model.json")
ENCODERS_PATH = os.path.join(MODEL_DIR, "saarthi_encoders.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "saarthi_model_metadata.json")

# Initialize the web application
app = FastAPI(title="GigOne Saarthi ML Engine", version="2.0.0")

model_earnings = None
model_burnout = None
encoders = None
metadata = None

from voice_chat_v2.graph import create_graph
graph_app = create_graph()

@app.on_event("startup")
def load_artifacts():
    global model_earnings, model_burnout, encoders, metadata
    try:
        model_earnings = xgb.Booster()
        model_earnings.load_model(MODEL_PATH)
        
        model_burnout = xgb.Booster()
        model_burnout.load_model(BURNOUT_MODEL_PATH)
        
        with open(ENCODERS_PATH, "rb") as f:
            encoders = pickle.load(f)
            
        with open(METADATA_PATH, "r") as f:
            metadata = json.load(f)
            
        print("Status: ML Artifacts loaded successfully")
    except Exception as error_message:
        print(f"Error loading artifacts: {error_message}")
        raise RuntimeError(f"Could not load ML models: {error_message}")

# ══════════════════════════════════════════════════════════════
#                       DATA MODELS (SCHEMAS)
# ══════════════════════════════════════════════════════════════

class JobInfo(BaseModel):
    platform: str
    job_type: str
    domain: str

class SkillInfo(BaseModel):
    name: str
    experience: int
    level: str

class UserContext(BaseModel):
    gender: str = "Male"
    city: str = "Bangalore"
    temperature_celsius: float = 25.0
    humidity_percentage: float = 50.0
    congestion_percent: float = 0.0
    traffic_level: str = "clear"
    moodLabel: str = "neutral"
    moodScore: float = 0.0
    hours_today: float = 0.0
    hours_last_3_days: float = 0.0
    consecutive_days: int = 0
    registered_jobs: List[JobInfo] = []
    skills: List[SkillInfo] = []

class Recommendation(BaseModel):
    job: str
    job_type: str
    predicted_earning: float
    is_compatible: bool

class BurnoutPrediction(BaseModel):
    burnout_risk_level: str
    confidence_score: float

# ══════════════════════════════════════════════════════════════
#                       SERVICE LOGIC
# ══════════════════════════════════════════════════════════════

def encode_safe(col_name, val):
    le = encoders[col_name]
    val_str = str(val)
    if val_str in le.classes_:
        return le.transform([val_str])[0]
    return le.transform([le.classes_[0]])[0]

def build_input_data(job_info: JobInfo, context: UserContext):
    primary_skill = context.skills[0].name if context.skills else "Navigation"
    skill_level = context.skills[0].level if context.skills else "Low"
    exp_years = context.skills[0].experience if context.skills else 0
    
    return {
        "gender": encode_safe("gender", context.gender),
        "domain": encode_safe("domain", job_info.domain if job_info.domain else "Location_Transport_Delivery"),
        "job_type": encode_safe("job_type", job_info.job_type),
        "platform": encode_safe("platform", job_info.platform),
        "domain_experience_years": exp_years,
        "skill_level": encode_safe("skill_level", skill_level),
        "is_location_based": 1 if "Location" in str(job_info.domain) else 0,
        "city": encode_safe("city", context.city),
        "temperature_celsius": context.temperature_celsius,
        "humidity_percentage": context.humidity_percentage,
        "congestion_percent": context.congestion_percent,
        "traffic_level": encode_safe("traffic_level", context.traffic_level),
        "moodLabel": encode_safe("moodLabel", context.moodLabel),
        "moodScore": context.moodScore,
        "hours_today": context.hours_today,
        "hours_last_3_days": context.hours_last_3_days,
        "consecutive_days": context.consecutive_days
    }

def predict_for_job(job_info: JobInfo, context: UserContext) -> Recommendation:
    input_data = build_input_data(job_info, context)
    
    data_frame = pd.DataFrame([input_data])
    ordered_data_frame = data_frame[metadata["features_used"]]
    
    prediction_matrix = xgb.DMatrix(ordered_data_frame)
    predicted_values = model_earnings.predict(prediction_matrix)
    
    return Recommendation(
        job=job_info.platform,
        job_type=job_info.job_type,
        predicted_earning=float(predicted_values[0]),
        is_compatible=True
    )

@app.get("/health")
def health():
    return {"status": "healthy", "model_accuracy": metadata["earnings_metrics"]["r2"]}

@app.post("/recommend", response_model=List[Recommendation])
def get_recommendations(context: UserContext):
    try:
        recommendation_results = []
        
        if not context.registered_jobs:
             return []
             
        for job_info in context.registered_jobs:
            result = predict_for_job(job_info, context)
            recommendation_results.append(result)
            
        recommendation_results.sort(key=lambda x: x.predicted_earning, reverse=True)
        return recommendation_results
    except Exception as error_message:
        print("ML ENGINE ERROR:", str(error_message))
        raise HTTPException(status_code=500, detail=str(error_message))

@app.post("/burnout", response_model=BurnoutPrediction)
def get_burnout_risk(context: UserContext):
    try:
        if not context.registered_jobs:
            # Fallback if no jobs registered
            job_info = JobInfo(platform="Other", job_type="Other", domain="Location_Transport_Delivery")
        else:
            job_info = context.registered_jobs[0]

        input_data = build_input_data(job_info, context)
        data_frame = pd.DataFrame([input_data])
        ordered_data_frame = data_frame[metadata["features_used"]]
        
        prediction_matrix = xgb.DMatrix(ordered_data_frame)
        pred_probs = model_burnout.predict(prediction_matrix)[0]
        
        burnout_label_idx = int(np.argmax(pred_probs))

        # Use the loaded burnout LabelEncoder to retrieve the class name
        le_burnout = encoders.get('burnout_risk')
        if le_burnout:
            burnout_label = le_burnout.classes_[burnout_label_idx]
        else:
            # Fallback if encoder is missing, though it should be in saarthi_encoders.pkl
            burnout_map = {0: 'High', 1: 'Low', 2: 'Medium'}
            burnout_label = burnout_map.get(burnout_label_idx, "Unknown")

        confidence = float(pred_probs[burnout_label_idx])
        
        return BurnoutPrediction(
            burnout_risk_level=burnout_label,
            confidence_score=confidence
        )
    except Exception as error_message:
        print("ML ENGINE BURNOUT ERROR:", str(error_message))
        raise HTTPException(status_code=500, detail=str(error_message))

@app.post("/chat/turn")
def process_chat_turn(payload: Dict[str, Any] = Body(...)):
    try:
        state_payload = dict(payload)
        legacy_data = state_payload.get("extracted_data") or state_payload.get("extractedData") or {}

        def pick_first(*values):
            for value in values:
                if value is not None and value != "":
                    return value
            return None

        state_payload["selected_platform"] = pick_first(
            state_payload.get("selected_platform"),
            legacy_data.get("selected_platform"),
            legacy_data.get("platform"),
            legacy_data.get("job"),
        )
        state_payload["expected_earnings"] = pick_first(
            state_payload.get("expected_earnings"),
            legacy_data.get("expected_earnings"),
            legacy_data.get("earnings"),
            legacy_data.get("amount"),
        )
        state_payload["hours_worked"] = pick_first(
            state_payload.get("hours_worked"),
            legacy_data.get("hours_worked"),
            legacy_data.get("hours"),
        )

        new_state = graph_app.invoke(state_payload)
        return new_state
    except Exception as error_message:
        raise HTTPException(status_code=500, detail=str(error_message))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)