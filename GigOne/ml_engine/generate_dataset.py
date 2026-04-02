"""
GigOne Saarthi — Machine Learning Dataset Generator
=================================================
This script generates 50,000 rows of data to train a machine learning model.
The data represents gig workers (like delivery or cab drivers) and their 
estimated earnings based on various factors like weather and traffic.

Technical Terms Defined:
-----------------------
- Machine Learning (ML): A type of computer program that learns patterns 
  from data to make predictions.
- Dataset: A collection of information used to teach or test a machine 
  learning model.
- Gaussian Noise: Random variations added to data to make it more realistic. 
  It follows a 'normal distribution' (a bell-shaped curve).
- Probabilistic Simulation: Using random numbers to imitate real-world 
  uncertainty.
- XGBoost: A specific tool used to build high-performance prediction models.
- Cold-Start: Refers to a new user who has no previous history in the system.
"""

import pandas as pd
import numpy as np
import os

# Configuration Settings
TOTAL_ROWS = 50000
COLD_START_RATIO = 0.15  # 15% of the data will represent new workers (Day 1)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "synthetic_earnings.csv")

# Set a fixed random seed so the results are consistent every time we run this
np.random.seed(42)

# Job Categories and Specific Platforms
JOB_TYPES = {
    "Ride hailing drivers (cab+ bike)": ["Uber", "Ola", "BluSmart", "Namma Yatri", "InDriver", "Rapido"],
    "Ride hailing instant delivery":    ["Swiggy", "Zomato", "Blinkit", "Zepto"],
    "Delivery workers in General":     ["Amazon Flex", "Delhivery", "BlueDart", "Dunzo", "BigBasket", "JioMart"],
    "On Demand home based services":   ["Urban Company", "Local Plumber", "Local Electrician", "Home Cleaning Co", "Elderly Care", "Pet Walker"],
    "Remote service providers":        ["DataEntry Inc", "SupportHero", "Virtual Assistant Hub", "Translation Pro"],
}

# Create a simple list of all job names and a map to their categories
ALL_JOBS = []
JOB_TO_TYPE = {}
for category_name, jobs_list in JOB_TYPES.items():
    for job_name in jobs_list:
        ALL_JOBS.append(job_name)
        JOB_TO_TYPE[job_name] = category_name

# Base Earnings per hour for each job (in Rupees)
BASE_RATES = {
    "Uber": 220, "Ola": 210, "BluSmart": 240, "Namma Yatri": 195, "InDriver": 200, "Rapido": 130,
    "Swiggy": 165, "Zomato": 170, "Blinkit": 175, "Zepto": 180,
    "Amazon Flex": 185, "Delhivery": 150, "BlueDart": 165, "Dunzo": 155, "BigBasket": 160, "JioMart": 155,
    "Urban Company": 350, "Local Plumber": 300, "Local Electrician": 320, "Home Cleaning Co": 280,
    "Elderly Care": 250, "Pet Walker": 220,
    "DataEntry Inc": 120, "SupportHero": 150, "Virtual Assistant Hub": 180, "Translation Pro": 250,
}

# Skills required for different jobs
SKILLS = [
    "skill_bike", "skill_car", "skill_heavy", 
    "skill_clean", "skill_trade", "skill_care",
    "skill_digital", "skill_support"
]

# Mapping jobs to the skills they require
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

# Environmental factors (Weather and Traffic)
WEATHER_OPTIONS = ["Clear", "Rain", "Drizzle", "Thunderstorm", "Clouds", "Haze"]
WEATHER_PROBS   = [0.50, 0.12, 0.10, 0.05, 0.15, 0.08]

TRAFFIC_OPTIONS = ["clear", "moderate", "heavy"]
TRAFFIC_PROBS   = [0.35, 0.40, 0.25]

def generate_row(job_name, is_cold_start=False):
    """
    Creates one row of data for a specific job.
    
    Inputs:
    - job_name (string): The name of the job (e.g., 'Uber').
    - is_cold_start (boolean): If True, the worker is new (default is False).
    
    Outputs:
    - row_data (dictionary): A collection of features like time, weather, and earnings.
    """
    job_type = JOB_TO_TYPE[job_name]

    # Time factors: Hour of the day (0-23) and Day of the week (0-6)
    hour = np.random.randint(0, 24)
    day = np.random.randint(0, 7)

    # Weather factors
    weather = np.random.choice(WEATHER_OPTIONS, p=WEATHER_PROBS)
    temp = round(np.random.normal(30, 5), 1)
    temp = np.clip(temp, 15, 45)

    # Traffic factors
    traffic = np.random.choice(TRAFFIC_OPTIONS, p=TRAFFIC_PROBS)
    if traffic == "clear":
        congestion = np.random.randint(0, 15)
    elif traffic == "moderate":
        congestion = np.random.randint(15, 45)
    else:
        congestion = np.random.randint(45, 100)

    # Skills: Randomly assign skills to the simulated user
    user_skills = {skill: np.random.choice([0, 1]) for skill in SKILLS}
    # Ensure every user has at least one skill
    if sum(user_skills.values()) == 0:
        user_skills[np.random.choice(SKILLS)] = 1
        
    required_skills = COMPATIBILITY.get(job_name, [])
    # Check if the user has any skill required for this specific job
    is_compatible = any(user_skills[skill_name] == 1 for skill_name in required_skills)

    # Worker history features
    if is_cold_start:
        hours_today = 0.0
        hours_3d = 0.0
        consecutive_days = 0
        mood_score = round(np.random.uniform(-0.2, 0.3), 2)
        burnout_risk = "low"
    else:
        hours_today = round(np.random.exponential(3.0), 1)
        hours_today = min(hours_today, 14.0)
        hours_3d = round(np.random.exponential(10.0), 1)
        hours_3d = min(hours_3d, 42.0)
        consecutive_days = int(np.random.exponential(3.0))
        consecutive_days = min(consecutive_days, 21)
        mood_score = round(np.random.normal(0.0, 0.4), 2)
        mood_score = np.clip(mood_score, -1.0, 1.0)

        # Calculate if the worker is tired (burnout)
        risk_value = (hours_today * 5) + (hours_3d * 2) + (consecutive_days * 3) - (mood_score * 20)
        if risk_value > 70:
            burnout_risk = "high"
        elif risk_value > 40:
            burnout_risk = "moderate"
        else:
            burnout_risk = "low"

    # Start with the base rate for the job
    rate = BASE_RATES[job_name]

    # Apply weather impact (Only for jobs affected by weather)
    if job_type != "Remote service providers":
        is_rain = weather in ["Rain", "Thunderstorm"]
        is_drizzle = weather == "Drizzle"
        is_heat = temp > 36

        if is_rain:
            if job_type == "Ride hailing drivers (cab+ bike)":
                rate *= np.random.normal(1.35, 0.08)
            elif job_type == "Ride hailing instant delivery":
                rate *= np.random.normal(1.15, 0.05)
            elif job_type == "Delivery workers in General":
                rate *= np.random.normal(0.85, 0.05)
            elif job_type == "On Demand home based services":
                rate *= np.random.normal(0.90, 0.10)
        elif is_drizzle:
            if job_type == "Ride hailing drivers (cab+ bike)":
                rate *= np.random.normal(1.15, 0.05)

        if is_heat:
            if job_type in ["Food Delivery", "Quick Commerce"]:
                rate *= np.random.normal(1.18, 0.05)

    # Apply traffic impact (Only for jobs affected by traffic)
    if job_type != "Remote service providers":
        if traffic == "heavy":
            if job_type == "Ride hailing drivers (cab+ bike)":
                rate *= np.random.normal(0.72, 0.06)
            elif job_type == "Delivery workers in General":
                rate *= np.random.normal(0.78, 0.05)
            elif job_type in ["Ride hailing instant delivery"]:
                rate *= np.random.normal(1.12, 0.05)
        elif traffic == "moderate":
            if job_type == "Ride hailing drivers (cab+ bike)":
                rate *= np.random.normal(0.92, 0.04)

    # Peak hour and weekend effects
    if job_type == "Ride hailing instant delivery":
        if (12 <= hour <= 14) or (19 <= hour <= 22):
            rate *= np.random.normal(1.35, 0.07)
    elif job_type == "Ride hailing drivers (cab+ bike)":
        if (8 <= hour <= 10) or (17 <= hour <= 19):
            rate *= np.random.normal(1.25, 0.06)

    if day >= 5:  # Weekends
        if job_type == "Ride hailing instant delivery":
            rate *= np.random.normal(1.15, 0.04)

    # Penalty for being tired
    if burnout_risk == "high":
        rate *= np.random.normal(0.68, 0.06)
    elif burnout_risk == "moderate":
        rate *= np.random.normal(0.88, 0.04)

    # If the user doesn't have the right skills, earnings drop to near zero
    if not is_compatible:
        rate = max(0, np.random.normal(10, 5))

    # Add final random variation (noise) to earnings
    noise_factor = np.random.normal(1.0, 0.15)
    final_earning = round(max(0, rate * noise_factor), 2)

    row_data = {
        "job": job_name,
        "job_type": job_type,
        "hour": hour,
        "day": day,
        "weather": weather,
        "temp": temp,
        "traffic": traffic,
        "congestion_percent": congestion,
        "is_compatible": int(is_compatible),
        "hours_today": round(hours_today, 1),
        "hours_last_3_days": round(hours_3d, 1),
        "consecutive_days": consecutive_days,
        "mood_score": round(float(mood_score), 2),
        "burnout_risk": burnout_risk,
        "target_earning": final_earning,
    }
    row_data.update(user_skills)
    return row_data

def main():
    """
    The main process that generates the full dataset and saves it to a file.
    
    Inputs: None
    Outputs: None (saves a CSV file to the data folder)
    """
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    ROWS_PER_CATEGORY = 10000

    print("--------------------------------------------------")
    print("  GigOne Saarthi - Dataset Generator")
    print("--------------------------------------------------")
    print(f"  Total Rows:       {TOTAL_ROWS}")
    print(f"  Categories:       {len(JOB_TYPES)}")
    print(f"  Rows Per Category: {ROWS_PER_CATEGORY}")
    print("--------------------------------------------------")

    data_rows = []
    for category_name, jobs_list in JOB_TYPES.items():
        rows_per_job = ROWS_PER_CATEGORY // len(jobs_list)
        remainder = ROWS_PER_CATEGORY % len(jobs_list)
        
        for index, job_name in enumerate(jobs_list):
            current_job_rows = rows_per_job + (1 if index < remainder else 0)
            
            cold_rows_count = int(current_job_rows * COLD_START_RATIO)
            normal_rows_count = current_job_rows - cold_rows_count
            
            for _ in range(cold_rows_count):
                data_rows.append(generate_row(job_name, is_cold_start=True))
            for _ in range(normal_rows_count):
                data_rows.append(generate_row(job_name, is_cold_start=False))

    data_frame = pd.DataFrame(data_rows)

    # Mix the rows so they are in a random order
    data_frame = data_frame.sample(frac=1, random_state=42).reset_index(drop=True)

    data_frame.to_csv(OUTPUT_FILE, index=False)

    print(f"\nSuccess: Dataset saved to {OUTPUT_FILE}")
    print(f"Shape: {data_frame.shape}")

    print("\nJob Type Distribution:")
    print(data_frame["job_type"].value_counts().to_string())

    print("\nTarget Earning Statistics:")
    print(f"  Average:   Rs. {data_frame['target_earning'].mean():.2f}/hr")
    print(f"  Middle:    Rs. {data_frame['target_earning'].median():.2f}/hr")
    print(f"  Lowest:    Rs. {data_frame['target_earning'].min():.2f}/hr")
    print(f"  Highest:   Rs. {data_frame['target_earning'].max():.2f}/hr")

if __name__ == "__main__":
    main()
