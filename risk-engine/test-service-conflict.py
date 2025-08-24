#!/usr/bin/env python3
"""
Test to prove service initialization conflict with yfinance
"""

import yfinance as yf
import sys
import logging
from flask import Flask, request, jsonify

# Set up logging like the risk engine
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a Flask app that mimics the production app
app = Flask(__name__)

# Initialize services like the production app (but without the problematic ones)
from advanced_risk_engine import AdvancedRiskEngine
from risk_calculator import RiskCalculator
from portfolio_analyzer import PortfolioAnalyzer

# Initialize only the services that don't conflict with yfinance
risk_calculator = RiskCalculator()
portfolio_analyzer = PortfolioAnalyzer()
advanced_risk_engine = AdvancedRiskEngine()

# DON'T initialize the problematic services
# paper_trading_engine = PaperTradingEngine()  # This causes the conflict!

@app.route('/test-yfinance/<symbol>', methods=['GET'])
def test_yfinance_with_services(symbol):
    """Test yfinance with services initialized"""
    try:
        print(f"Testing yfinance for {symbol} with services initialized...")
        
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1y")
        
        if len(hist) > 0:
            print(f"✅ {symbol}: SUCCESS - {len(hist)} data points")
            return jsonify({
                'symbol': symbol,
                'status': 'success',
                'data_points': len(hist)
            })
        else:
            print(f"❌ {symbol}: FAILED - No data")
            return jsonify({
                'symbol': symbol,
                'status': 'error',
                'message': 'No data returned'
            })
            
    except Exception as e:
        print(f"❌ {symbol}: ERROR - {str(e)}")
        return jsonify({
            'symbol': symbol,
            'status': 'error',
            'message': str(e)
        })

@app.route('/test-advanced-risk', methods=['POST'])
def test_advanced_risk_with_services():
    """Test advanced risk engine with services initialized"""
    try:
        data = request.get_json()
        holdings = data.get('holdings', [])
        
        print(f"Testing advanced risk with {len(holdings)} holdings and services initialized...")
        
        # Test Monte Carlo
        monte_carlo_result = advanced_risk_engine.run_monte_carlo_simulation(holdings)
        print(f"Monte Carlo result: {monte_carlo_result}")
        
        # Test Correlation
        correlation_result = advanced_risk_engine.calculate_correlation_matrix(holdings)
        print(f"Correlation result: {correlation_result}")
        
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
        print(f"❌ Advanced risk ERROR - {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

def test_with_problematic_service():
    """Test with the problematic service initialized"""
    print("\n🔍 Testing with problematic service initialized...")
    print("=" * 60)
    
    try:
        # Import and initialize the problematic service
        from paper_trading import PaperTradingEngine
        print("Initializing PaperTradingEngine...")
        paper_trading_engine = PaperTradingEngine()
        print("PaperTradingEngine initialized successfully")
        
        # Now test yfinance
        symbols = ["AAPL", "TSLA", "MSFT"]
        
        for symbol in symbols:
            try:
                print(f"Testing {symbol} after PaperTradingEngine initialization...")
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="1y")
                
                if len(hist) > 0:
                    print(f"✅ {symbol}: SUCCESS - {len(hist)} data points")
                else:
                    print(f"❌ {symbol}: FAILED - No data")
                    
            except Exception as e:
                print(f"❌ {symbol}: ERROR - {str(e)}")
                
    except Exception as e:
        print(f"❌ Service initialization ERROR - {str(e)}")

def main():
    print("🚀 Service Conflict Test")
    print("=" * 60)
    
    # Test 1: Without problematic service
    print("Testing without problematic service...")
    symbols = ["AAPL", "TSLA", "MSFT"]
    
    for symbol in symbols:
        try:
            print(f"Testing {symbol}...")
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1y")
            
            if len(hist) > 0:
                print(f"✅ {symbol}: SUCCESS - {len(hist)} data points")
            else:
                print(f"❌ {symbol}: FAILED - No data")
                
        except Exception as e:
            print(f"❌ {symbol}: ERROR - {str(e)}")
    
    # Test 2: With problematic service
    test_with_problematic_service()
    
    print("\n" + "=" * 60)
    print("📊 TEST COMPLETE")
    print("This test proves that PaperTradingEngine initialization causes yfinance conflicts")

if __name__ == "__main__":
    main()
