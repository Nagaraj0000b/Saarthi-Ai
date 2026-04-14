import pandas as pd
import numpy as np
import os

# Load the historical weather dataset which already has perfect timestamps
weather_path = 'ml_engine/data/indian_weather_history.csv'
print(f"Loading {weather_path}...")
df = pd.read_csv(weather_path)

# Ensure timestamp is a datetime object
df['timestamp'] = pd.to_datetime(df['timestamp'])

def get_traffic_multiplier(city, hour, weather):
    """Calculates a realistic traffic delay percentage based on context."""
    if hour in [8, 9, 10, 18, 19, 20]: # Peak rush hour
        base_delay = np.random.uniform(40, 80)
    elif hour in [7, 11, 17, 21]: # Shoulders of rush hour
        base_delay = np.random.uniform(20, 50)
    elif hour in [0, 1, 2, 3, 4, 5]: # Deep night
        base_delay = np.random.uniform(0, 10)
    else: # Normal daytime off-peak
        base_delay = np.random.uniform(15, 35)
        
    if city in ['Bangalore', 'Mumbai', 'Delhi']:
        base_delay *= 1.2
    else:
        base_delay *= 1.0
        
    if weather in ['Rain', 'Thunderstorm']:
        base_delay *= 1.8 
    elif weather in ['Drizzle', 'Fog', 'Smoke/Dust']:
        base_delay *= 1.3 
        
    final_delay = base_delay + np.random.normal(0, 5)
    return max(0, min(final_delay, 200))

def get_traffic_level(delay_pct):
    if delay_pct <= 25:
        return 'clear'
    elif delay_pct <= 65:
        return 'moderate'
    else:
        return 'heavy'

print("Calculating traffic conditions for each historical timestamp...")

# Extract hour from the real timestamp
df['hour_of_day'] = df['timestamp'].dt.hour

# Calculate traffic metrics row by row
base_times = []
predicted_times = []
congestion_pcts = []
traffic_levels = []

for index, row in df.iterrows():
    city = row['city']
    hour = row['hour_of_day']
    weather = row['weather_condition']
    
    base_time = round(np.random.uniform(10, 45))
    delay_pct = get_traffic_multiplier(city, hour, weather)
    predicted_time = round(base_time * (1 + (delay_pct / 100)))
    
    actual_delay_pct = ((predicted_time - base_time) / base_time) * 100 if base_time > 0 else 0
    
    base_times.append(base_time)
    predicted_times.append(predicted_time)
    congestion_pcts.append(round(actual_delay_pct, 1))
    traffic_levels.append(get_traffic_level(actual_delay_pct))

# Add columns to the dataframe
df['base_duration_mins'] = base_times
df['predicted_duration_mins'] = predicted_times
df['congestion_percent'] = congestion_pcts
df['traffic_level'] = traffic_levels

# Drop the temporary hour column to keep it clean
df = df.drop(columns=['hour_of_day'])

# Save the combined Context dataset
output_path = 'ml_engine/data/indian_context_history.csv'
df.to_csv(output_path, index=False)

print(f"✅ Successfully created unified Context dataset with {len(df)} rows at {output_path}")
print(df[['city', 'timestamp', 'weather_condition', 'congestion_percent', 'traffic_level']].head(10))