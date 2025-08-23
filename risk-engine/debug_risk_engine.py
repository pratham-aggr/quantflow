#!/usr/bin/env python3
"""
Debug script for the risk engine to identify issues
"""

import sys
import traceback

def test_imports():
    """Test all imports"""
    print("Testing imports...")
    
    try:
        from flask import Flask
        print("✅ Flask imported successfully")
    except Exception as e:
        print(f"❌ Flask import failed: {e}")
        return False
    
    try:
        from flask_cors import CORS
        print("✅ Flask-CORS imported successfully")
    except Exception as e:
        print(f"❌ Flask-CORS import failed: {e}")
        return False
    
    try:
        from dotenv import load_dotenv
        print("✅ python-dotenv imported successfully")
    except Exception as e:
        print(f"❌ python-dotenv import failed: {e}")
        return False
    
    try:
        from risk_calculator import RiskCalculator
        print("✅ RiskCalculator imported successfully")
    except Exception as e:
        print(f"❌ RiskCalculator import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        from portfolio_analyzer import PortfolioAnalyzer
        print("✅ PortfolioAnalyzer imported successfully")
    except Exception as e:
        print(f"❌ PortfolioAnalyzer import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        from rebalancing_engine import RebalancingEngine
        print("✅ RebalancingEngine imported successfully")
    except Exception as e:
        print(f"❌ RebalancingEngine import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        from advanced_risk_engine import AdvancedRiskEngine
        print("✅ AdvancedRiskEngine imported successfully")
    except Exception as e:
        print(f"❌ AdvancedRiskEngine import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        from tax_loss_harvesting import TaxLossHarvestingEngine
        print("✅ TaxLossHarvestingEngine imported successfully")
    except Exception as e:
        print(f"❌ TaxLossHarvestingEngine import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        from advanced_rebalancing import AdvancedRebalancingEngine
        print("✅ AdvancedRebalancingEngine imported successfully")
    except Exception as e:
        print(f"❌ AdvancedRebalancingEngine import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        from paper_trading import PaperTradingEngine
        print("✅ PaperTradingEngine imported successfully")
    except Exception as e:
        print(f"❌ PaperTradingEngine import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        from notification_engine import NotificationEngine
        print("✅ NotificationEngine imported successfully")
    except Exception as e:
        print(f"❌ NotificationEngine import failed: {e}")
        traceback.print_exc()
        return False
    
    return True

def test_flask_app():
    """Test Flask app creation"""
    print("\nTesting Flask app creation...")
    
    try:
        from flask import Flask
        from flask_cors import CORS
        
        app = Flask(__name__)
        CORS(app, origins=['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5001'])
        
        @app.route('/test', methods=['GET'])
        def test():
            return {'status': 'ok', 'message': 'Test endpoint working'}
        
        print("✅ Flask app created successfully")
        return app
    except Exception as e:
        print(f"❌ Flask app creation failed: {e}")
        traceback.print_exc()
        return None

def test_simple_server():
    """Test a simple server"""
    print("\nTesting simple server...")
    
    app = test_flask_app()
    if not app:
        return False
    
    try:
        print("Starting simple test server on port 5002...")
        app.run(host='0.0.0.0', port=5002, debug=False)
        return True
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 Risk Engine Debug Script")
    print("=" * 50)
    
    # Test imports
    if not test_imports():
        print("\n❌ Import tests failed. Please check dependencies.")
        sys.exit(1)
    
    # Test Flask app
    app = test_flask_app()
    if not app:
        print("\n❌ Flask app creation failed.")
        sys.exit(1)
    
    print("\n✅ All tests passed! Risk engine should work.")
    print("\nTo test the server, run:")
    print("python debug_risk_engine.py --server")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--server":
        test_simple_server()
