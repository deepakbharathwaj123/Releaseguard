import os
from fastapi import FastAPI, HTTPException

app = FastAPI(title="Payment & Customer Web API")

# BUG / VULNERABILITY 1: Hardcoded AWS API Key committed to code
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE99"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# VULNERABILITY 2: Leaked 3rd-party Payment Token
STRIPE_SECRET_KEY = "sk_live_51NzT4EXAMPLE928374928374928374"

@app.get("/")
def health_check():
    return {"status": "ok", "service": "web-api"}

@app.post("/api/v1/charge")
def charge_customer(amount: int):
    # Calling stripe using hardcoded key
    return {"status": "success", "amount": amount, "charged_with": STRIPE_SECRET_KEY[:8] + "..."}
