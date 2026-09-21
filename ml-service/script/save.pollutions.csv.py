import os
import pandas as pd
import numpy as np
import urllib.request
import json

print("Fetching full air quality data...")
url = (
    "https://air-quality-api.open-meteo.com/v1/air-quality?"
    "latitude=21.0&longitude=105.80002"
    "&start_date=2021-08-15&end_date=2026-08-16"
    "&hourly=pm10,pm2_5,carbon_monoxide,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_dioxide"
    "&timezone=Asia%2FBangkok"
)

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as response:
        aq_data = json.loads(response.read().decode())
    
    df_aq = pd.DataFrame(aq_data['hourly'])
    df_aq['time'] = pd.to_datetime(df_aq['time'])
    df_aq_3h = df_aq[df_aq['time'].dt.hour % 3 == 0].copy()
    df_aq_3h['time'] = df_aq_3h['time'].dt.strftime('%Y-%m-%d %-H:00')
    
    # Rename columns to match prompt format
    df_aq_3h = df_aq_3h.rename(columns={
        'carbon_monoxide': 'CO',
        'ozone': 'O3',
        'nitrogen_dioxide': 'NO2',
        'sulphur_dioxide': 'SO2',
        'carbon_dioxide': 'CO2'
    })
    
    # Write to data/raw/hanoi_pollutants.csv with 3-line header
    csv_header = """latitude,longitude,elevation,utc_offset_seconds,timezone,timezone_abbreviation,,,
21,105.80002,14,25200,Asia/Bangkok,GMT+7,,,
,,,,,,,,
time,pm10,pm2_5,CO,O3,NO2,SO2,CO2,
,,,,,,,,
"""
    with open("data/raw/hanoi_pollutants.csv", "w", encoding="utf-8") as f:
        f.write(csv_header)
        for _, row in df_aq_3h.iterrows():
            pm10_val = "" if pd.isna(row['pm10']) else f"{row['pm10']}"
            pm25_val = "" if pd.isna(row['pm2_5']) else f"{row['pm2_5']}"
            co_val = "" if pd.isna(row['CO']) else f"{row['CO']}"
            o3_val = "" if pd.isna(row['O3']) else f"{row['O3']}"
            no2_val = "" if pd.isna(row['NO2']) else f"{row['NO2']}"
            so2_val = "" if pd.isna(row['SO2']) else f"{row['SO2']}"
            co2_val = "" if pd.isna(row.get('CO2', np.nan)) else f"{row.get('CO2', '')}"
            
            f.write(f"{row['time']},{pm10_val},{pm25_val},{co_val},{o3_val},{no2_val},{so2_val},{co2_val},\n")
    
    print("Saved data/raw/hanoi_pollutants.csv successfully!")
    
    # Also save as excel as mentioned in Giai đoạn 1.1 (Đọc file Excel pollutant)
    df_excel = pd.read_csv("data/raw/hanoi_pollutants.csv", skiprows=3)
    df_excel.to_excel("data/raw/hanoi_pollutants.xlsx", index=False)
    print("Saved data/raw/hanoi_pollutants.xlsx successfully!")
except Exception as e:
    import traceback
    print("Error fetching air quality:", e)
    traceback.print_exc()
