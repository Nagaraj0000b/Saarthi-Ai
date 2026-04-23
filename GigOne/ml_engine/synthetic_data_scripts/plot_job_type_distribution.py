import os

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


DATA_PATH = "ml_engine/data/gig_workers_50k_final_output.csv"
OUTPUT_PATH = "ml_engine/job_type_distribution.png"


def main() -> None:
    df = pd.read_csv(DATA_PATH)

    if "job_type" not in df.columns:
        raise ValueError("Column 'job_type' not found in dataset.")

    counts = df["job_type"].fillna("Unknown").value_counts()
    percentages = (counts / counts.sum() * 100).round(2)

    plot_df = (
        pd.DataFrame(
            {
                "job_type": counts.index,
                "count": counts.values,
                "percentage": percentages.values,
            }
        )
        .sort_values("count", ascending=True)
        .reset_index(drop=True)
    )

    sns.set_style("whitegrid")
    figure_height = max(8, len(plot_df) * 0.35)
    plt.figure(figsize=(14, figure_height))

    ax = sns.barplot(
        data=plot_df,
        x="count",
        y="job_type",
        hue="job_type",
        palette="viridis",
        legend=False,
    )

    for index, (count, pct) in enumerate(zip(plot_df["count"], plot_df["percentage"])):
        ax.text(count + (counts.max() * 0.01), index, f"{pct:.1f}% ({count:,})", va="center")

    plt.title("Distribution of Job Types in Final Dataset", fontsize=16)
    plt.xlabel("Number of Records", fontsize=12)
    plt.ylabel("Job Type (Class)", fontsize=12)
    plt.tight_layout()

    output_path = os.path.join(os.getcwd(), OUTPUT_PATH)
    plt.savefig(output_path, dpi=300)

    print(f"Created plot at: {output_path}")
    print("\nJob type class distribution:")
    print(pd.DataFrame({"count": counts, "percentage": percentages}))


if __name__ == "__main__":
    main()
