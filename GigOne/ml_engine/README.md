# GigOne Saarthi — ML Recommendation Engine

> An XGBoost-powered job recommendation system for Indian gig economy workers.
> Predicts expected hourly earnings (₹/hr) for 26 platforms across 5 job categories.

---

## 📊 Model Performance

| Metric | Value | Meaning |
|--------|-------|---------|
| **R²** | 0.9359 | Model explains 93.6% of earning variance |
| **RMSE** | ₹20.64 | Average prediction error |
| **MAE** | ₹12.08 | Typical deviation from actual earnings |
| **Best Iteration** | 212 / 500 | Early stopping prevented overfitting |

---

## 🏗️ Architecture

```
ml_engine/
├── data/
│   └── synthetic_earnings.csv    # 50,000 training rows
├── models/
│   ├── gigone_xgb_model.json     # Trained XGBoost model (~4.1 MB)
│   ├── label_encoders.pkl        # Categorical encoding map
│   ├── model_metadata.json       # Feature order + metrics
│   └── shap_summary.png         # SHAP feature importance plot
├── generate_dataset.py           # Dataset generator (Phase 1)
├── train_model.py                # Training script (Phase 2)
├── main.py                       # FastAPI inference server (Phase 3)
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r ml_engine/requirements.txt
```

### 2. Generate Dataset (Optional — already generated)
```bash
python ml_engine/generate_dataset.py
```

### 3. Train Model (Optional — already trained)
```bash
python ml_engine/train_model.py
```

### 4. Start Inference Server
```bash
python ml_engine/main.py
```
Server starts at `http://localhost:8000`

---

## 📡 API Endpoints

### `GET /health`
Health check for the ML server.

**Response:**
```json
{
  "status": "healthy",
  "model_r2": 0.9359
}
```

### `POST /recommend`
Returns ranked job recommendations based on current context.

**Request Body:**
```json
{
  "hour": 13,
  "day": 2,
  "weather": "Rain",
  "temp": 28.5,
  "traffic": "heavy",
  "congestion_percent": 65,
  "registered_jobs": ["Swiggy", "Zomato", "Uber"],
  "skill_bike": 1,
  "skill_car": 0,
  "skill_heavy": 0,
  "skill_clean": 0,
  "skill_trade": 0,
  "skill_care": 0,
  "skill_digital": 0,
  "skill_support": 0,
  "hours_today": 3.5,
  "hours_last_3_days": 12.0,
  "consecutive_days": 4,
  "mood_score": 0.2,
  "burnout_risk": "low"
}
```

**Response:**
```json
[
  {
    "job": "Swiggy",
    "job_type": "Food Delivery",
    "predicted_earning": 245.80,
    "is_compatible": true
  },
  {
    "job": "Zomato",
    "job_type": "Food Delivery",
    "predicted_earning": 238.12,
    "is_compatible": true
  }
]
```

---

## 🧬 Features (22 Input Columns)

### Categorical (5)
| Feature | Values | Description |
|---------|--------|-------------|
| `job` | 26 platforms | The gig platform being evaluated |
| `job_type` | 5 categories | Ride hailing drivers, Ride hailing instant delivery, Delivery workers in General, On Demand home based services, Remote service providers |
| `weather` | Clear, Rain, Drizzle, Thunderstorm, Clouds, Haze | Current weather condition |
| `traffic` | clear, moderate, heavy | Current traffic level |
| `burnout_risk` | low, moderate, high | Pre-computed wellbeing risk |

### Numerical/Binary (17)
| Feature | Range | Description |
|---------|-------|-------------|
| `hour` | 0–23 | Current hour of day |
| `day` | 0–6 | Day of week (0=Mon, 6=Sun) |
| `temp` | 15–45°C | Current temperature |
| `congestion_percent` | 0–100 | Traffic congestion percentage |
| `is_compatible` | 0 or 1 | Whether vehicle matches job requirements |
| `hours_today` | 0–14 | Hours worked today |
| `hours_last_3_days` | 0–42 | Hours worked in last 3 days |
| `consecutive_days` | 0–21 | Days worked without rest |
| `mood_score` | -1.0 to 1.0 | Recent emotional state |
| `skill_*` (8 columns)| 0 or 1 | Binary flags for user's skillset |

---

## 📈 Feature Importance (by Gain)

```
 1. is_compatible            464889.3  ██████████████████████████████
 2. job_type                  41645.8  ██
 3. burnout_risk              20005.3  █
 4. vehicle                   18798.5  █
 5. hour                      11949.1  
 6. job                        9728.4  
 7. weather                    4371.2  
 8. congestion_percent         2678.4  
 9. day                        2554.7  
10. traffic                    1908.8  
11. hours_last_3_days          1846.2  
12. temp                       1758.2  
13. hours_today                1664.3  
14. mood_score                 1305.4  
15. consecutive_days           1127.5  
```

**Key Insight:** Vehicle compatibility is the dominant factor (10x more important than the next feature). The model has learned to never recommend a job that doesn't match the worker's vehicle.

---

## 🚗 Supported Jobs & Vehicle Compatibility

### 6 Job Types
| Type | Platforms |
|------|-----------|
| **Cab Taxi** | Uber, Ola, BluSmart, Namma Yatri, InDriver |
| **Bike Taxi** | Rapido |
| **Food Delivery** | Swiggy, Zomato |
| **Quick Commerce** | Blinkit, Zepto, BigBasket, JioMart |
| **Logistics** | Amazon Flex, Delhivery, BlueDart |
| **Hyperlocal** | Dunzo |

### Vehicle Compatibility Matrix
| Vehicle | Compatible Jobs |
|---------|----------------|
| Bike | Rapido, Swiggy, Zomato, Blinkit, Zepto, BigBasket, JioMart, Delhivery, BlueDart, Dunzo |
| Scooter | Same as Bike + Amazon Flex |
| Electric Bike (EV) | Same as Bike (excluding BlueDart) + Dunzo |
| Cab (Mini/Sedan) | Uber, Ola, BluSmart, InDriver, Amazon Flex |
| Cab (SUV) | Uber, Ola, BluSmart, InDriver |
| Auto-Rickshaw | Uber, Ola, InDriver, Namma Yatri, Dunzo |
| Cycle | Swiggy, Zomato, Blinkit, Zepto, BigBasket, JioMart |
| Mini Truck | Amazon Flex, BlueDart |
| Walking | (None — near-zero earnings) |

---

## 🧪 Dataset Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Size** | 50,000 rows | Sufficient for XGBoost tabular learning |
| **Balance** | Equal | Prevents bias toward popular platforms |
| **Noise** | Gaussian ±15% | Probabilistic simulation for realism |
| **Cold Start** | 15% "Day 1" rows | Model handles new users without special logic |
| **Leakage** | Raw features only | No derived columns like `is_surge` or `is_peak` |

---

## 🔧 Hyperparameters

```python
params = {
    "objective": "reg:squarederror",
    "max_depth": 8,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 5,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "num_boost_round": 500,       # Max trees
    "early_stopping_rounds": 30,   # Stopped at iteration 212
}
```

---

## 🔗 Integration with Node.js Backend

The Node.js backend (`server/services/jobRecommendationService.js`) calls the FastAPI server:

```
Android App → Node.js Backend → Python ML API → XGBoost Model
                (port 3000)       (port 8000)
```

The Node.js service:
1. Gathers user context (weather, traffic, workload, mood)
2. Sends `POST /recommend` to `http://localhost:8000`
3. Returns ranked job list to the Android app
