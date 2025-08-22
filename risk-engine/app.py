from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from risk_calculator import RiskCalculator
from portfolio_analyzer import PortfolioAnalyzer
from rebalancing_engine import RebalancingEngine

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5001'])

# Initialize risk calculation services
risk_calculator = RiskCalculator()
portfolio_analyzer = PortfolioAnalyzer()
rebalancing_engine = RebalancingEngine()

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

# Rebalancing Engine Endpoints
@app.route('/api/rebalancing/analyze', methods=['POST'])
def analyze_rebalancing():
    """Analyze portfolio rebalancing needs and generate suggestions"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'target_allocation' not in data:
            return jsonify({'error': 'Portfolio holdings and target allocation required'}), 400
        
        holdings = data['holdings']
        target_allocation = data['target_allocation']
        constraints = data.get('constraints', None)
        
        # Run rebalancing analysis
        analysis = rebalancing_engine.analyze_rebalancing(holdings, target_allocation, constraints)
        
        # Convert to JSON-serializable format
        result = {
            'current_allocation': analysis.current_allocation,
            'target_allocation': analysis.target_allocation,
            'drift_analysis': analysis.drift_analysis,
            'suggestions': [
                {
                    'symbol': s.symbol,
                    'action': s.action,
                    'quantity': s.quantity,
                    'current_value': s.current_value,
                    'target_value': s.target_value,
                    'drift_percentage': s.drift_percentage,
                    'estimated_cost': s.estimated_cost,
                    'priority': s.priority
                }
                for s in analysis.suggestions
            ],
            'total_drift': analysis.total_drift,
            'estimated_transaction_cost': analysis.estimated_transaction_cost,
            'rebalancing_score': analysis.rebalancing_score,
            'optimization_method': analysis.optimization_method
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rebalancing/what-if', methods=['POST'])
def what_if_analysis():
    """Create what-if analysis for proposed rebalancing trades"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'suggestions' not in data:
            return jsonify({'error': 'Portfolio holdings and rebalancing suggestions required'}), 400
        
        holdings = data['holdings']
        suggestions = data['suggestions']
        
        # Convert suggestions back to RebalancingSuggestion objects
        from rebalancing_engine import RebalancingSuggestion
        suggestion_objects = [
            RebalancingSuggestion(
                symbol=s['symbol'],
                action=s['action'],
                quantity=s['quantity'],
                current_value=s['current_value'],
                target_value=s['target_value'],
                drift_percentage=s['drift_percentage'],
                estimated_cost=s['estimated_cost'],
                priority=s['priority']
            )
            for s in suggestions
        ]
        
        # Run what-if analysis
        what_if = rebalancing_engine.create_what_if_analysis(holdings, suggestion_objects)
        
        return jsonify(what_if)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rebalancing/optimize', methods=['POST'])
def optimize_portfolio():
    """Optimize portfolio allocation using Modern Portfolio Theory"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'target_allocation' not in data:
            return jsonify({'error': 'Portfolio holdings and target allocation required'}), 400
        
        holdings = data['holdings']
        target_allocation = data['target_allocation']
        constraints = data.get('constraints', None)
        
        # Run portfolio optimization
        optimized_allocation = rebalancing_engine.optimize_portfolio(holdings, target_allocation, constraints)
        
        return jsonify({
            'optimized_allocation': optimized_allocation,
            'original_target': target_allocation
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
