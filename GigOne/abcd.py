import requests
import json
import time
import sys

# 1. DOUBLE CHECK THIS matches the latest Kaggle output!
NGROK_URL = "https://unsating-uncorruptedly-madeline.ngrok-free.dev"

def ask_gemma_safe(prompt, ngrok_url):
    endpoint = f"{ngrok_url}/api/chat"
    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" 
    }
    payload = {
        "model": "gemma4:26b",
        "messages": [{"role": "user", "content": prompt}],
        "stream": True
    }

    print(f"--- CONNECTING TO: {ngrok_url} ---")
    print("(Waiting for Gemma to load weights... this can take 90+ seconds)")

    try:
        # timeout=(connect_timeout, read_timeout)
        with requests.post(endpoint, json=payload, headers=headers, stream=True, timeout=(15, 300)) as response:
            if response.status_code != 200:
                print(f"Server Error: {response.status_code}")
                return

            print("--- STARTING STREAM ---")
            for line in response.iter_lines():
                if line:
                    chunk = json.loads(line.decode('utf-8'))
                    if 'message' in chunk:
                        print(chunk['message']['content'], end='', flush=True)
                    if chunk.get('done'): break

    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Connection Reset. Is the ngrok URL still correct in Kaggle?")
    except requests.exceptions.Timeout:
        print("\n❌ Error: Timed out waiting for Gemma. She is taking too long to 'wake up'.")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ Error: Please provide the ngrok URL as a command-line argument.")
        print("   Usage: python abcd.py https://your-ngrok-url.ngrok-free.dev")
        sys.exit(1)

    NGROK_URL = sys.argv[1]
    ask_gemma_safe("Hi Tell me about your self .", NGROK_URL)