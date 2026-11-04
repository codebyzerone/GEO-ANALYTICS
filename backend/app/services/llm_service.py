import os

import ollama

# Ollama model used for every call. Override with OLLAMA_MODEL; never hardcode a model path at a call site.
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:1b")


def query_gemma_precise(prompt: str) -> str:
    try:
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": "Be precise and factual. List only established, well-known options."},
                {"role": "user", "content": prompt}
            ]
        )
        return response["message"]["content"]
    except Exception as e:
        return f"ERROR: {str(e)}"


def query_gemma_creative(prompt: str) -> str:
    try:
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": "Be comprehensive and exploratory. Include emerging and lesser known options too."},
                {"role": "user", "content": prompt}
            ]
        )
        return response["message"]["content"]
    except Exception as e:
        return f"ERROR: {str(e)}"


def query_all_llms(prompt: str) -> dict:
    print(f"\nQuerying: '{prompt[:60]}...'")
    results = {
        "prompt": prompt,
        "responses": {
            "gemma_precise": query_gemma_precise(prompt),
            "gemma_creative": query_gemma_creative(prompt)
        }
    }
    print("Both responses received.")
    return results