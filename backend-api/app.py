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
import time
import random
import yfinance as yf
from advanced_risk_engine import AdvancedRiskEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)

# CORS configuration for production
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "https://quantflow.vercel.app",
    "https://quantflow-git-main-pratham-aggr.vercel.app",
    "https://quantflow-pratham-aggr.vercel.app"
]

# Add environment variable for additional origins
if os.environ.get('FRONTEND_URL'):
    allowed_origins.append(os.environ.get('FRONTEND_URL'))

CORS(app, origins=allowed_origins, supports_credentials=True)

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

def create_yfinance_session():
    """Create a custom session for yfinance with proper headers"""
    session = requests.Session()
    
    # Rotate User-Agents to avoid detection
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    ]
    
    session.headers.update({
        'User-Agent': random.choice(user_agents),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    })
    
    return session



@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Render Risk Engine',
        'version': '1.0.0',
        'environment': os.environ.get('RENDER_ENVIRONMENT', 'development')
    })

# ========== MARKET DATA ENDPOINTS ==========

@app.route('/api/market-data/quote/<symbol>', methods=['GET'])
def get_stock_quote(symbol):
    """Get stock quote using yfinance"""
    try:
        symbol = symbol.upper()
        ticker = yf.Ticker(symbol)
        
        # Get current info
        info = ticker.info
        
        if not info or 'regularMarketPrice' not in info:
            return jsonify({'error': 'Stock data not found'}), 404
        
        quote = {
            'symbol': symbol,
            'price': info.get('regularMarketPrice', 0),
            'change': info.get('regularMarketChange', 0),
            'changePercent': info.get('regularMarketChangePercent', 0),
            'high': info.get('dayHigh', 0),
            'low': info.get('dayLow', 0),
            'open': info.get('regularMarketOpen', 0),
            'previousClose': info.get('regularMarketPreviousClose', 0),
            'volume': info.get('volume', 0),
            'timestamp': int(time.time() * 1000)
        }
        
        return jsonify(quote)
    except Exception as e:
        logging.error(f"Error fetching quote for {symbol}: {str(e)}")
        return jsonify({'error': 'Failed to fetch stock data'}), 500

@app.route('/api/market-data/quotes', methods=['GET'])
def get_multiple_quotes():
    """Get multiple stock quotes"""
    try:
        symbols = request.args.get('symbols', '')
        if not symbols:
            return jsonify({'error': 'Symbols parameter required'}), 400
        
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        results = {}
        
        for symbol in symbol_list:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                if info and 'regularMarketPrice' in info:
                    results[symbol] = {
                        'symbol': symbol,
                        'price': info.get('regularMarketPrice', 0),
                        'change': info.get('regularMarketChange', 0),
                        'changePercent': info.get('regularMarketChangePercent', 0),
                        'high': info.get('dayHigh', 0),
                        'low': info.get('dayLow', 0),
                        'open': info.get('regularMarketOpen', 0),
                        'previousClose': info.get('regularMarketPreviousClose', 0),
                        'volume': info.get('volume', 0),
                        'timestamp': int(time.time() * 1000)
                    }
                else:
                    results[symbol] = {'error': 'Stock data not found'}
            except Exception as e:
                logging.error(f"Error fetching quote for {symbol}: {str(e)}")
                results[symbol] = {'error': str(e)}
        
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error fetching multiple quotes: {str(e)}")
        return jsonify({'error': 'Failed to fetch stock data'}), 500

@app.route('/api/market-data/search', methods=['GET'])
def search_stocks():
    """Search stocks using yfinance"""
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({'error': 'Query parameter required'}), 400
        
        # Use yfinance to search
        tickers = yf.Tickers(query)
        
        # Get basic info for each ticker
        results = []
        for ticker in tickers.tickers[:10]:  # Limit to 10 results
            try:
                info = ticker.info
                if info and 'shortName' in info:
                    results.append({
                        'symbol': ticker.ticker,
                        'name': info.get('shortName', ''),
                        'type': 'stock',
                        'primaryExchange': info.get('exchange', '')
                    })
            except:
                continue
        
        return jsonify({
            'query': query,
            'count': len(results),
            'results': results
        })
    except Exception as e:
        logging.error(f"Error searching stocks: {str(e)}")
        return jsonify({'error': 'Failed to search stocks'}), 500



@app.route('/api/risk/advanced', methods=['POST'])
def generate_advanced_risk_report():
    """Generate advanced risk report"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        risk_tolerance = data.get('risk_tolerance', 'moderate')
        
        print(f"Render: Received request for {len(holdings)} holdings")
        
        # Generate risk report with real data
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
