#!/usr/bin/env python3
"""
Test external HTTP requests on Railway to see if it's a general network issue
"""
import requests
import sys
import logging
import yfinance as yf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_basic_http():
    """Test basic HTTP requests"""
    try:
        print("Testing basic HTTP request to httpbin.org...")
        response = requests.get('https://httpbin.org/get', timeout=10)
        
        if response.status_code == 200:
            print("✅ Basic HTTP request SUCCESS")
            return True
        else:
            print(f"❌ Basic HTTP request FAILED - Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Basic HTTP request ERROR: {str(e)}")
        return False

def test_yahoo_finance_direct():
    """Test direct request to Yahoo Finance"""
    try:
        print("Testing direct request to Yahoo Finance...")
        # Try to access Yahoo Finance directly
        response = requests.get('https://finance.yahoo.com/quote/AAPL', timeout=10)
        
        if response.status_code == 200:
            print("✅ Direct Yahoo Finance request SUCCESS")
            return True
        else:
            print(f"❌ Direct Yahoo Finance request FAILED - Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Direct Yahoo Finance request ERROR: {str(e)}")
        return False

def test_yfinance_with_session():
    """Test yfinance with custom session"""
    try:
        print("Testing yfinance with custom session...")
        
        # Create a custom session with headers
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Test yfinance with custom session
        data = yf.download("AAPL", period="1d", session=session)
        
        if len(data) > 0:
            print("✅ yfinance with custom session SUCCESS")
            return True
        else:
            print("❌ yfinance with custom session FAILED - No data")
            return False
            
    except Exception as e:
        print(f"❌ yfinance with custom session ERROR: {str(e)}")
        return False

def test_yfinance_with_proxy():
    """Test yfinance with different approach"""
    try:
        print("Testing yfinance with different approach...")
        
        # Try using Ticker with different parameters
        ticker = yf.Ticker("AAPL")
        
        # Try different methods
        print("  - Trying info()...")
        info = ticker.info
        if info:
            print("    ✅ info() works")
        
        print("  - Trying history() with start/end dates...")
        from datetime import datetime, timedelta
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        hist = ticker.history(start=start_date, end=end_date)
        
        if len(hist) > 0:
            print(f"    ✅ history() with dates works - {len(hist)} rows")
            return True
        else:
            print("    ❌ history() with dates failed")
            return False
            
    except Exception as e:
        print(f"❌ yfinance with different approach ERROR: {str(e)}")
        return False

def main():
    print("🔍 Testing External HTTP Requests on Railway")
    print("=" * 50)
    
    tests = [
        ("Basic HTTP", test_basic_http),
        ("Yahoo Finance Direct", test_yahoo_finance_direct),
        ("yfinance with Session", test_yfinance_with_session),
        ("yfinance with Dates", test_yfinance_with_proxy)
    ]
    
    results = {}
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        results[test_name] = test_func()
    
    print("\n📊 SUMMARY:")
    print("=" * 30)
    for test_name, result in results.items():
        status = "✅ SUCCESS" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    # Analysis
    if not any(results.values()):
        print("\n🚨 ALL EXTERNAL REQUESTS FAILED")
        print("Railway appears to be blocking all external HTTP requests")
    elif results["Basic HTTP"] and not results["yfinance with Session"]:
        print("\n🎯 yfinance-specific issue")
        print("External requests work, but yfinance specifically fails")
    elif results["Basic HTTP"] and results["yfinance with Session"]:
        print("\n✅ External requests work")
        print("The issue might be with the default yfinance configuration")
    else:
        print("\n🔍 Mixed results - need further investigation")

if __name__ == "__main__":
    main()
