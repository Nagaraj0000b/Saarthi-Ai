"""
GigOne Saarthi — Learning Curve Diagnostic Script
=================================================
This script analyzes if the machine learning model is 'overfitting' 
(memorizing noise instead of learning patterns). It plots the error 
rate for both training and testing data over time.

Technical Terms Defined:
-----------------------
- Learning Curve: A graph showing how the model's error changes as it 
  spends more time learning.
- Overfitting: When the model works great on training data but fails 
  on new testing data.
- RMSE (Root Mean Square Error): A mathematical way to calculate how far 
  off the predictions are from the real values.
- Boosting Rounds: The number of times the model tries to improve itself 
  during training.
"""

import pandas as pd
import numpy as np
import os
import xgboost as xgb
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# ══════════════════════════════════════════════════════════════
#                     SETUP & DATA
# ══════════════════════════════════════════════════════════════

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "synthetic_earnings.csv")
OUTPUT_PLOT = os.path.join(BASE_DIR, "models", "learning_curve.png")

def run_diagnostic():
    """
    Trains a model while tracking its progress and saves a 
    learning curve graph.
    """
    data_frame = pd.read_csv(DATA_PATH)

    categorical_columns = ["job", "job_type", "weather", "traffic", "burnout_risk"]
    numerical_columns = ["hour", "day", "temp", "congestion_percent", "is_compatible",
                        "hours_today", "hours_last_3_days", "consecutive_days", "mood_score",
                        "skill_bike", "skill_car", "skill_heavy", "skill_clean", 
                        "skill_trade", "skill_care", "skill_digital", "skill_support"]
    target_column = "target_earning"

    # Convert text to numbers
    for column in categorical_columns:
        le = LabelEncoder()
        data_frame[column] = le.fit_transform(data_frame[column].astype(str))

    feature_names = categorical_columns + numerical_columns
    X = data_frame[feature_names]
    y = data_frame[target_column]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feature_names)
    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=feature_names)

    # Use the same parameters as the main training script
    training_parameters = {
        "objective": "reg:squarederror",
        "eval_metric": "rmse",
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 10,
        "gamma": 1.5,
        "reg_lambda": 2.0,
        "seed": 42,
    }

    evaluations_history = {}

    print("Status: Running Learning Curve analysis...")
    model = xgb.train(
        training_parameters,
        dtrain,
        num_boost_round=500,
        evals=[(dtrain, "train"), (dtest, "test")],
        evals_result=evaluations_history,
        verbose_eval=False
    )

    # Extract progress information
    train_errors = evaluations_history['train']['rmse']
    test_errors = evaluations_history['test']['rmse']
    total_rounds = len(train_errors)
    rounds_axis = range(0, total_rounds)

    # Create the graph
    plt.figure(figsize=(10, 6))
    plt.plot(rounds_axis, train_errors, label='Train Error (RMSE)', color='blue', linewidth=2)
    plt.plot(rounds_axis, test_errors, label='Test Error (RMSE)', color='red', linestyle='--', linewidth=2)
    plt.legend()
    plt.ylabel('Prediction Error (Rs.)')
    plt.xlabel('Number of Boosting Rounds')
    plt.title('XGBoost Learning Curve: Checking for Overfitting')
    plt.grid(True, alpha=0.3)

    # Calculate the gap between training and testing error
    final_gap = test_errors[-1] - train_errors[-1]
    
    plt.savefig(OUTPUT_PLOT, dpi=150)
    print(f"Success: Learning curve graph saved to {OUTPUT_PLOT}")

    print(f"\nDiagnostic Results:")
    print(f"  Final Train Error: Rs. {train_errors[-1]:.2f}")
    print(f"  Final Test Error:  Rs. {test_errors[-1]:.2f}")
    
    relative_gap_percent = (final_gap / train_errors[-1] * 100)
    print(f"  Relative Gap:     {relative_gap_percent:.1f}%")

    if relative_gap_percent > 40:
        print("\nWarning: High Overfitting detected. The model is memorizing noise.")
    elif relative_gap_percent > 20:
        print("\nNote: Moderate Overfitting detected. This is normal for noisy data.")
    else:
        print("\nInfo: Low Overfitting. The model generalizes well to new data.")

if __name__ == "__main__":
    run_diagnostic()
