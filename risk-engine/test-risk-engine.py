#!/usr/bin/env python3
import requests
import json

# Test the risk engine with sample holdings
test_holdings = [
    {"symbol": "AAPL", "quantity": 100, "avg_price": 230.89},
    {"symbol": "MSFT", "quantity": 50, "avg_price": 517.10},
    {"symbol": "AMZN", "quantity": 100, "avg_price": 221.95}
]

test_data = {
    "holdings": test_holdings,
    "risk_tolerance": "moderate"
}

try:
    # Test health endpoint
    print("Testing health endpoint...")
    health_response = requests.get("http://localhost:5001/health")
    print(f"Health status: {health_response.status_code}")
    if health_response.status_code == 200:
        print(f"Health response: {health_response.json()}")
    
    # Test portfolio risk endpoint
    print("\nTesting portfolio risk endpoint...")
    risk_response = requests.post(
        "http://localhost:5001/api/risk/portfolio",
        headers={"Content-Type": "application/json"},
        data=json.dumps(test_data)
    )
    
    print(f"Risk API status: {risk_response.status_code}")
    if risk_response.status_code == 200:
        result = risk_response.json()
        print("Risk analysis result:")
        print(json.dumps(result, indent=2))
    else:
        print(f"Error response: {risk_response.text}")
        
except Exception as e:
    print(f"Error testing risk engine: {e}")
