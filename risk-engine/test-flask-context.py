#!/usr/bin/env python3
"""
Test Flask context issue with yfinance
"""

import yfinance as yf
import sys
import logging
from flask import Flask, request, jsonify
import threading
import time

# Set up logging like the risk engine
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a minimal Flask app
app = Flask(__name__)

@app.route('/test-yfinance/<symbol>', methods=['GET'])
def test_yfinance_in_flask(symbol):
    """Test yfinance within Flask context"""
    try:
        print(f"Flask context: Testing yfinance for {symbol}")
        
        # Test yfinance in Flask context
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1y")
        
        if len(hist) > 0:
            print(f"✅ Flask context: {symbol} SUCCESS - {len(hist)} data points")
            return jsonify({
                'symbol': symbol,
                'status': 'success',
                'data_points': len(hist),
                'date_range': {
                    'start': hist.index[0].isoformat(),
                    'end': hist.index[-1].isoformat()
                }
            })
        else:
            print(f"❌ Flask context: {symbol} FAILED - No data")
            return jsonify({
                'symbol': symbol,
                'status': 'error',
                'message': 'No data returned'
            })
            
    except Exception as e:
        print(f"❌ Flask context: {symbol} ERROR - {str(e)}")
        return jsonify({
            'symbol': symbol,
            'status': 'error',
            'message': str(e)
        })

@app.route('/test-advanced-risk', methods=['POST'])
def test_advanced_risk_in_flask():
    """Test advanced risk engine within Flask context"""
    try:
        from advanced_risk_engine import AdvancedRiskEngine
        
        data = request.get_json()
        holdings = data.get('holdings', [])
        
        print(f"Flask context: Testing advanced risk with {len(holdings)} holdings")
        
        # Create risk engine in Flask context
        risk_engine = AdvancedRiskEngine()
        
        # Test Monte Carlo
        monte_carlo_result = risk_engine.run_monte_carlo_simulation(holdings)
        print(f"Flask context: Monte Carlo result - {monte_carlo_result}")
        
        # Test Correlation
        correlation_result = risk_engine.calculate_correlation_matrix(holdings)
        print(f"Flask context: Correlation result - {correlation_result}")
        
        return jsonify({
            'status': 'success',
            'monte_carlo': {
                'mean_return': monte_carlo_result.mean_return,
                'data_points': 'success'
            },
            'correlation': {
                'diversification_score': correlation_result.diversification_score,
                'data_points': 'success'
            }
        })
        
    except Exception as e:
        print(f"❌ Flask context: Advanced risk ERROR - {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

def run_flask_server():
    """Run Flask server in a separate thread"""
    app.run(host='0.0.0.0', port=5002, debug=False, use_reloader=False)

def test_flask_context():
    """Test yfinance in Flask context"""
    print("🔍 Testing yfinance in Flask context...")
    print("=" * 60)
    
    # Start Flask server in background
    flask_thread = threading.Thread(target=run_flask_server, daemon=True)
    flask_thread.start()
    
    # Wait for server to start
    time.sleep(3)
    
    import requests
    
    # Test yfinance endpoint
    symbols = ["AAPL", "TSLA", "MSFT"]
    
    for symbol in symbols:
        try:
            print(f"\nTesting {symbol} in Flask context...")
            response = requests.get(f"http://localhost:5002/test-yfinance/{symbol}")
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'success':
                    print(f"✅ {symbol}: SUCCESS - {data['data_points']} data points")
                else:
                    print(f"❌ {symbol}: FAILED - {data['message']}")
            else:
                print(f"❌ {symbol}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ {symbol}: ERROR - {str(e)}")
    
    # Test advanced risk endpoint
    holdings = [
        {
            'symbol': 'AAPL', 
            'quantity': 100, 
            'avg_price': 227.76, 
            'current_price': 227.76
        },
        {
            'symbol': 'TSLA', 
            'quantity': 100, 
            'avg_price': 340.01, 
            'current_price': 340.01
        },
        {
            'symbol': 'MSFT', 
            'quantity': 100, 
            'avg_price': 507.23, 
            'current_price': 507.23
        }
    ]
    
    try:
        print(f"\nTesting advanced risk in Flask context...")
        response = requests.post(
            "http://localhost:5002/test-advanced-risk",
            json={'holdings': holdings}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                print(f"✅ Advanced risk: SUCCESS")
            else:
                print(f"❌ Advanced risk: FAILED - {data['message']}")
        else:
            print(f"❌ Advanced risk: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Advanced risk: ERROR - {str(e)}")

def main():
    print("🚀 Flask Context Test")
    print("=" * 60)
    
    test_flask_context()
    
    print("\n" + "=" * 60)
    print("📊 TEST COMPLETE")

if __name__ == "__main__":
    main()
