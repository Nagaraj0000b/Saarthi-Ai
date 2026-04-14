import pandas as pd
import numpy as np
import os
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans

# 1. Load the data
path = r'C:\Users\nagar\.cache\kagglehub\datasets\vishardmehta\delhi-traffic-travel-time-prediction-dataset\versions\2'
features_df = pd.read_csv(os.path.join(path, 'delhi_traffic_features.csv'))
target_df = pd.read_csv(os.path.join(path, 'delhi_traffic_target.csv'))

# Merge the datasets
df = pd.merge(features_df, target_df, on='Trip_ID')

# 2. Calculate "Base Duration" (Free Flow Time)
free_flow_speeds = df.groupby('road_type')['average_speed_kmph'].quantile(0.95).to_dict()

df['base_duration_mins'] = df.apply(
    lambda row: (row['distance_km'] / free_flow_speeds[row['road_type']]) * 60, 
    axis=1
)

# 3. Calculate Congestion Percentage
df['congestion_percent'] = ((df['travel_time_minutes'] - df['base_duration_mins']) / df['base_duration_mins']) * 100
df['congestion_percent'] = df['congestion_percent'].clip(lower=0)

# Filter outliers
df_clean = df[df['congestion_percent'] < 600].copy()

# 4. Apply K-Means Clustering (k=4 to match real-world data patterns: Low, Medium, High, Very High)
X = df_clean['congestion_percent'].values.reshape(-1, 1)
kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
df_clean['cluster'] = kmeans.fit_predict(X)

# 5. Analyze Clusters
cluster_centers = kmeans.cluster_centers_.flatten()
sorted_indices = np.argsort(cluster_centers)

label_map = {old_idx: new_idx for new_idx, old_idx in enumerate(sorted_indices)}
df_clean['traffic_level_numeric'] = df_clean['cluster'].map(label_map)

level_names = ['Clear', 'Moderate', 'Heavy', 'Severe']
boundaries = []

for i in range(4):
    cluster_data = df_clean[df_clean['traffic_level_numeric'] == i]['congestion_percent']
    boundaries.append({
        'Level': level_names[i],
        'Min': round(cluster_data.min(), 1),
        'Max': round(cluster_data.max(), 1),
        'Mean': round(cluster_data.mean(), 1)
    })

print("--- ML DISCOVERED TRAFFIC THRESHOLDS (4 CLUSTERS) ---")
for b in boundaries:
    print(f"{b['Level']:<10} | Min Delay: {b['Min']:>6}% | Max Delay: {b['Max']:>6}% | Avg Delay: {b['Mean']:>6}%")
print("-----------------------------------------------------")

# 6. Plotting
plt.figure(figsize=(10, 6))
colors = ['#2ecc71', '#f39c12', '#e67e22', '#e74c3c']

for i in range(4):
    cluster_points = df_clean[df_clean['traffic_level_numeric'] == i]['congestion_percent']
    y_jitter = np.random.normal(0, 0.1, size=len(cluster_points))
    plt.scatter(cluster_points, y_jitter, c=colors[i], label=level_names[i], alpha=0.5, s=10)

for i in range(3): # Draw 3 lines between the 4 clusters
    plt.axvline(x=boundaries[i]['Max'], color='black', linestyle='--', alpha=0.4)
    
plt.title('K-Means Clustering of Traffic Congestion (4 Levels - Indian Urban Data)')
plt.xlabel('Congestion Delay Percentage (%)')
plt.yticks([]) 
plt.legend()
plt.tight_layout()

plot_path = os.path.join(os.getcwd(), 'ml_engine', 'traffic_clusters_4.png')
plt.savefig(plot_path)
print(f"✅ 4-Cluster visualization saved to: {plot_path}")
