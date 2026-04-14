import requests
import pandas as pd
from datetime import date, timedelta
import os

# Ensure the data directory exists
os.makedirs('ml_engine/data', exist_ok=True)

# Define target cities and their coordinates
CITIES = {
    'Bangalore': {'lat': 12.9716, 'lon': 77.5946},
    'Delhi': {'lat': 28.6139, 'lon': 77.2090},
    'Mumbai': {'lat': 19.0760, 'lon': 72.8777},
    'Chennai': {'lat': 13.0827, 'lon': 80.2707},
    'Hyderabad': {'lat': 17.3850, 'lon': 78.4867},
    'Kolkata': {'lat': 22.5726, 'lon': 88.3639}
}

# We'll pull data for exactly the last 365 days
end_date = date.today() - timedelta(days=5) # 5 days ago to ensure data stability from the API
start_date = end_date - timedelta(days=365)

start_date_str = start_date.strftime('%Y-%m-%d')
end_date_str = end_date.strftime('%Y-%m-%d')

print(f"Fetching weather data from {start_date_str} to {end_date_str}...")

def map_weather_condition(code, temp, visibility):
    """Maps WMO weather codes to our readable categories"""
    condition = "Clear"
    if code == 0:
        condition = "Clear"
    elif code in [1, 2, 3]:
        condition = "Clouds"
    elif code in [45, 48]:
        condition = "Fog"
    elif code in [51, 53, 55, 56, 57]:
        condition = "Drizzle"
    elif code in [61, 63, 65, 66, 67, 80, 81, 82]:
        condition = "Rain"
    elif code in [71, 73, 75, 77, 85, 86]:
        condition = "Snow" 
    elif code in [95, 96, 99]:
        condition = "Thunderstorm"
        
    # Context-aware overrides
    if temp >= 40:
        return "Extreme Heat"
    
    # Haze detection for urban areas
    if visibility is not None and visibility < 4000 and condition in ["Clear", "Clouds"]:
        return "Haze"
        
    return condition

all_weather_data = []

for city, coords in CITIES.items():
    print(f"Fetching historical data for {city}...")
    
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": coords['lat'],
        "longitude": coords['lon'],
        "start_date": start_date_str,
        "end_date": end_date_str,
        "hourly": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,visibility",
        "timezone": "Asia/Kolkata"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        hourly = data.get('hourly', {})
        time_array = hourly.get('time', [])
        
        for i in range(len(time_array)):
            temp = hourly['temperature_2m'][i]
            vis = hourly['visibility'][i] if hourly['visibility'][i] is not None else 10000
            w_code = hourly['weather_code'][i]
            
            if temp is None or w_code is None:
                continue
                
            condition = map_weather_condition(w_code, temp, vis)
            
            all_weather_data.append({
                'city': city,
                'timestamp': time_array[i],
                'weather_condition': condition,
                'temperature_celsius': round(temp, 1),
                'feels_like_temperature_celsius': round(hourly['apparent_temperature'][i], 1) if hourly['apparent_temperature'][i] is not None else round(temp, 1),
                'humidity_percentage': hourly['relative_humidity_2m'][i],
                'wind_speed_km_per_hr': round(hourly['wind_speed_10m'][i], 1) if hourly['wind_speed_10m'][i] is not None else 0.0,
                'visibility_meters': vis,
                'precipitation_mm': hourly['precipitation'][i] if hourly['precipitation'][i] is not None else 0.0
            })
            
    except Exception as e:
        print(f"Error fetching data for {city}: {str(e)}")

# Create final DataFrame and save
df = pd.DataFrame(all_weather_data)
df = df.dropna()

output_path = 'ml_engine/data/indian_weather_history.csv'
df.to_csv(output_path, index=False)

print(f"✅ Successfully processed and saved {len(df)} rows to {output_path}")