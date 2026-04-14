import pandas as pd
import numpy as np
import os
import pickle
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report
import xgboost as xgb

# --- Configuration ---
DATA_PATH = 'ml_engine/data/saarthi_main_dataset_50k.csv'
MODEL_DIR = 'ml_engine/models'
os.makedirs(MODEL_DIR, exist_ok=True)

print(f"Loading Master Dataset: {DATA_PATH}...")
df = pd.read_csv(DATA_PATH)

# --- 1. Data Pre-processing ---
# Columns to convert from text to numbers
categorical_cols = [
    'gender', 'domain', 'job_type', 'platform', 
    'primary_skill', 'skill_level', 'city', 
    'weather_condition', 'traffic_level', 'moodLabel'
]

encoders = {}
print("Encoding categorical variables...")
for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le

# Save encoders for use in the real app
with open(os.path.join(MODEL_DIR, 'saarthi_encoders.pkl'), 'wb') as f:
    pickle.dump(encoders, f)

# Define Features (What the AI looks at)
feature_cols = [
    'gender', 'domain', 'job_type', 'platform', 'domain_experience_years',
    'skill_level', 'is_location_based', 'city', 'temperature_celsius',
    'humidity_percentage', 'congestion_percent', 'traffic_level',
    'moodLabel', 'moodScore', 'hours_today', 'hours_last_3_days', 'consecutive_days'
]

X = df[feature_cols]

# --- 2. Train EARNINGS Prediction Model (Regression) ---
print("\n--- Training Earnings Prediction Model (XGBoost Regressor) ---")
y_earnings = df['target_earning']
X_train_e, X_test_e, y_train_e, y_test_e = train_test_split(X, y_earnings, test_size=0.2, random_state=42)

model_earnings = xgb.XGBRegressor(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    objective='reg:squarederror',
    random_state=42
)

model_earnings.fit(X_train_e, y_train_e)
y_pred_e = model_earnings.predict(X_test_e)

r2 = r2_score(y_test_e, y_pred_e)
rmse = np.sqrt(mean_squared_error(y_test_e, y_pred_e))

print(f"Earnings Model Accuracy (R2 Score): {r2:.4f}")
print(f"Earnings Model Error (RMSE): Rs. {rmse:.2f}")

# Save Earnings Model
model_earnings.save_model(os.path.join(MODEL_DIR, 'saarthi_earnings_model.json'))

# --- 3. Train BURNOUT RISK Model (Classification) ---
print("\n--- Training Burnout Risk Model (XGBoost Classifier) ---")
# Encode the target burnout labels
le_burnout = LabelEncoder()
y_burnout = le_burnout.fit_transform(df['burnout_risk'])
encoders['burnout_risk'] = le_burnout

X_train_b, X_test_b, y_train_b, y_test_b = train_test_split(X, y_burnout, test_size=0.2, random_state=42)

model_burnout = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.1,
    objective='multi:softprob',
    num_class=3,
    random_state=42
)

model_burnout.fit(X_train_b, y_train_b)
y_pred_b = model_burnout.predict(X_test_b)

accuracy = accuracy_score(y_test_b, y_pred_b)
print(f"Burnout Model Accuracy: {accuracy:.4f}")
print("Classification Report:")
print(classification_report(y_test_b, y_pred_b, target_names=le_burnout.classes_))

# Save Burnout Model
model_burnout.save_model(os.path.join(MODEL_DIR, 'saarthi_wellbeing_model.json'))

# --- 4. Final Metadata Export ---
metadata = {
    "dataset_size": len(df),
    "features_used": feature_cols,
    "earnings_metrics": {"r2": round(r2, 4), "rmse": round(float(rmse), 2)},
    "burnout_metrics": {"accuracy": round(accuracy, 4)}
}

with open(os.path.join(MODEL_DIR, 'saarthi_model_metadata.json'), 'w') as f:
    json.dump(metadata, f, indent=2)

print("\n✅ ML TRAINING COMPLETE. All models and encoders saved to ml_engine/models/")
