"""
GigOne Saarthi — Phase 1 Verification Script
============================================
This script performs an automated check to ensure that the dataset 
generated in Phase 1 meets all the requirements.

Technical Terms Defined:
-----------------------
- Verification: The process of checking if a product or system meets the 
  specified requirements.
- Dataset: A collection of information used for training machine learning models.
- Job Type: A category that groups different job platforms (like delivery).
- Variance: A measure of how much values in a dataset differ from the 
  average value.
"""

import pandas as pd
import numpy as np
import os

DATA_PATH = "ml_engine/data/synthetic_earnings.csv"

def test_phase_1_dataset():
    """
    Checks the generated dataset for the correct number of rows, 
    balanced categories, and zero environmental impact for remote jobs.
    
    Inputs: None (reads the CSV file from disk)
    Outputs: result (boolean): True if all checks pass, False otherwise.
    """
    if not os.path.exists(DATA_PATH):
        print(f"Error: Dataset file not found at {DATA_PATH}")
        return False
    
    data_frame = pd.read_csv(DATA_PATH)
    
    # 1. Total Rows Check
    expected_row_count = 50000
    actual_row_count = len(data_frame)
    if actual_row_count != expected_row_count:
        print(f"Failure (DATA-01): Expected {expected_row_count} rows, but found {actual_row_count}")
        return False
    else:
        print(f"Pass (DATA-01): Dataset contains exactly {actual_row_count} rows.")

    # 2. Job Categories Distribution Check
    expected_categories = [
        "Ride hailing drivers (cab+ bike)",
        "Ride hailing instant delivery",
        "Delivery workers in General",
        "On Demand home based services",
        "Remote service providers"
    ]
    category_counts = data_frame["job_type"].value_counts().to_dict()
    
    for category in expected_categories:
        if category not in category_counts:
            print(f"Failure (DATA-01): Missing the category '{category}'")
            return False
        if category_counts[category] != 10000:
            print(f"Failure (DATA-01): Category '{category}' has {category_counts[category]} rows instead of 10,000.")
            return False
    print("Pass (DATA-01): All 5 categories have exactly 10,000 rows each.")

    # 3. 'Other' Category Exclusion Check
    if "Other" in data_frame["job"].unique() or "Other" in data_frame["job_type"].unique():
        print("Failure (DATA-01): Found the restricted 'Other' category in the dataset.")
        return False
    print("Pass (DATA-01): No restricted categories found.")

    # 4. Zero Environmental Impact for Remote Jobs Check (DATA-02)
    # We verify that earnings for remote jobs don't change based on weather.
    remote_data = data_frame[data_frame["job_type"] == "Remote service providers"]
    
    remote_job_list = ["DataEntry Inc", "SupportHero", "Virtual Assistant Hub", "Translation Pro"]
    for job_name in remote_job_list:
        specific_job_data = remote_data[remote_data["job"] == job_name]
        
        # Calculate average earnings for different weather conditions
        clear_weather_average = specific_job_data[specific_job_data["weather"] == "Clear"]["target_earning"].mean()
        rainy_weather_average = specific_job_data[specific_job_data["weather"] == "Rain"]["target_earning"].mean()
        
        # Calculate the percentage difference
        difference_percent = abs(clear_weather_average - rainy_weather_average) / clear_weather_average
        
        # We allow up to 10% difference due to random noise in the sample
        if difference_percent > 0.10:
            print(f"Failure (DATA-02): Remote job '{job_name}' shows a {difference_percent:.2%} difference between Clear and Rain.")
            return False
            
    print("Pass (DATA-02): Remote jobs show no significant variation due to weather (Noise only).")
    return True

if __name__ == "__main__":
    print("Starting Phase 1 Verification...")
    if test_phase_1_dataset():
        print("\nSuccess: Phase 1 Verification Passed!")
    else:
        print("\nFailure: Phase 1 Verification Failed.")
        exit(1)
