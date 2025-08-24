#!/usr/bin/env python3
"""
Minimal production app to test service initialization issue
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import math
from advanced_risk_engine import AdvancedRiskEngine
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)

# Minimal CORS configuration
CORS(app, origins=["*"])

# Initialize ONLY the essential service
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

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Minimal Risk Engine',
        'version': '1.0.0'
    })

@app.route('/test-yfinance/<symbol>', methods=['GET'])
def test_yfinance(symbol):
    """Test yfinance data fetching"""
    try:
        import yfinance as yf
        
        print(f"Minimal app: Testing yfinance for {symbol}")
        
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1y")
        
        if len(hist) > 0:
            print(f"✅ Minimal app: {symbol} SUCCESS - {len(hist)} data points")
            return jsonify({
                'symbol': symbol,
                'status': 'success',
                'data_points': len(hist)
            })
        else:
            print(f"❌ Minimal app: {symbol} FAILED - No data")
            return jsonify({
                'symbol': symbol,
                'status': 'error',
                'message': 'No data returned'
            })
            
    except Exception as e:
        print(f"❌ Minimal app: {symbol} ERROR - {str(e)}")
        return jsonify({
            'symbol': symbol,
            'status': 'error',
            'message': str(e)
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
        
        print(f"Minimal app: Received request for {len(holdings)} holdings")
        
        # Generate risk report using only the essential service
        risk_report = advanced_risk_engine.generate_risk_report(holdings, risk_tolerance)
        
        print(f"Minimal app: Generated risk report successfully")
        
        # Convert NaN values to null for JSON serialization
        risk_report = convert_nan_to_null(risk_report)
        
        return jsonify(risk_report)
        
    except Exception as e:
        print(f"❌ Minimal app: ERROR - {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
