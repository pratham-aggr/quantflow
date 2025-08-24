#!/usr/bin/env python3
"""
Test different date ranges on Railway to identify the yfinance issue
"""
import yfinance as yf
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_period(period, description):
    """Test a specific period"""
    try:
        print(f"Testing {description} ({period})...")
        data = yf.download("AAPL", period=period)
        
        if len(data) > 0:
            print(f"✅ SUCCESS! {description} - {len(data)} rows")
            print(f"   Date range: {data.index[0]} to {data.index[-1]}")
            return True
        else:
            print(f"❌ FAILED: {description} - No data")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {description} - {str(e)}")
        return False

def main():
    print("🔍 Testing different date ranges on Railway...")
    print("=" * 50)
    
    # Test various periods from shortest to longest
    periods = [
        ("1d", "1 Day"),
        ("5d", "5 Days"), 
        ("1mo", "1 Month"),
        ("3mo", "3 Months"),
        ("6mo", "6 Months"),
        ("1y", "1 Year"),
        ("2y", "2 Years")
    ]
    
    results = {}
    for period, description in periods:
        results[period] = test_period(period, description)
        print()
    
    print("📊 SUMMARY:")
    print("=" * 30)
    working_periods = [p for p, desc in periods if results[p]]
    failing_periods = [p for p, desc in periods if not results[p]]
    
    if working_periods:
        print(f"✅ Working periods: {', '.join(working_periods)}")
    if failing_periods:
        print(f"❌ Failing periods: {', '.join(failing_periods)}")
    
    if not any(results.values()):
        print("🚨 ALL PERIODS FAILED - This suggests a fundamental yfinance issue")
    elif not results["1y"]:
        print("🎯 1y period specifically fails - This is our issue!")
        print("💡 Solution: Use a shorter period like 6mo or 3mo")
    else:
        print("✅ All periods work - Issue must be elsewhere")

if __name__ == "__main__":
    main()
