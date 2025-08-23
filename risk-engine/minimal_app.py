from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5001'])

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
        
        # Mock response for testing
        mock_response = {
            'portfolio_metrics': {
                'volatility': 15.5,
                'beta': 1.2,
                'correlation': 0.85,
                'r_squared': 0.72,
                'sharpe_ratio': 1.8,
                'max_drawdown': 12.3,
                'concentration_risk': 25.0,
                'diversification_score': 0.75,
                'var_95': 8.5,
                'var_99': 12.1
            },
            'risk_score': {
                'score': 65,
                'level': 'moderate',
                'description': 'Balanced portfolio with moderate risk-return profile',
                'components': {
                    'volatility_score': 70.0,
                    'beta_score': 60.0,
                    'sharpe_score': 80.0,
                    'concentration_score': 50.0,
                    'var_score': 65.0
                }
            },
            'risk_tolerance': risk_tolerance,
            'alerts': [
                {
                    'type': 'concentration_risk',
                    'severity': 'warning',
                    'message': 'Portfolio has high concentration in technology sector',
                    'current_value': 45.0,
                    'threshold': 30.0
                }
            ],
            'holdings_count': len(holdings),
            'total_value': sum(h.get('quantity', 0) * h.get('avg_price', 0) for h in holdings)
        }
        
        return jsonify(mock_response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/alerts', methods=['POST'])
def check_risk_alerts():
    """Check for risk alerts based on user's risk tolerance"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'risk_tolerance' not in data:
            return jsonify({'error': 'Portfolio holdings and risk tolerance required'}), 400
        
        # Mock alerts response
        mock_alerts = [
            {
                'type': 'concentration_risk',
                'severity': 'warning',
                'message': 'Portfolio has high concentration in technology sector',
                'current_value': 45.0,
                'threshold': 30.0
            },
            {
                'type': 'volatility_alert',
                'severity': 'info',
                'message': 'Portfolio volatility is within acceptable range',
                'current_value': 15.5,
                'threshold': 20.0
            }
        ]
        
        return jsonify(mock_alerts)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    print(f"🚀 Starting minimal risk engine on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
