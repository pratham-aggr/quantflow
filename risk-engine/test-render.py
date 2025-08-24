#!/usr/bin/env python3
"""
Test script to check if yfinance is working on Render deployment
"""

import yfinance as yf
import pandas as pd
import numpy as np
import requests
import time

def test_render_deployment():
    """Test if the app is working on Render"""
    
    print("Testing Render deployment...")
    print("=" * 50)
    
    # Test basic yfinance functionality
    test_symbols = ["AAPL", "MSFT", "GOOGL"]
    
    for symbol in test_symbols:
        print(f"\n=== Testing {symbol} ===")
        try:
            start_time = time.time()
            
            # Create ticker
            ticker = yf.Ticker(symbol)
            print(f"Created ticker for {symbol}")
            
            # Get basic info
            info = ticker.info
            print(f"Company name: {info.get('longName', 'N/A')}")
            
            # Get historical data
            hist = ticker.history(period="1mo")  # Just 1 month for faster testing
            print(f"Historical data points: {len(hist)}")
            
            if len(hist) > 0:
                print(f"Latest close: ${hist['Close'].iloc[-1]:.2f}")
                print(f"Time taken: {time.time() - start_time:.2f}s")
                
                # Calculate basic metrics
                returns = hist['Close'].pct_change().dropna()
                print(f"Mean return: {returns.mean():.6f}")
                print(f"Volatility: {returns.std():.6f}")
            else:
                print("No historical data available")
                
        except Exception as e:
            print(f"Error with {symbol}: {e}")
            print(f"Error type: {type(e).__name__}")

def test_external_requests():
    """Test external HTTP requests on Render"""
    
    print("\n=== Testing External Requests ===")
    
    try:
        # Test basic HTTP request
        response = requests.get('https://httpbin.org/get', timeout=10)
        if response.status_code == 200:
            print("✅ Basic HTTP requests work")
        else:
            print(f"❌ Basic HTTP request failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Basic HTTP request error: {e}")
    
    try:
        # Test Yahoo Finance access
        response = requests.get('https://finance.yahoo.com/quote/AAPL', timeout=10)
        if response.status_code == 200:
            print("✅ Yahoo Finance access works")
        else:
            print(f"❌ Yahoo Finance access failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Yahoo Finance access error: {e}")

if __name__ == "__main__":
    test_render_deployment()
    test_external_requests()
    print("\n🎉 Render deployment test completed!")
