import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Load the dataset
df = pd.read_csv('ml_engine/data/indian_context_history.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['hour'] = df['timestamp'].dt.hour

# Set up the visualization
plt.figure(figsize=(15, 8))

# Create a boxplot to show the distribution of traffic congestion for each of the 24 hours
sns.boxplot(x='hour', y='congestion_percent', data=df, palette='viridis')

# Add a line plot for the mean to make the trend even clearer
means = df.groupby('hour')['congestion_percent'].mean()
plt.plot(means.index, means.values, color='red', marker='o', linewidth=2, label='Average Congestion')

# Formatting
plt.title('Traffic Congestion Distribution by Hour of Day (24 Hours)', fontsize=16)
plt.xlabel('Hour of Day (0 = Midnight, 23 = 11 PM)', fontsize=12)
plt.ylabel('Congestion Delay Percentage (%)', fontsize=12)
plt.xticks(range(0, 24))
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.legend()

# Add background shading to highlight rush hours
plt.axvspan(8, 10, color='red', alpha=0.1, label='Morning Rush')
plt.axvspan(18, 20, color='red', alpha=0.1, label='Evening Rush')

plt.tight_layout()

# Save the plot
output_path = os.path.join(os.getcwd(), 'ml_engine', 'hourly_traffic_distribution.png')
plt.savefig(output_path)
print(f"✅ Successfully created 24-hour visualization at: {output_path}")
