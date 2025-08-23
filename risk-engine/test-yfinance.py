#!/usr/bin/env python3
import yfinance as yf
import time

def test_yfinance():
    symbols = ['AAPL', 'MSFT', 'AMZN']
    
    for symbol in symbols:
        print(f"Testing {symbol}...")
        start_time = time.time()
        
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period="1mo")  # Just 1 month for faster testing
            
            if data.empty:
                print(f"  ❌ No data for {symbol}")
            else:
                print(f"  ✅ Got {len(data)} data points for {symbol}")
                print(f"  📊 Latest price: ${data['Close'].iloc[-1]:.2f}")
                print(f"  ⏱️  Time taken: {time.time() - start_time:.2f}s")
                
        except Exception as e:
            print(f"  ❌ Error fetching {symbol}: {e}")
            print(f"  ⏱️  Time taken: {time.time() - start_time:.2f}s")

if __name__ == "__main__":
    print("Testing yfinance data fetching...")
    test_yfinance()
