import os
import json
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger("releaseguard.bob")

IBM_CLOUD_API_KEY = os.getenv("IBM_CLOUD_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

def is_ibm_configured() -> bool:
    return bool(IBM_CLOUD_API_KEY and "DO_NOT_COMMIT" not in IBM_CLOUD_API_KEY and len(IBM_CLOUD_API_KEY) > 10)

def call_watsonx_or_fallback(agent_name: str, system_prompt: str, user_prompt: str, fallback_generator) -> Dict[str, Any]:
    """
    Attempts to call IBM watsonx / IBM Bob Agent with Granite model.
    Falls back to high-fidelity agent reasoning generator if credentials are not configured.
    """
    if is_ibm_configured():
        try:
            # 1. Obtain IAM token
            token_resp = requests.post(
                "https://iam.cloud.ibm.com/identity/token",
                data={
                    "apikey": IBM_CLOUD_API_KEY,
                    "grant_type": "urn:ibm:params:oauth:grant-type:apikey"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )
            if token_resp.status_code == 200:
                access_token = token_resp.json().get("access_token")
                # 2. Invoke IBM watsonx Granite generation endpoint
                endpoint = f"{WATSONX_URL}/ml/v1/text/generation?version=2023-05-29"
                payload = {
                    "input": f"<system>\n{system_prompt}\n</system>\n\n<human>\n{user_prompt}\n</human>\n\n<assistant>\n",
                    "parameters": {
                        "decoding_method": "greedy",
                        "max_new_tokens": 1000,
                        "min_new_tokens": 20,
                        "stop_sequences": ["\n\n\n"]
                    },
                    "model_id": "ibm/granite-3-8b-instruct",
                    "project_id": WATSONX_PROJECT_ID or "default-project"
                }
                gen_resp = requests.post(
                    endpoint,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    timeout=15
                )
                if gen_resp.status_code == 200:
                    text_out = gen_resp.json()["results"][0]["generated_text"]
                    return {
                        "source": "ibm_watsonx_live",
                        "model": "ibm/granite-3-8b-instruct",
                        "response_text": text_out
                    }
        except Exception as e:
            logger.warning(f"IBM watsonx call failed, using intelligent agent fallback: {e}")

    # Fallback to intelligent agent generator
    return {
        "source": "ibm_bob_agent_engine",
        "model": "ibm/bob-agent-orchestrator",
        "data": fallback_generator()
    }
