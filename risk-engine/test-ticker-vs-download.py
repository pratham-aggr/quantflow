#!/usr/bin/env python3
"""
Test yf.download() vs yf.Ticker().history() on Railway
"""
import yfinance as yf
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_download_method():
    """Test yf.download() method"""
    try:
        print("Testing yf.download('AAPL', period='1y')...")
        data = yf.download("AAPL", period="1y")
        
        if len(data) > 0:
            print(f"✅ yf.download() SUCCESS - {len(data)} rows")
            print(f"   Date range: {data.index[0]} to {data.index[-1]}")
            return True
        else:
            print(f"❌ yf.download() FAILED - No data")
            return False
            
    except Exception as e:
        print(f"❌ yf.download() ERROR - {str(e)}")
        return False

def test_ticker_method():
    """Test yf.Ticker().history() method"""
    try:
        print("Testing yf.Ticker('AAPL').history(period='1y')...")
        ticker = yf.Ticker("AAPL")
        data = ticker.history(period="1y")
        
        if len(data) > 0:
            print(f"✅ yf.Ticker().history() SUCCESS - {len(data)} rows")
            print(f"   Date range: {data.index[0]} to {data.index[-1]}")
            return True
        else:
            print(f"❌ yf.Ticker().history() FAILED - No data")
            return False
            
    except Exception as e:
        print(f"❌ yf.Ticker().history() ERROR - {str(e)}")
        return False

def main():
    print("🔍 Testing yf.download() vs yf.Ticker().history() on Railway...")
    print("=" * 60)
    
    download_success = test_download_method()
    print()
    ticker_success = test_ticker_method()
    
    print("\n📊 COMPARISON:")
    print("=" * 30)
    print(f"yf.download(): {'✅ SUCCESS' if download_success else '❌ FAILED'}")
    print(f"yf.Ticker().history(): {'✅ SUCCESS' if ticker_success else '❌ FAILED'}")
    
    if download_success and not ticker_success:
        print("\n🎯 FOUND THE ISSUE!")
        print("yf.download() works but yf.Ticker().history() fails")
        print("This explains why the Flask app fails - it uses Ticker().history()")
    elif not download_success and ticker_success:
        print("\n🎯 FOUND THE ISSUE!")
        print("yf.Ticker().history() works but yf.download() fails")
    elif download_success and ticker_success:
        print("\n✅ Both methods work - Issue must be elsewhere")
    else:
        print("\n🚨 Both methods fail - Fundamental yfinance issue")

if __name__ == "__main__":
    main()
