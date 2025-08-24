#!/usr/bin/env python3
"""
Test script for improved yfinance handling on Render
"""

import requests
import time
import random
import yfinance as yf
from datetime import datetime, timedelta

def test_yfinance_methods(symbol):
    """Test different yfinance methods"""
    print(f"\n=== Testing {symbol} ===")
    
    # Method 1: Ticker without custom session
    try:
        print("Method 1: Ticker without custom session")
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1mo")
        if len(hist) > 0:
            print(f"✅ SUCCESS: {len(hist)} data points")
            print(f"   Latest close: ${hist['Close'].iloc[-1]:.2f}")
            return True
        else:
            print("❌ FAILED: No data")
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
    
    # Method 2: Download function
    try:
        print("Method 2: Download function")
        hist = yf.download(symbol, period="1mo")
        if len(hist) > 0:
            print(f"✅ SUCCESS: {len(hist)} data points")
            print(f"   Latest close: ${hist['Close'].iloc[-1]:.2f}")
            return True
        else:
            print("❌ FAILED: No data")
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
    
    # Method 3: Date range
    try:
        print("Method 3: Date range")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        hist = yf.download(symbol, start=start_date, end=end_date)
        if len(hist) > 0:
            print(f"✅ SUCCESS: {len(hist)} data points")
            print(f"   Latest close: ${hist['Close'].iloc[-1]:.2f}")
            return True
        else:
            print("❌ FAILED: No data")
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
    
    return False

def test_external_requests():
    """Test external HTTP requests"""
    print("\n=== Testing External Requests ===")
    
    # Test basic HTTP
    try:
        response = requests.get('https://httpbin.org/get', timeout=10)
        if response.status_code == 200:
            print("✅ Basic HTTP requests work")
        else:
            print(f"❌ Basic HTTP failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Basic HTTP error: {e}")
    
    # Test Yahoo Finance direct
    try:
        response = requests.get('https://finance.yahoo.com/quote/AAPL', timeout=10)
        if response.status_code == 200:
            print("✅ Yahoo Finance direct access works")
        else:
            print(f"❌ Yahoo Finance direct failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Yahoo Finance direct error: {e}")

def main():
    print("🧪 Testing Improved yfinance Handling")
    print("=" * 50)
    
    # Test external requests first
    test_external_requests()
    
    # Test yfinance with different symbols
    symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
    
    success_count = 0
    for symbol in symbols:
        if test_yfinance_methods(symbol):
            success_count += 1
        time.sleep(random.uniform(1, 3))  # Random delay between requests
    
    print(f"\n📊 SUMMARY:")
    print(f"Success rate: {success_count}/{len(symbols)} symbols")
    
    if success_count == 0:
        print("🚨 All yfinance methods failed - Render may be blocking requests")
    elif success_count < len(symbols):
        print("⚠️ Partial success - some symbols work, others don't")
    else:
        print("✅ All symbols working - yfinance is functioning properly")

if __name__ == "__main__":
    main()
