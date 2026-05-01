import pandas as pd
import numpy as np
import random
import os
import uuid
from datetime import timedelta

# --- Configuration ---
NUM_ROWS = 50000
OUTPUT_FILE = 'ml_engine/data/gig_workers_50k_preset.csv'

print(f"Generating {NUM_ROWS} synthetic gig worker profiles...")

# --- 1. Load Context Data (Weather & Traffic) ---
context_df = pd.read_csv('ml_engine/data/indian_context_history.csv')
# We need 100k context rows. Since we have ~52k, we will sample with replacement.
sampled_context = context_df.sample(n=NUM_ROWS, replace=True).reset_index(drop=True)

# --- 2. Demographics & Attributes ---
genders = ['Male', 'Female']
gender_probs = [0.85, 0.15] # Realistic gig economy split in India

# --- 3. Domains, Jobs, Platforms, and Skills ---
# Define the job taxonomy
DOMAINS = {
    'Web_Freelance': {
        'jobs': ['Software Development', 'Cyber-security', 'Algorithm Programming'],
        'platforms': ['Upwork', 'Toptal', 'Turing', 'Freelancer'],
        'base_skills': ['Software Development', 'Data Science', 'Complex Project Management']
    },
    'Web_Creative': {
        'jobs': ['Graphic Illustration', 'Video Editing', 'Freelance Writing'],
        'platforms': ['Fiverr', 'Upwork', 'Pepper Content', 'Canva Creators'],
        'base_skills': ['Graphic Design', 'Content Creation', 'Video Editing']
    },
    'Web_Microtasks': {
        'jobs': ['Data Entry', 'Online Surveys', 'Image Tagging', 'Transcription'],
        'platforms': ['Amazon MTurk', 'SquadStack', 'Clickworker', 'Toloka'],
        'base_skills': ['Data Tagging', 'Fast Typing', 'Attention to Detail']
    },
    'Web_Admin': {
        'jobs': ['Virtual Assistance', 'Scheduling', 'Digital Marketing'],
        'platforms': ['Wishup', 'Fiverr', 'Upwork', 'Belay'],
        'base_skills': ['Virtual Assistance', 'Social Media Management', 'Administrative Support']
    },
    'Location_Transport_Ride': {
        'jobs': ['Ride-hailing (Car)', 'Ride-hailing (Bike)', 'Auto-Rickshaw'],
        'platforms': ['Ola', 'Uber', 'Rapido', 'BluSmart', 'Namma Yatri'],
        'base_skills': ['Driving/Ride-hailing', 'Navigation', 'Customer Service']
    },
    'Location_Transport_Delivery': {
        'jobs': ['Food Delivery', 'Grocery Delivery', 'Parcel Delivery'],
        'platforms': ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Porter', 'Shadowfax'],
        'base_skills': ['Delivery Services', 'Navigation', 'Time Management']
    },
    'Location_Home_Services': {
        'jobs': ['House Cleaning', 'Plumbing', 'Carpentry', 'Appliance Repair'],
        'platforms': ['Urban Company', 'NoBroker'],
        'base_skills': ['Domestic Cleaning', 'Handyman/Repair', 'Assembly']
    },
    'Location_Personal_Care': {
        'jobs': ['Salon at Home', 'Massage Therapy', 'Men Grooming'],
        'platforms': ['Urban Company', 'YesMadam'],
        'base_skills': ['Cosmetology/Beauty', 'Personal Care', 'Customer Service']
    },
    'Location_Education': {
        'jobs': ['Academic Tutoring', 'Language Teaching', 'Music Lessons'],
        'platforms': ['Unacademy', 'UrbanPro', 'Vedantu'],
        'base_skills': ['Subject Tutoring', 'Language Proficiency', 'Arts/Music Instruction']
    }
}

# --- 4. Generation Logic ---
data = []

# Pre-generate random arrays for speed
rand_genders = np.random.choice(genders, size=NUM_ROWS, p=gender_probs)
rand_domains = np.random.choice(list(DOMAINS.keys()), size=NUM_ROWS)
# Correlate experience with skill level later (0 to 20 years)
rand_experience = np.random.exponential(scale=4.0, size=NUM_ROWS) 
rand_experience = np.clip(rand_experience, 0, 20).astype(int)

# Skill level distribution
skill_levels = ['Low', 'Medium', 'High']

print("Building rows and mapping skills/experience...")
for i in range(NUM_ROWS):
    domain_key = rand_domains[i]
    domain_info = DOMAINS[domain_key]
    
    # Pick specific job and platform
    job = random.choice(domain_info['jobs'])
    platform = random.choice(domain_info['platforms'])
    
    # Assign Experience
    exp_years = rand_experience[i]
    
    # Derive Skill Level logically from experience
    if exp_years <= 1:
        s_level = 'Low'
    elif exp_years <= 5:
        s_level = np.random.choice(['Low', 'Medium'], p=[0.3, 0.7])
    elif exp_years <= 10:
        s_level = np.random.choice(['Medium', 'High'], p=[0.4, 0.6])
    else:
        s_level = 'High'
        
    # Assign 1 to 3 primary skills based on the domain
    num_skills = random.randint(1, min(3, len(domain_info['base_skills'])))
    user_skills = random.sample(domain_info['base_skills'], num_skills)
    primary_skill = user_skills[0]
    
    # Generate a realistic voice text prompt placeholder
    # The actual text generation will happen on Kaggle. We pass the context to the prompt.
    is_location_based = domain_key.startswith('Location_')
    
    data.append({
        'user_id': f"U_{uuid.uuid4().hex[:8].upper()}",
        'gender': rand_genders[i],
        'domain': domain_key,
        'job_type': job,
        'platform': platform,
        'domain_experience_years': exp_years,
        'primary_skill': primary_skill,
        'skill_level': s_level,
        'is_location_based': is_location_based
    })

# Convert to DataFrame
df_users = pd.DataFrame(data)

# Combine User Data with Context Data
print("Merging User Data with Weather/Traffic Context...")
final_df = pd.concat([df_users, sampled_context], axis=1)

# Add a column that tells the Kaggle LLM exactly what context to use for generating the text
print("Creating LLM Prompt Instructions for Kaggle...")
def create_llm_prompt(row):
    if row['is_location_based']:
        return f"Location-based: Generate a 1-2 sentence spoken phrase from an Indian gig worker doing {row['job_type']} on {row['platform']}. It is currently {row['weather_condition']} weather with {row['traffic_level']} traffic ({row['congestion_percent']}% delay). Their experience level is {row['skill_level']}. Make it sound natural, realistic, and strictly reflect how the weather and traffic affect their mood."
    else:
        return f"Work-from-home: Generate a 1-2 sentence spoken phrase from an Indian freelance gig worker doing {row['job_type']} on {row['platform']}. They are working from home indoors. Their experience level is {row['skill_level']} ({row['domain_experience_years']} years). Make it sound natural and reflect their current work progress, success, or routine challenges. Do not mention weather or traffic."

final_df['llm_generation_prompt'] = final_df.apply(create_llm_prompt, axis=1)

# Save the dataset
final_df.to_csv(OUTPUT_FILE, index=False)
print(f"✅ Successfully generated {NUM_ROWS} preset rows to {OUTPUT_FILE}")
print(final_df[['job_type', 'platform', 'primary_skill', 'skill_level', 'traffic_level', 'weather_condition']].head())
