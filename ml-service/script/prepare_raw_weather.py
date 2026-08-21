import urllib.request
import json
import pandas as pd
import numpy as np
import os

# Create data directories
os.makedirs("data/raw", exist_ok=True)
os.makedirs("data/hanoi", exist_ok=True)

# 1. Fetch real weather data from Open-Meteo archive
print("Fetching real weather data from Open-Meteo...")
url = (
    "https://archive-api.open-meteo.com/v1/archive?"
    "latitude=21.0&longitude=105.80002"
    "&start_date=2021-08-15&end_date=2026-08-16"
    "&hourly=temperature_2m,dew_point_2m,relative_humidity_2m,rain,precipitation,surface_pressure,wind_speed_10m"
    "&timezone=Asia%2FBangkok"
)

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=30) as response:
    wdata = json.loads(response.read().decode())

df_weather = pd.DataFrame(wdata['hourly'])
df_weather['time'] = pd.to_datetime(df_weather['time'])
# Filter 3h grid: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
df_weather_3h = df_weather[df_weather['time'].dt.hour % 3 == 0].copy()
df_weather_3h['time'] = df_weather_3h['time'].dt.strftime('%Y-%m-%d %-H:00')

# Format weather CSV with 3-line Open-Meteo metadata header
weather_header = """latitude,longitude,elevation,utc_offset_seconds,timezone,timezone_abbreviation,,,
21,105.80002,14,25200,Asia/Bangkok,GMT+7,,,
,,,,,,,,
time,temperature_2m (°C),dew_point_2m (°C),relative_humidity_2m (%),rain (mm),precipitation (mm),surface_pressure (hPa),wind_speed_10m (km/h)
"""

weather_csv_path = "data/raw/hanoi_weather.csv"
with open(weather_csv_path, "w", encoding="utf-8") as f:
    f.write(weather_header)
    for _, row in df_weather_3h.iterrows():
        line = f"{row['time']},{row['temperature_2m']},{row['dew_point_2m']},{row['relative_humidity_2m']},{row['rain']},{row['precipitation']},{row['surface_pressure']},{row['wind_speed_10m']}\n"
        f.write(line)

print(f"Saved weather data to {weather_csv_path} with {len(df_weather_3h)} rows.")
