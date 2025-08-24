#!/usr/bin/env python3
"""
Test yfinance within Flask context on Railway
"""
import yfinance as yf
import sys
import logging
from flask import Flask, jsonify
import threading
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

def test_yfinance_in_flask():
    """Test yfinance calls within Flask context"""
    try:
        print("Testing yfinance within Flask context...")
        
        # Test both methods
        print("1. Testing yf.download()...")
        data1 = yf.download("AAPL", period="1y")
        print(f"   yf.download() result: {len(data1)} rows")
        
        print("2. Testing yf.Ticker().history()...")
        ticker = yf.Ticker("AAPL")
        data2 = ticker.history(period="1y")
        print(f"   yf.Ticker().history() result: {len(data2)} rows")
        
        if len(data1) > 0 and len(data2) > 0:
            print("✅ Both methods work within Flask context")
            return True
        else:
            print("❌ One or both methods failed within Flask context")
            return False
            
    except Exception as e:
        print(f"❌ ERROR in Flask context: {str(e)}")
        return False

@app.route('/test-flask-yfinance', methods=['GET'])
def flask_yfinance_test():
    """Flask endpoint to test yfinance"""
    try:
        print("Flask endpoint: Testing yfinance...")
        
        # Test both methods
        print("1. Testing yf.download()...")
        data1 = yf.download("AAPL", period="1y")
        print(f"   yf.download() result: {len(data1)} rows")
        
        print("2. Testing yf.Ticker().history()...")
        ticker = yf.Ticker("AAPL")
        data2 = ticker.history(period="1y")
        print(f"   yf.Ticker().history() result: {len(data2)} rows")
        
        if len(data1) > 0 and len(data2) > 0:
            return jsonify({
                'status': 'success',
                'download_rows': len(data1),
                'ticker_rows': len(data2)
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'No data returned'
            })
            
    except Exception as e:
        print(f"❌ Flask endpoint ERROR: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

def run_flask_server():
    """Run Flask server in background"""
    app.run(host='0.0.0.0', port=5001, debug=False)

def main():
    print("🚀 Flask yfinance Test on Railway")
    print("=" * 50)
    
    # Test 1: Direct yfinance calls
    print("TEST 1: Direct yfinance calls")
    success1 = test_yfinance_in_flask()
    print()
    
    # Test 2: Flask endpoint
    print("TEST 2: Flask endpoint")
    print("Starting Flask server...")
    
    # Start Flask server in background
    flask_thread = threading.Thread(target=run_flask_server)
    flask_thread.daemon = True
    flask_thread.start()
    
    # Wait for server to start
    time.sleep(3)
    
    # Test the endpoint
    try:
        import requests
        response = requests.get('http://localhost:5001/test-flask-yfinance')
        result = response.json()
        
        if result['status'] == 'success':
            print("✅ Flask endpoint works")
            success2 = True
        else:
            print(f"❌ Flask endpoint failed: {result['message']}")
            success2 = False
            
    except Exception as e:
        print(f"❌ Error testing Flask endpoint: {str(e)}")
        success2 = False
    
    print("\n📊 SUMMARY:")
    print("=" * 30)
    print(f"Direct calls: {'✅ SUCCESS' if success1 else '❌ FAILED'}")
    print(f"Flask endpoint: {'✅ SUCCESS' if success2 else '❌ FAILED'}")
    
    if success1 and not success2:
        print("\n🎯 FOUND THE ISSUE!")
        print("yfinance works directly but fails in Flask endpoint")
    elif not success1 and success2:
        print("\n🎯 FOUND THE ISSUE!")
        print("Flask endpoint works but direct calls fail")
    elif success1 and success2:
        print("\n✅ Both work - Issue must be elsewhere")
    else:
        print("\n🚨 Both fail - Fundamental issue")

if __name__ == "__main__":
    main()
