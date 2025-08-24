#!/usr/bin/env python3
"""
Test script to check the deployed risk engine and understand the data access issues
"""

import requests
import json
import time

def test_deployed_risk_engine():
    """Test the deployed risk engine with detailed logging"""
    
    # Test data
    test_holdings = [
        {
            "symbol": "AAPL",
            "quantity": 10,
            "avg_price": 150,
            "current_price": 155,
            "market_value": 1550
        },
        {
            "symbol": "MSFT", 
            "quantity": 5,
            "avg_price": 300,
            "current_price": 310,
            "market_value": 1550
        }
    ]
    
    test_request = {
        "holdings": test_holdings,
        "risk_tolerance": "conservative",
        "include_monte_carlo": True,
        "include_correlation": True,
        "include_sector_analysis": True,
        "include_ml_prediction": True
    }
    
    print("Testing deployed risk engine...")
    print(f"Request data: {json.dumps(test_request, indent=2)}")
    
    try:
        # Make request to deployed risk engine
        response = requests.post(
            "https://quantflow-production.up.railway.app/api/risk/advanced",
            headers={"Content-Type": "application/json"},
            json=test_request,
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("Response received successfully!")
            print(f"Response data: {json.dumps(result, indent=2)}")
            
            # Analyze the response
            print("\n=== ANALYSIS ===")
            
            # Check Monte Carlo
            mc = result.get('monte_carlo_analysis', {})
            print(f"Monte Carlo - Mean Return: {mc.get('mean_return')}")
            print(f"Monte Carlo - Worst Case: {mc.get('worst_case')}")
            print(f"Monte Carlo - Best Case: {mc.get('best_case')}")
            
            # Check Correlation
            corr = result.get('correlation_analysis', {})
            print(f"Correlation - Diversification Score: {corr.get('diversification_score')}")
            print(f"Correlation - High Correlation Pairs: {len(corr.get('high_correlation_pairs', []))}")
            
            # Check ML Prediction
            ml = result.get('ml_prediction', {})
            print(f"ML - Predicted Volatility: {ml.get('predicted_volatility')}")
            print(f"ML - Confidence Interval: {ml.get('confidence_interval')}")
            
            # Check Summary
            summary = result.get('summary', {})
            print(f"Summary - Risk Level: {summary.get('risk_level')}")
            print(f"Summary - Portfolio Volatility: {summary.get('portfolio_volatility')}")
            
        else:
            print(f"Error response: {response.text}")
            
    except requests.exceptions.Timeout:
        print("Request timed out - the risk engine might be slow to respond")
    except requests.exceptions.ConnectionError:
        print("Connection error - the risk engine might be down")
    except Exception as e:
        print(f"Unexpected error: {e}")

def test_individual_endpoints():
    """Test individual endpoints to isolate the issue"""
    
    test_holdings = [
        {
            "symbol": "AAPL",
            "quantity": 10,
            "avg_price": 150,
            "current_price": 155
        }
    ]
    
    endpoints = [
        ("/api/risk/monte-carlo", {"holdings": test_holdings, "time_horizon": 252}),
        ("/api/risk/correlation", {"holdings": test_holdings}),
        ("/api/risk/sector-analysis", {"holdings": test_holdings}),
        ("/api/risk/ml-prediction", {"holdings": test_holdings})
    ]
    
    base_url = "https://quantflow-production.up.railway.app"
    
    for endpoint, data in endpoints:
        print(f"\n=== Testing {endpoint} ===")
        try:
            response = requests.post(
                f"{base_url}{endpoint}",
                headers={"Content-Type": "application/json"},
                json=data,
                timeout=15
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Result: {json.dumps(result, indent=2)}")
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")
        
        time.sleep(1)  # Small delay between requests

if __name__ == "__main__":
    print("=== DEPLOYED RISK ENGINE TEST ===")
    test_deployed_risk_engine()
    
    print("\n=== INDIVIDUAL ENDPOINT TEST ===")
    test_individual_endpoints()
