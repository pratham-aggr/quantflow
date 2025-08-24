#!/usr/bin/env python3
"""
Production app with Render-optimized yfinance handling
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import math
import os
import requests
from advanced_risk_engine import AdvancedRiskEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)

# CORS configuration for Render
CORS(app, origins=["*"])

# Initialize the essential service
advanced_risk_engine = AdvancedRiskEngine()

def convert_nan_to_null(obj):
    """Convert NaN values to null for JSON serialization"""
    if isinstance(obj, dict):
        return {k: convert_nan_to_null(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_nan_to_null(v) for v in obj]
    elif isinstance(obj, float) and (math.isnan(obj) or not math.isfinite(obj)):
        return None
    else:
        return obj

def test_yfinance_with_retry(symbol, max_retries=3):
    """Test yfinance with retry logic for Render"""
    for attempt in range(max_retries):
        try:
            import yfinance as yf
            
            print(f"🔄 Render: Testing yfinance for {symbol} (attempt {attempt + 1})")
            
            # Configure yfinance for Render
            ticker = yf.Ticker(symbol)
            
            # Use shorter period for faster testing
            hist = ticker.history(period="6mo")
            
            if len(hist) > 0:
                print(f"✅ Render: {symbol} SUCCESS - {len(hist)} data points")
                return {
                    'symbol': symbol,
                    'status': 'success',
                    'data_points': len(hist),
                    'latest_date': str(hist.index[-1]),
                    'attempt': attempt + 1
                }
            else:
                print(f"❌ Render: {symbol} FAILED - No data (attempt {attempt + 1})")
                if attempt < max_retries - 1:
                    import time
                    time.sleep(2)  # Wait before retry
                    continue
                else:
                    return {
                        'symbol': symbol,
                        'status': 'error',
                        'message': 'No data returned after all attempts',
                        'attempt': attempt + 1
                    }
                    
        except Exception as e:
            print(f"❌ Render: {symbol} ERROR - {str(e)} (attempt {attempt + 1})")
            if attempt < max_retries - 1:
                import time
                time.sleep(2)  # Wait before retry
                continue
            else:
                return {
                    'symbol': symbol,
                    'status': 'error',
                    'message': str(e),
                    'attempt': attempt + 1
                }
    
    return {
        'symbol': symbol,
        'status': 'error',
        'message': 'All retry attempts failed',
        'attempt': max_retries
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Render Risk Engine',
        'version': '1.0.0',
        'environment': os.environ.get('RENDER_ENVIRONMENT', 'development')
    })

@app.route('/test-yfinance/<symbol>', methods=['GET'])
def test_yfinance(symbol):
    """Test yfinance data fetching on Render"""
    result = test_yfinance_with_retry(symbol)
    return jsonify(result)

@app.route('/test-external-requests', methods=['GET'])
def test_external_requests():
    """Test external HTTP requests on Render"""
    print("🔍 Testing External HTTP Requests on Render")
    print("=" * 50)
    
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
            import yfinance as yf
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

    def test_yfinance_with_dates():
        """Test yfinance with different approach"""
        try:
            print("Testing yfinance with different approach...")
            
            # Try using Ticker with different parameters
            import yfinance as yf
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
    
    tests = [
        ("Basic HTTP", test_basic_http),
        ("Yahoo Finance Direct", test_yahoo_finance_direct),
        ("yfinance with Session", test_yfinance_with_session),
        ("yfinance with Dates", test_yfinance_with_dates)
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
        print("Render appears to be blocking all external HTTP requests")
    elif results["Basic HTTP"] and not results["yfinance with Session"]:
        print("\n🎯 yfinance-specific issue")
        print("External requests work, but yfinance specifically fails")
    elif results["Basic HTTP"] and results["yfinance with Session"]:
        print("\n✅ External requests work")
        print("The issue might be with the default yfinance configuration")
    else:
        print("\n🔍 Mixed results - need further investigation")
    
    return jsonify({
        'results': results,
        'summary': {
            'all_failed': not any(results.values()),
            'basic_http_works': results.get("Basic HTTP", False),
            'yfinance_works': results.get("yfinance with Session", False) or results.get("yfinance with Dates", False)
        }
    })

@app.route('/api/risk/advanced', methods=['POST'])
def generate_advanced_risk_report():
    """Generate advanced risk report with minimal services"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        risk_tolerance = data.get('risk_tolerance', 'moderate')
        
        print(f"Render: Received request for {len(holdings)} holdings")
        
        # Generate risk report using only the essential service
        risk_report = advanced_risk_engine.generate_risk_report(holdings, risk_tolerance)
        
        print(f"Render: Generated risk report successfully")
        
        # Convert NaN values to null for JSON serialization
        risk_report = convert_nan_to_null(risk_report)
        
        return jsonify(risk_report)
        
    except Exception as e:
        print(f"❌ Render: ERROR - {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
