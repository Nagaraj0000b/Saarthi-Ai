import argparse
import os
import time
from datetime import datetime

import numpy as np
import pandas as pd
import requests


DOMAINS = {
    "Web_Freelance": ["Upwork", "Toptal", "Turing", "Freelancer"],
    "Web_Creative": ["Fiverr", "Upwork", "Pepper Content", "Canva Creators"],
    "Web_Microtasks": ["Amazon MTurk", "SquadStack", "Clickworker", "Toloka"],
    "Web_Admin": ["Wishup", "Fiverr", "Upwork", "Belay"],
    "Location_Transport_Ride": ["Ola", "Uber", "Rapido", "BluSmart", "Namma Yatri"],
    "Location_Transport_Delivery": ["Zomato", "Swiggy", "Zepto", "Blinkit", "Porter", "Shadowfax"],
    "Location_Home_Services": ["Urban Company", "NoBroker"],
    "Location_Personal_Care": ["Urban Company", "YesMadam"],
    "Location_Education": ["Unacademy", "UrbanPro", "Vedantu"],
}

STATE_PROBS = {
    "ask_platform": 0.22,
    "ask_earnings": 0.16,
    "ask_hours": 0.16,
    "complete": 0.24,
    "retry_platform": 0.07,
    "retry_earnings": 0.07,
    "retry_hours": 0.08,
}

SYSTEM_PROMPT = """You are Saarthi, a supportive chatbot for Indian gig workers.
Rules:
1) Output only one assistant reply.
2) Keep it concise: 1-2 sentences, max 40 words.
3) Friendly and practical tone. Hinglish is okay, but keep it simple.
4) No emojis, no hashtags, no bullet points.
5) Follow the requested conversation state exactly.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate 10k chatbot response rows using local LLM.")
    parser.add_argument(
        "--input",
        default="ml_engine/data/gig_workers_50k_final_output.csv",
        help="Input CSV with worker context.",
    )
    parser.add_argument(
        "--output",
        default="ml_engine/data/chatbot_local_llm_responses_10k.csv",
        help="Output CSV path.",
    )
    parser.add_argument("--rows", type=int, default=10000, help="Number of rows to generate.")
    parser.add_argument("--chunk-size", type=int, default=200, help="Rows per checkpoint write.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility.")
    parser.add_argument(
        "--model",
        default=os.environ.get("OLLAMA_MODEL", "llama3.1:8b-instruct"),
        help="Local model name served by Ollama.",
    )
    parser.add_argument(
        "--ollama-url",
        default=os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434"),
        help="Base URL for local Ollama server.",
    )
    parser.add_argument("--temperature", type=float, default=0.7, help="Sampling temperature.")
    parser.add_argument("--max-tokens", type=int, default=90, help="Max tokens per reply.")
    parser.add_argument("--timeout", type=int, default=120, help="HTTP timeout in seconds.")
    return parser.parse_args()


def check_input_columns(df: pd.DataFrame) -> None:
    required = [
        "user_id",
        "domain",
        "job_type",
        "platform",
        "generated_voice",
        "moodLabel",
        "moodScore",
        "weather_condition",
        "traffic_level",
    ]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")


def normalize_text(text: str) -> str:
    return str(text).replace("\n", " ").replace("\r", " ").strip()


def build_user_prompt(
    row: pd.Series,
    state: str,
    earnings_inr: int,
    hours_worked: float,
    platform_options: list[str],
) -> str:
    state_instruction = {
        "ask_platform": "Acknowledge mood and ask which platform the user worked on today.",
        "ask_earnings": "Acknowledge selected platform and ask earnings in INR.",
        "ask_hours": "Acknowledge earnings and ask how many hours were worked.",
        "complete": "Give final summary using mood, platform, earnings, hours, weather and traffic. End with one short encouragement.",
        "retry_platform": "Politely ask user to repeat the platform name clearly.",
        "retry_earnings": "Politely ask user to repeat earnings with a numeric amount in INR.",
        "retry_hours": "Politely ask user to repeat hours worked with a numeric value.",
    }[state]

    return (
        f"Conversation state: {state}\n"
        f"Instruction: {state_instruction}\n"
        f"User message: {normalize_text(row['generated_voice'])}\n"
        f"Worker context: job_type={row['job_type']}, domain={row['domain']}, mood={row['moodLabel']}, moodScore={row['moodScore']}\n"
        f"Known platform: {row['platform']}\n"
        f"Platform options: {', '.join(platform_options)}\n"
        f"Extracted earnings INR: {earnings_inr}\n"
        f"Extracted hours: {hours_worked}\n"
        f"Next-shift weather: {row['weather_condition']}\n"
        f"Next-shift traffic: {row['traffic_level']}\n"
        "Generate the assistant reply now."
    )


def call_ollama(
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
    timeout: int,
    retries: int = 3,
) -> str:
    endpoint = base_url.rstrip("/") + "/api/generate"
    payload = {
        "model": model,
        "system": system_prompt,
        "prompt": user_prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    for attempt in range(1, retries + 1):
        try:
            response = requests.post(endpoint, json=payload, timeout=timeout)
            response.raise_for_status()
            text = response.json().get("response", "").strip()
            if text:
                return normalize_text(text)
        except Exception:
            if attempt == retries:
                break
            time.sleep(1.2 * attempt)

    return "Got it. Please share a bit more detail so I can help accurately."


def estimate_earnings_and_hours(df: pd.DataFrame, seed: int) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    base_rate = {
        "Web_Freelance": 700,
        "Web_Creative": 450,
        "Web_Admin": 320,
        "Web_Microtasks": 120,
        "Location_Transport_Ride": 180,
        "Location_Transport_Delivery": 160,
        "Location_Home_Services": 380,
        "Location_Personal_Care": 420,
        "Location_Education": 500,
    }
    hours = rng.uniform(1.0, 11.0, size=len(df)).round(1)
    rates = np.array([base_rate.get(domain, 250) for domain in df["domain"]])
    noise = rng.uniform(0.7, 1.4, size=len(df))
    earnings = np.maximum(80, (rates * hours * noise).astype(int))
    return earnings, hours


def main() -> None:
    args = parse_args()
    print("Loading source dataset...")
    source_df = pd.read_csv(args.input)
    check_input_columns(source_df)

    if len(source_df) < args.rows:
        sampled_df = source_df.sample(n=args.rows, replace=True, random_state=args.seed).reset_index(drop=True)
    else:
        sampled_df = source_df.sample(n=args.rows, replace=False, random_state=args.seed).reset_index(drop=True)

    rng = np.random.default_rng(args.seed)
    states = np.array(list(STATE_PROBS.keys()))
    probs = np.array(list(STATE_PROBS.values()))
    sampled_df["chat_state"] = rng.choice(states, size=args.rows, p=probs)

    earnings_arr, hours_arr = estimate_earnings_and_hours(sampled_df, seed=args.seed + 7)

    start_idx = 0
    file_exists = os.path.exists(args.output)
    if file_exists:
        existing = pd.read_csv(args.output)
        start_idx = len(existing)
        print(f"Resume mode: {start_idx} rows already present.")
        if start_idx >= args.rows:
            print(f"Done. Output already has {start_idx} rows at: {args.output}")
            return

    print(f"Generating chatbot replies with local model: {args.model}")
    print(f"Target rows: {args.rows} | Start index: {start_idx}")

    for chunk_start in range(start_idx, args.rows, args.chunk_size):
        chunk_end = min(chunk_start + args.chunk_size, args.rows)
        rows = []

        for i in range(chunk_start, chunk_end):
            row = sampled_df.iloc[i]
            platform_options = DOMAINS.get(row["domain"], [row["platform"]])
            user_prompt = build_user_prompt(
                row=row,
                state=str(row["chat_state"]),
                earnings_inr=int(earnings_arr[i]),
                hours_worked=float(hours_arr[i]),
                platform_options=platform_options,
            )

            bot_response = call_ollama(
                base_url=args.ollama_url,
                model=args.model,
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=args.temperature,
                max_tokens=args.max_tokens,
                timeout=args.timeout,
            )

            rows.append(
                {
                    "row_id": f"CHAT_{i + 1:05d}",
                    "source_user_id": row["user_id"],
                    "chat_state": row["chat_state"],
                    "domain": row["domain"],
                    "job_type": row["job_type"],
                    "platform": row["platform"],
                    "moodLabel": row["moodLabel"],
                    "moodScore": row["moodScore"],
                    "weather_condition": row["weather_condition"],
                    "traffic_level": row["traffic_level"],
                    "user_message": normalize_text(row["generated_voice"]),
                    "estimated_earnings_inr": int(earnings_arr[i]),
                    "estimated_hours_worked": float(hours_arr[i]),
                    "chatbot_response": bot_response,
                    "model_name": args.model,
                    "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
                }
            )

        chunk_df = pd.DataFrame(rows)
        chunk_df.to_csv(args.output, mode="a", index=False, header=not os.path.exists(args.output))
        print(f"Saved rows {chunk_start} to {chunk_end - 1} -> {args.output}")

    print("Dataset generation completed successfully.")
    print(f"Output file: {args.output}")


if __name__ == "__main__":
    main()
