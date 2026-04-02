# Phase 02 Context: ML Model Retraining

## Objective
Retrain the XGBoost model using the balanced, 50,000-row dataset generated in Phase 1. The goal is to ensure the model accurately predicts earnings while strictly adhering to the new environmental decoupling rules for remote jobs.

## Success Criteria
1. **Accurate Predictions**: R² score > 0.90 on the new dataset.
2. **Environmental Decoupling**: SHAP values for `weather` and `traffic` must be zero (or near-zero) for "Remote service providers".
3. **Seamless Integration**: The newly trained model and label encoders are exported and ready for the inference API.

## Requirements
- ML-01: XGBoost model trained on unbiased 50k dataset.
- ML-02: Model serves predictions for 5 job categories.
- ML-03: Zero environment impact for remote jobs confirmed via explainability artifacts.

## Key Files
- `ml_engine/data/synthetic_earnings.csv`: Input dataset.
- `ml_engine/train_model.py`: Training script.
- `ml_engine/models/gigone_xgb_model.json`: Exported model.
- `ml_engine/models/label_encoders.pkl`: Categorical encoders.
- `ml_engine/models/model_metadata.json`: Model metrics and feature order.
- `ml_engine/models/shap_summary.png`: Explainability confirmation.
