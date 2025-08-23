#!/usr/bin/env python3
"""
Local Testing Script for QuantFlow Risk Engine
Tests all endpoints with real portfolio data
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5001"
TEST_PORTFOLIO = [
    {
        "symbol": "AAPL",
        "quantity": 100,
        "avg_price": 150.0,
        "current_price": 175.0,
        "sector": "Technology"
    },
    {
        "symbol": "MSFT", 
        "quantity": 50,
        "avg_price": 280.0,
        "current_price": 320.0,
        "sector": "Technology"
    },
    {
        "symbol": "GOOGL",
        "quantity": 25,
        "avg_price": 2500.0,
        "current_price": 2750.0,
        "sector": "Technology"
    }
]

def test_health_check():
    """Test the health check endpoint"""
    print("🏥 Testing Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Health Check: {data}")
            return True
        else:
            print(f"  ❌ Health Check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Health Check error: {e}")
        return False

def test_advanced_risk_report():
    """Test the advanced risk report endpoint"""
    print("\n📊 Testing Advanced Risk Report...")
    try:
        payload = {
            "holdings": TEST_PORTFOLIO,
            "risk_tolerance": "moderate",
            "include_monte_carlo": True,
            "include_correlation": True,
            "include_sector_analysis": True,
            "include_ml_prediction": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/risk/advanced",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Advanced Risk Report generated successfully")
            print(f"  📈 Risk Score: {data.get('summary', {}).get('risk_score', 'N/A')}")
            print(f"  📊 Volatility: {data.get('summary', {}).get('portfolio_volatility', 'N/A')}")
            print(f"  📋 Recommendations: {len(data.get('recommendations', []))}")
            return True
        else:
            print(f"  ❌ Advanced Risk Report failed: {response.status_code}")
            print(f"  📄 Response: {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ Advanced Risk Report error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 QuantFlow Risk Engine - Local Testing")
    print("=" * 50)
    print(f"📍 Testing against: {BASE_URL}")
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test results
    results = []
    
    # Run tests
    results.append(("Health Check", test_health_check()))
    results.append(("Advanced Risk Report", test_advanced_risk_report()))
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Risk engine is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the logs above for details.")
    
    print(f"\n⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
