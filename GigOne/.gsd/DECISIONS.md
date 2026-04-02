# GSD DECISIONS LOG

## Phase 1: Dataset Engineering — ML Recommendation Engine (V1)

**Date:** 2026-03-31

### Scope
- 20,000 rows of synthetic training data
- 17 jobs across 6 job types (Cab, Bike Taxi, Food, Quick Commerce, Logistics, Hyperlocal)
- 14 input features (temporal, environmental, user history)
- Equal distribution (~1176 rows per job) for unbiased training

### Approach
- Chose: **Option B — Probabilistic Simulation** with Gaussian noise (±15%)
- Reason: Prevents overfitting, teaches the model probabilistic trends instead of deterministic formulas. More realistic for real-world gig economy variance.

### Cold Start Strategy
- Chose: **Intentional "Clean Slate" rows** (~15% of dataset)
- Reason: The model itself handles new users by learning that `hours_today=0` + market conditions → best Day 1 recommendation. No special backend if-else needed.

### Feature Leakage Prevention
- Model only sees raw features (hour, weather, traffic level)
- No derived/calculated columns like `is_surge` or `is_peak`
- Model must discover patterns independently

### Constraints
- Vehicle-to-Job compatibility must be enforced (incompatible combos → near-zero earnings)
- "Other" job type uses generic average rates

## Phase 10: Model Redesign (Skill Set & Expanded Types)

**Date:** 2026-03-31

### Scope
- Remove 'vehicle' from the ML model and recommendation logic.
- Introduce 'skill set' to replace vehicle dependency.
- Expand job types to cover all 5 target categories:
  1. On Demand home-based services (New)
  2. Ride hailing instant delivery
  3. Delivery workers in General
  4. Ride hailing drivers (cab+ bike)
  5. Remote service providers (New)
- Redo ML synthetic data to reflect these changes.
- Retrain the XGBoost recommendation model.

### Approach
- Chose: **Skill-based Compatibility Matrix** instead of Vehicle-based.
- Reason: The platform is expanding beyond delivery/ride-hailing to include home-based and remote work, making "vehicle" an insufficient constraint. "Skill set" acts as a more universal metric for job compatibility.

### Constraints
- The ML API and Dataset Generator must be refactored simultaneously to drop vehicle logic before retraining.

### Skill Sets Definition
Based on the discussion, 8 specific skills divided into 3 major categories will replace the 'vehicle' parameter:

1. **Wheels & Movement (Driving & Delivery)**
   - **Bike & Scooter Driving:** Food delivery, courier drops, bike taxi (Requires 2-Wheeler License).
   - **Car & Cab Driving:** Passenger rides, larger parcel delivery (Requires Commercial 4-Wheeler License).
   - **Heavy Lifting & Moving:** Loading/unloading, warehouse packing, helping people move furniture.

2. **Home & Trade (On-Demand Home Services)**
   - **Cleaning & House Chores:** House cleaning, organizing, yard work, basic furniture assembly.
   - **Skilled Trades & Repairs:** Plumbing, electrical work, AC/appliance repair, carpentry.
   - **Care & Assistance:** Pet walking, babysitting, elderly care.

3. **Digital & Office (Remote Services)**
   - **Computer & Admin Work:** Data entry, typing, virtual assistance, email management.
   - **Customer Support & Calls:** Telecalling, chat support, handling customer complaints, translation.
