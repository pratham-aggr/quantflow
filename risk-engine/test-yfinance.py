#!/usr/bin/env python3
"""
Test script to check if yfinance is working on the deployed environment
"""

import yfinance as yf
import pandas as pd
import numpy as np

def test_yfinance_access():
    """Test if yfinance can fetch data on the deployed environment"""
    
    test_symbols = ["AAPL", "MSFT", "GOOGL", "TSLA"]
    
    print("Testing yfinance access on deployed environment...")
    
    for symbol in test_symbols:
        print(f"\n=== Testing {symbol} ===")
        try:
            # Create ticker
            ticker = yf.Ticker(symbol)
            print(f"Created ticker for {symbol}")
            
            # Get info
            info = ticker.info
            print(f"Company name: {info.get('longName', 'N/A')}")
            print(f"Sector: {info.get('sector', 'N/A')}")
            
            # Get historical data
            hist = ticker.history(period="1y")
            print(f"Historical data points: {len(hist)}")
            
            if len(hist) > 0:
                print(f"Data columns: {list(hist.columns)}")
                print(f"Date range: {hist.index[0]} to {hist.index[-1]}")
                print(f"Latest close: ${hist['Close'].iloc[-1]:.2f}")
                
                # Calculate returns
                returns = hist['Close'].pct_change().dropna()
                print(f"Returns calculated: {len(returns)} points")
                print(f"Mean return: {returns.mean():.6f}")
                print(f"Volatility: {returns.std():.6f}")
            else:
                print("No historical data available")
                
        except Exception as e:
            print(f"Error with {symbol}: {e}")
            print(f"Error type: {type(e).__name__}")

def test_simple_calculation():
    """Test a simple calculation to see if basic functionality works"""
    
    print("\n=== Testing Simple Calculation ===")
    
    try:
        # Test with a simple stock
        ticker = yf.Ticker("AAPL")
        hist = ticker.history(period="30d")  # Just 30 days
        
        if len(hist) > 10:
            returns = hist['Close'].pct_change().dropna()
            mean_return = returns.mean()
            volatility = returns.std()
            
            print(f"Simple calculation successful:")
            print(f"  Mean return: {mean_return:.6f}")
            print(f"  Volatility: {volatility:.6f}")
            print(f"  Data points: {len(returns)}")
        else:
            print("Insufficient data for calculation")
            
    except Exception as e:
        print(f"Simple calculation failed: {e}")

if __name__ == "__main__":
    test_yfinance_access()
    test_simple_calculation()
