import pandas as pd
import numpy as np
import os

# Ensure data directory exists
os.makedirs('ml_engine/data', exist_ok=True)

CITIES = ['Bangalore', 'Delhi', 'Mumbai', 'Chennai', 'Hyderabad', 'Kolkata']
HOURS = list(range(24))
WEATHER_CONDITIONS = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm', 'Fog', 'Mist', 'Haze', 'Smoke/Dust', 'Extreme Heat']

# Traffic logic based on TomTom averages and our discovered ML thresholds:
# Clear: 0-25% delay
# Moderate: 26-65% delay
# Heavy: 65%+ delay

def get_traffic_multiplier(city, hour, weather):
    """Calculates a realistic traffic delay percentage based on context."""
    
    # 1. Base delay by hour (Rush hours vs Off-peak)
    if hour in [8, 9, 10, 18, 19, 20]: # Peak rush hour
        base_delay = np.random.uniform(40, 80)
    elif hour in [7, 11, 17, 21]: # Shoulders of rush hour
        base_delay = np.random.uniform(20, 50)
    elif hour in [0, 1, 2, 3, 4, 5]: # Deep night
        base_delay = np.random.uniform(0, 10)
    else: # Normal daytime off-peak
        base_delay = np.random.uniform(15, 35)
        
    # 2. City modifiers (Bangalore/Mumbai are worse than Hyderabad/Chennai)
    if city in ['Bangalore', 'Mumbai', 'Delhi']:
        base_delay *= 1.2
    else:
        base_delay *= 1.0
        
    # 3. Weather modifiers (Rain/Thunderstorm ruin traffic)
    if weather in ['Rain', 'Thunderstorm']:
        base_delay *= 1.8 # Massive delay spike
    elif weather in ['Drizzle', 'Fog', 'Smoke/Dust']:
        base_delay *= 1.3 # Slower driving
        
    # Add some random noise
    final_delay = base_delay + np.random.normal(0, 5)
    
    # Cap at realistic max (e.g. 200% delay = trip takes 3x as long)
    return max(0, min(final_delay, 200))

def get_traffic_level(delay_pct):
    if delay_pct <= 25:
        return 'clear'
    elif delay_pct <= 65:
        return 'moderate'
    else:
        return 'heavy'

print("Generating highly realistic contextual traffic dataset for all Indian cities, hours, and weather...")

traffic_records = []

# Generate a dense matrix of possibilities so our 100k generator has plenty to sample from
for city in CITIES:
    for hour in HOURS:
        for weather in WEATHER_CONDITIONS:
            # Generate 20 realistic trips for every single combination of City + Hour + Weather
            for _ in range(20):
                base_time = round(np.random.uniform(10, 45)) # 10 to 45 mins base commute
                delay_pct = get_traffic_multiplier(city, hour, weather)
                predicted_time = round(base_time * (1 + (delay_pct / 100)))
                
                # Recalculate exact delay pct to ensure perfect math
                actual_delay_pct = ((predicted_time - base_time) / base_time) * 100 if base_time > 0 else 0
                
                traffic_records.append({
                    'city': city,
                    'hour_of_day': hour,
                    'weather_condition': weather,
                    'base_duration_mins': base_time,
                    'predicted_duration_mins': predicted_time,
                    'congestion_percent': round(actual_delay_pct, 1),
                    'traffic_level': get_traffic_level(actual_delay_pct)
                })

df_traffic = pd.DataFrame(traffic_records)
output_path = 'ml_engine/data/indian_traffic_patterns.csv'
df_traffic.to_csv(output_path, index=False)

print(f"✅ Successfully generated and saved {len(df_traffic)} contextual traffic records to {output_path}")
print(df_traffic.head())
