"""
GigOne Saarthi — Machine Learning Model Training Script
=====================================================
This script trains a computer model to predict how much a gig worker 
will earn. It uses a historical dataset to learn patterns.

Technical Terms Defined:
-----------------------
- Machine Learning Model: A mathematical formula that can make predictions 
  after being shown many examples.
- Training: The process of teaching a model by showing it data.
- Features: The input information used for prediction (like weather, 
  traffic, or skills).
- Target: The specific value the model is trying to predict (Earnings).
- Label Encoding: Converting text categories (like 'Clear' weather) into 
  numbers (like 0, 1, 2) that the model can understand.
- Data Splitting: Dividing the data into two groups: one for training the 
  model and one for testing how well it works on new data.
- Overfitting: A common problem where a model learns the training data too 
  well (including random noise) and fails to make good predictions on new data.
- Regularization: Techniques used during training to prevent overfitting 
  and help the model generalize better.
- RMSE (Root Mean Square Error): A way to measure prediction error. Smaller 
  is better.
- MAE (Mean Absolute Error): The average difference between predicted and 
  actual earnings. Smaller is better.
- R² Score: A number representing how much of the variation in earnings 
  is explained by the model (Goal is > 0.90).
- SHAP: A tool used to explain which features were most important for a 
  prediction.
"""

import pandas as pd
import numpy as np
import os
import pickle
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import xgboost as xgb

# ══════════════════════════════════════════════════════════════
#                     CONFIGURATION
# ══════════════════════════════════════════════════════════════

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "synthetic_earnings.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")

MODEL_OUTPUT = os.path.join(MODEL_DIR, "gigone_xgb_model.json")
ENCODERS_OUTPUT = os.path.join(MODEL_DIR, "label_encoders.pkl")
METADATA_OUTPUT = os.path.join(MODEL_DIR, "model_metadata.json")
SHAP_OUTPUT = os.path.join(MODEL_DIR, "shap_summary.png")

def load_and_prepare_data(file_path):
    """
    Loads the dataset from a CSV file and prepares it for training.
    
    Inputs:
    - file_path (string): The location of the CSV data file.
    
    Outputs:
    - data_frame (pandas.DataFrame): The loaded and processed data.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Data file not found at {file_path}")
        
    data_frame = pd.read_csv(file_path)
    print(f"Success: Loaded dataset with {data_frame.shape[0]} rows")
    return data_frame

def encode_categories(data_frame, categorical_columns):
    """
    Converts text categories into numbers so the model can process them.
    
    Inputs:
    - data_frame (pandas.DataFrame): The raw dataset.
    - categorical_columns (list): Names of columns containing text categories.
    
    Outputs:
    - data_frame (pandas.DataFrame): The dataset with numbers instead of text.
    - encoders (dictionary): The mapping tools used for conversion.
    """
    encoders = {}
    for column in categorical_columns:
        le = LabelEncoder()
        data_frame[column] = le.fit_transform(data_frame[column].astype(str))
        encoders[column] = le
        print(f"Encoded '{column}': {len(le.classes_)} unique categories found")
    return data_frame, encoders

def train_prediction_model(x_train, y_train, x_test, y_test, feature_names):
    """
    Uses the training data to build an XGBoost model.
    
    Inputs:
    - x_train, y_train: The data used for learning.
    - x_test, y_test: The data used for checking the model's accuracy.
    - feature_names (list): The list of input information names.
    
    Outputs:
    - model (xgboost.Booster): The trained prediction model.
    """
    dtrain = xgb.DMatrix(x_train, label=y_train, feature_names=feature_names)
    dtest = xgb.DMatrix(x_test, label=y_test, feature_names=feature_names)

    # These settings control how the model learns and prevent it from memorizing noise
    training_parameters = {
        "objective": "reg:squarederror",
        "eval_metric": "rmse",
        "max_depth": 6,          # Controls how complex the 'decision tree' can get
        "learning_rate": 0.05,   # How quickly the model updates its knowledge
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 10,
        "gamma": 1.5,            # Penalizes complex models to prevent overfitting
        "reg_alpha": 0.1,
        "reg_lambda": 2.0,       # Mathematical penalty for overly complex models
        "seed": 42,
    }

    print("Status: Training the XGBoost model...")
    model = xgb.train(
        training_parameters,
        dtrain,
        num_boost_round=500,
        evals=[(dtrain, "train"), (dtest, "test")],
        early_stopping_rounds=30,
        verbose_eval=50,
    )
    return model

def evaluate_and_save(model, x_test, y_test, encoders, feature_names):
    """
    Calculates accuracy metrics and saves the model to the disk.
    
    Inputs:
    - model: The trained model.
    - x_test, y_test: Data used for testing.
    - encoders: Categorical mapping tools.
    - feature_names: Names of input columns.
    
    Outputs: None (saves files to the models directory)
    """
    dtest = xgb.DMatrix(x_test, feature_names=feature_names)
    y_predictions = model.predict(dtest)

    # Calculate standard accuracy metrics
    rmse_value = np.sqrt(mean_squared_error(y_test, y_predictions))
    mae_value = mean_absolute_error(y_test, y_predictions)
    r2_value = r2_score(y_test, y_predictions)

    print("\n--------------------------------------------------")
    print("  MODEL EVALUATION RESULTS")
    print("--------------------------------------------------")
    print(f"  Error (RMSE):  Rs. {rmse_value:.2f}")
    print(f"  Average Error: Rs. {mae_value:.2f}")
    print(f"  Accuracy (R2): {r2_value:.4f}")
    print("--------------------------------------------------")

    # Save everything needed for later use
    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save_model(MODEL_OUTPUT)
    
    with open(ENCODERS_OUTPUT, "wb") as f:
        pickle.dump(encoders, f)
        
    metadata = {
        "feature_columns": feature_names,
        "metrics": {"rmse": round(rmse_value, 4), "r2": round(r2_value, 4)},
        "best_iteration": model.best_iteration,
    }
    with open(METADATA_OUTPUT, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Success: Model artifacts saved to {MODEL_DIR}")

def main():
    """
    The main workflow for training the model.
    """
    df = load_and_prepare_data(DATA_PATH)

    categorical_columns = ["job", "job_type", "weather", "traffic", "burnout_risk"]
    numerical_columns = ["hour", "day", "temp", "congestion_percent", "is_compatible",
                        "hours_today", "hours_last_3_days", "consecutive_days", "mood_score",
                        "skill_bike", "skill_car", "skill_heavy", "skill_clean", 
                        "skill_trade", "skill_care", "skill_digital", "skill_support"]
    target_column = "target_earning"

    df, encoders = encode_categories(df, categorical_columns)

    feature_names = categorical_columns + numerical_columns
    X = df[feature_names]
    Y = df[target_column]

    X_train, X_test, Y_train, Y_test = train_test_split(
        X, Y, test_size=0.2, random_state=42
    )

    trained_model = train_prediction_model(X_train, Y_train, X_test, Y_test, feature_names)
    evaluate_and_save(trained_model, X_test, Y_test, encoders, feature_names)

if __name__ == "__main__":
    main()
