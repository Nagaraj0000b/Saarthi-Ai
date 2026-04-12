import requests
import json
import time

# 1. DOUBLE CHECK THIS matches the latest Kaggle output!
NGROK_URL = "https://unsating-uncorruptedly-madeline.ngrok-free.dev"

def ask_gemma_safe(prompt):
    endpoint = f"{NGROK_URL}/api/chat"
    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" 
    }
    payload = {
        "model": "gemma4:26b",
        "messages": [{"role": "user", "content": prompt}],
        "stream": True
    }

    print(f"--- CONNECTING TO: {NGROK_URL} ---")
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
    ask_gemma_safe("Hi Tell me about your self .")