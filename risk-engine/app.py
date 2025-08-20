from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from risk_calculator import RiskCalculator
from portfolio_analyzer import PortfolioAnalyzer

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5001'])

# Initialize risk calculation services
risk_calculator = RiskCalculator()
portfolio_analyzer = PortfolioAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Risk Assessment Engine',
        'version': '1.0.0'
    })

@app.route('/api/risk/portfolio', methods=['POST'])
def calculate_portfolio_risk():
    """Calculate comprehensive risk metrics for a portfolio"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        risk_tolerance = data.get('risk_tolerance', 'moderate')
        
        # Calculate portfolio risk metrics
        risk_metrics = portfolio_analyzer.calculate_portfolio_risk(holdings, risk_tolerance)
        
        return jsonify(risk_metrics)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/holding/<symbol>', methods=['GET'])
def calculate_holding_risk(symbol):
    """Calculate risk metrics for a single holding"""
    try:
        # Get historical data and calculate risk metrics
        risk_metrics = risk_calculator.calculate_stock_risk(symbol)
        
        return jsonify(risk_metrics)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/var', methods=['POST'])
def calculate_var():
    """Calculate Value at Risk for a portfolio"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        confidence_level = data.get('confidence_level', 0.95)
        time_horizon = data.get('time_horizon', 1)  # days
        
        var_result = risk_calculator.calculate_var(
            data['holdings'], 
            confidence_level, 
            time_horizon
        )
        
        return jsonify(var_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/beta', methods=['POST'])
def calculate_beta():
    """Calculate portfolio beta against market benchmark"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        benchmark = data.get('benchmark', '^GSPC')  # S&P 500
        
        beta_result = risk_calculator.calculate_portfolio_beta(
            data['holdings'], 
            benchmark
        )
        
        return jsonify(beta_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/score', methods=['POST'])
def calculate_risk_score():
    """Calculate overall risk score (1-10) for portfolio"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        risk_tolerance = data.get('risk_tolerance', 'moderate')
        
        risk_score = portfolio_analyzer.calculate_risk_score(
            data['holdings'], 
            risk_tolerance
        )
        
        return jsonify(risk_score)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/alerts', methods=['POST'])
def check_risk_alerts():
    """Check for risk alerts based on user's risk tolerance"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'risk_tolerance' not in data:
            return jsonify({'error': 'Portfolio holdings and risk tolerance required'}), 400
        
        alerts = portfolio_analyzer.check_risk_alerts(
            data['holdings'], 
            data['risk_tolerance']
        )
        
        return jsonify(alerts)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
