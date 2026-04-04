"""
Saarthi — Machine Learning Inference API
==============================================
This script provides a web service (API) that allows other parts of 
the application to request earning predictions from the 
trained machine learning model.

Technical Terms Defined:
-----------------------
- API (Application Programming Interface): A way for different computer 
  programs to talk to each other.
- Endpoint: A specific web address (like /recommend) where the API 
  receives requests.
- FastAPI: A modern, fast tool used to build web APIs with Python.
- Pydantic: A tool used to define the structure of data (schemas) 
  coming into or going out of the API.
- Uvicorn: A lightning-fast server that runs the FastAPI application.
- JSON (JavaScript Object Notation): A simple text format for storing 
  and transporting data.
- Inference: Using a trained model to make a prediction for a new request.
- Schema: A blueprint or template that defines the structure of data.
"""

from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import xgboost as xgb
import pandas as pd
import pickle
import json
import os
import uvicorn

# ══════════════════════════════════════════════════════════════
#                       CONFIG & LOADING
# ══════════════════════════════════════════════════════════════

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "models")

MODEL_PATH = os.path.join(MODEL_DIR, "gigone_xgb_model.json")
ENCODERS_PATH = os.path.join(MODEL_DIR, "label_encoders.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

# Initialize the web application
app = FastAPI(title="GigOne Saarthi ML Engine", version="1.0.0")

# Global variables to store the loaded model artifacts
model = None
encoders = None
metadata = None

from voice_chat_v2.graph import create_graph

# Initialize LangGraph app
graph_app = create_graph()

@app.on_event("startup")
def load_artifacts():
    """
    Runs automatically when the API starts. Loads the trained model, 
    categorical encoders, and metadata from the disk.
    
    Inputs: None
    Outputs: None (sets global variables)
    """
    global model, encoders, metadata
    try:
        # Load the binary XGBoost model file
        model = xgb.Booster()
        model.load_model(MODEL_PATH)
        
        # Load the mapping tools (encoders) used for text categories
        with open(ENCODERS_PATH, "rb") as f:
            encoders = pickle.load(f)
            
        # Load information about feature names and accuracy metrics
        with open(METADATA_PATH, "r") as f:
            metadata = json.load(f)
            
        print("Status: ML Artifacts loaded successfully")
    except Exception as error_message:
        print(f"Error loading artifacts: {error_message}")
        raise RuntimeError(f"Could not load ML models: {error_message}")

# ══════════════════════════════════════════════════════════════
#                       DATA MODELS (SCHEMAS)
# ══════════════════════════════════════════════════════════════

class UserContext(BaseModel):
    """
    Template defining the information required about a user to 
    make a prediction.
    """
    hour: int
    day: int
    weather: str
    temp: float
    traffic: str
    congestion_percent: int
    registered_jobs: List[str] = []
    skill_bike: int = 0
    skill_car: int = 0
    skill_heavy: int = 0
    skill_clean: int = 0
    skill_trade: int = 0
    skill_care: int = 0
    skill_digital: int = 0
    skill_support: int = 0
    hours_today: float
    hours_last_3_days: float
    consecutive_days: int
    mood_score: float
    burnout_risk: str

class Recommendation(BaseModel):
    """
    Template defining the prediction result sent back to the user.
    """
    job: str
    job_type: str
    predicted_earning: float
    is_compatible: bool

# ══════════════════════════════════════════════════════════════
#                       SERVICE LOGIC
# ══════════════════════════════════════════════════════════════

# Mapping specific jobs to their broader categories
JOB_TO_TYPE = {
    "Uber": "Ride hailing drivers (cab+ bike)",
    "Ola": "Ride hailing drivers (cab+ bike)",
    "BluSmart": "Ride hailing drivers (cab+ bike)",
    "Namma Yatri": "Ride hailing drivers (cab+ bike)",
    "InDriver": "Ride hailing drivers (cab+ bike)",
    "Rapido": "Ride hailing drivers (cab+ bike)",
    "Swiggy": "Ride hailing instant delivery",
    "Zomato": "Ride hailing instant delivery",
    "Blinkit": "Ride hailing instant delivery",
    "Zepto": "Ride hailing instant delivery",
    "Amazon Flex": "Delivery workers in General",
    "Delhivery": "Delivery workers in General",
    "BlueDart": "Delivery workers in General",
    "Dunzo": "Delivery workers in General",
    "BigBasket": "Delivery workers in General",
    "JioMart": "Delivery workers in General",
    "Urban Company": "On Demand home based services",
    "Local Plumber": "On Demand home based services",
    "Local Electrician": "On Demand home based services",
    "Home Cleaning Co": "On Demand home based services",
    "Elderly Care": "On Demand home based services",
    "Pet Walker": "On Demand home based services",
    "DataEntry Inc": "Remote service providers",
    "SupportHero": "Remote service providers",
    "Virtual Assistant Hub": "Remote service providers",
    "Translation Pro": "Remote service providers",
}

# Mapping jobs to the skills required to perform them
COMPATIBILITY = {
    "Uber":         ["skill_car", "skill_bike"],
    "Ola":          ["skill_car", "skill_bike"],
    "BluSmart":     ["skill_car"],
    "Namma Yatri":  ["skill_car", "skill_bike"],
    "InDriver":     ["skill_car", "skill_bike"],
    "Rapido":       ["skill_bike"],
    "Swiggy":       ["skill_bike"],
    "Zomato":       ["skill_bike"],
    "Blinkit":      ["skill_bike"],
    "Zepto":        ["skill_bike"],
    "BigBasket":    ["skill_bike", "skill_heavy"],
    "JioMart":      ["skill_bike", "skill_heavy"],
    "Amazon Flex":  ["skill_bike", "skill_car", "skill_heavy"],
    "Delhivery":    ["skill_bike", "skill_heavy"],
    "BlueDart":     ["skill_bike", "skill_heavy"],
    "Dunzo":        ["skill_bike"],
    "Urban Company":   ["skill_clean", "skill_trade", "skill_care"],
    "Local Plumber":   ["skill_trade"],
    "Local Electrician":["skill_trade"],
    "Home Cleaning Co":["skill_clean"],
    "Elderly Care":   ["skill_care"],
    "Pet Walker":     ["skill_care"],
    "DataEntry Inc":         ["skill_digital"],
    "SupportHero":           ["skill_support"],
    "Virtual Assistant Hub": ["skill_digital", "skill_support"],
    "Translation Pro":       ["skill_digital", "skill_support"],
}

def predict_for_job(job_name: str, context: UserContext) -> Recommendation:
    """
    Calculates a single earning prediction for a specific job name.
    
    Inputs:
    - job_name (string): Name of the job platform.
    - context (UserContext): Current environment and user state.
    
    Outputs:
    - recommendation (Recommendation): The prediction result.
    """
    job_type = JOB_TO_TYPE.get(job_name, "Other")
    
    user_skills = {
        "skill_bike": context.skill_bike,
        "skill_car": context.skill_car,
        "skill_heavy": context.skill_heavy,
        "skill_clean": context.skill_clean,
        "skill_trade": context.skill_trade,
        "skill_care": context.skill_care,
        "skill_digital": context.skill_digital,
        "skill_support": context.skill_support
    }
    
    # Check if the user has the required skills for this job
    required_skills_list = COMPATIBILITY.get(job_name, [])
    is_compatible = any(user_skills[skill] == 1 for skill in required_skills_list)
    
    # Organize the data into the exact order the model expects
    input_data = {
        "job": encoders["job"].transform([job_name])[0],
        "job_type": encoders["job_type"].transform([job_type])[0],
        "weather": encoders["weather"].transform([context.weather])[0],
        "traffic": encoders["traffic"].transform([context.traffic.lower()])[0],
        "burnout_risk": encoders["burnout_risk"].transform([context.burnout_risk.lower()])[0],
        "hour": context.hour,
        "day": context.day,
        "temp": context.temp,
        "congestion_percent": context.congestion_percent,
        "is_compatible": 1 if is_compatible else 0,
        "hours_today": context.hours_today,
        "hours_last_3_days": context.hours_last_3_days,
        "consecutive_days": context.consecutive_days,
        "mood_score": context.mood_score
    }
    # Append the skills as numbers
    input_data.update(user_skills)
    
    # Create a simple table (DataFrame) for the prediction
    data_frame = pd.DataFrame([input_data])
    ordered_data_frame = data_frame[metadata["feature_columns"]]
    
    # Use the XGBoost tool to make the prediction
    prediction_matrix = xgb.DMatrix(ordered_data_frame)
    predicted_values = model.predict(prediction_matrix)
    
    return Recommendation(
        job=job_name,
        job_type=job_type,
        predicted_earning=float(predicted_values[0]),
        is_compatible=is_compatible
    )

# ══════════════════════════════════════════════════════════════
#                       ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    """
    Simple check to see if the API is running correctly.
    
    Inputs: None
    Outputs: Status message and model accuracy score.
    """
    return {"status": "healthy", "model_accuracy": metadata["metrics"]["r2"]}

@app.post("/recommend", response_model=List[Recommendation])
def get_recommendations(context: UserContext):
    """
    Receives user context and returns a list of job recommendations.
    
    The list is filtered to only include:
    1. Jobs that the user is registered for (if provided).
    2. Jobs that are compatible with the user's skills.
    
    The results are sorted by predicted earnings in descending order.
    
    Inputs:
    - context (UserContext): The current situation and user profile.
    
    Outputs:
    - recommendations (List): A list of potential jobs and their predicted earnings.
    """
    try:
        recommendation_results = []
        
        # Determine which jobs to consider
        target_jobs = context.registered_jobs if context.registered_jobs else list(JOB_TO_TYPE.keys())
        
        for job_platform in target_jobs:
            if job_platform not in JOB_TO_TYPE:
                continue
                
            result = predict_for_job(job_platform, context)
            
            # Only include compatible jobs
            if result.is_compatible:
                recommendation_results.append(result)
            
        # Sort the results so the highest earnings are at the top
        recommendation_results.sort(key=lambda x: x.predicted_earning, reverse=True)
        return recommendation_results
    except Exception as error_message:
        raise HTTPException(status_code=500, detail=str(error_message))

@app.post("/chat/turn")
def process_chat_turn(payload: Dict[str, Any] = Body(...)):
    """
    Processes a single turn of the LangGraph voice chatbot.
    Receives the current state and returns the new state.
    """
    try:
        new_state = graph_app.invoke(payload)
        return new_state
    except Exception as error_message:
        raise HTTPException(status_code=500, detail=str(error_message))

if __name__ == "__main__":
    # Start the web server
    uvicorn.run(app, host="0.0.0.0", port=8000)
