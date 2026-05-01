import pandas as pd
import numpy as np
import os

# 1. Load the current 50k dataset
input_path = 'ml_engine/data/gig_workers_50k_final_output.csv'
print(f"Loading {input_path}...")
df = pd.read_csv(input_path)

num_rows = len(df)

# 2. Generate Work History Columns
print("Generating Work History columns (Hours Today, Consecutive Days)...")
# Hours worked today (0 to 12 hours)
df['hours_today'] = np.random.uniform(0.5, 12, num_rows).round(1)

# Hours worked in the last 3 days (sum of previous days, usually 0 to 36)
df['hours_last_3_days'] = (df['hours_today'] + np.random.uniform(2, 24, num_rows)).round(1)

# Consecutive days worked (0 to 14 days)
df['consecutive_days'] = np.random.randint(0, 15, num_rows)

# 3. Generate "Target Earning" (INR - Indian Rupees)
# This needs to be logically tied to Job Domain, Skill Level, and Experience
print("Calculating realistic Target Earnings (INR)...")

def calculate_earnings(row):
    # Base hourly rates in INR for different domains
    base_rates = {
        'Web_Freelance': 800,       # High skill (Software, Cyber)
        'Web_Creative': 500,        # Medium/High skill (Design, Video)
        'Web_Admin': 300,           # Medium skill (VA, Marketing)
        'Web_Microtasks': 80,       # Low skill (Data entry, Tagging)
        'Location_Transport_Ride': 180,    # Base for Ola/Uber
        'Location_Transport_Delivery': 150, # Base for Zomato/Swiggy
        'Location_Home_Services': 350,     # Specialized (Plumbing, Repair)
        'Location_Personal_Care': 400,     # Specialized (Salon, Massage)
        'Location_Education': 450          # Specialized (Tutoring)
    }
    
    base_rate = base_rates.get(row['domain'], 200)
    
    # Skill Multiplier (Low: 0.8x, Medium: 1.2x, High: 1.8x)
    skill_map = {'Low': 0.8, 'Medium': 1.2, 'High': 1.8}
    skill_mult = skill_map.get(row['skill_level'], 1.0)
    
    # Experience Multiplier (0.5% increase per year of experience)
    exp_mult = 1 + (row['domain_experience_years'] * 0.05)
    
    # Traffic/Weather Impact (Only for Location-based workers)
    context_mult = 1.0
    if row['is_location_based']:
        # Heavy traffic reduces number of trips per hour
        if row['traffic_level'] == 'heavy': context_mult -= 0.2
        if row['traffic_level'] == 'severe': context_mult -= 0.4
        # Bad weather can increase incentives but reduce speed
        if row['weather_condition'] in ['Rain', 'Thunderstorm']: context_mult += 0.1
    
    # Calculate final hourly earning for this specific session
    hourly_earning = base_rate * skill_mult * exp_mult * context_mult
    
    # --- INJECT NOISE (Simulate real-world variation +/- 15%) ---
    noise = np.random.uniform(0.85, 1.15)
    hourly_earning *= noise
    
    return round(hourly_earning, 2)

df['target_earning'] = df.apply(calculate_earnings, axis=1)

# 4. Generate "Burnout Risk" (The logic for our AI to learn)
print("Calculating Burnout Risk labels with human noise...")
def calculate_burnout(row):
    risk_score = 0
    if row['hours_today'] > 10: risk_score += 2
    if row['hours_last_3_days'] > 28: risk_score += 2
    if row['consecutive_days'] > 6: risk_score += 2
    if row['moodScore'] < -0.4: risk_score += 2
    if row['traffic_level'] in ['heavy', 'severe']: risk_score += 1
    
    # Determine base label
    if risk_score >= 6: label = 'High'
    elif risk_score >= 3: label = 'Medium'
    else: label = 'Low'
    
    # --- INJECT LABEL NOISE (10% chance of a random/unpredictable state) ---
    if np.random.random() < 0.10:
        return np.random.choice(['High', 'Medium', 'Low'])
        
    return label

df['burnout_risk'] = df.apply(calculate_burnout, axis=1)

# 5. Save the FINAL Main Dataset
output_path = 'ml_engine/data/saarthi_main_dataset_50k.csv'
df.to_csv(output_path, index=False)

print(f"✅ FINAL MASTER DATASET CREATED: {output_path}")
print(df[['job_type', 'hours_today', 'consecutive_days', 'target_earning', 'burnout_risk', 'moodLabel']].head(10))
