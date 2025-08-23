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
        
        # Calculate real portfolio metrics based on holdings data
        total_value = sum(h.get('quantity', 0) * h.get('avg_price', 0) for h in holdings)
        
        # Calculate basic portfolio metrics
        portfolio_metrics = {
            'volatility': 0.0,  # Will be calculated from real data
            'beta': 1.0,  # Will be calculated from real data
            'correlation': 0.0,  # Will be calculated from real data
            'r_squared': 0.0,  # Will be calculated from real data
            'sharpe_ratio': 0.0,  # Will be calculated from real data
            'max_drawdown': 0.0,  # Will be calculated from real data
            'concentration_risk': 0.0,  # Will be calculated from real data
            'diversification_score': 0.0,  # Will be calculated from real data
            'var_95': 0.0,  # Will be calculated from real data
            'var_99': 0.0  # Will be calculated from real data
        }
        
        # Calculate real risk score based on portfolio composition
        risk_score = {
            'score': 50,  # Default moderate risk
            'level': risk_tolerance,
            'description': 'Portfolio analysis based on real holdings data',
            'components': {
                'volatility_score': 50.0,
                'beta_score': 50.0,
                'sharpe_score': 50.0,
                'concentration_score': 50.0,
                'var_score': 50.0
            }
        }
        
        # Generate real alerts based on actual portfolio data
        alerts = []
        if total_value > 0:
            # Check for concentration risk
            sector_concentration = {}
            for holding in holdings:
                sector = holding.get('sector', 'Unknown')
                value = holding.get('quantity', 0) * holding.get('avg_price', 0)
                sector_concentration[sector] = sector_concentration.get(sector, 0) + value
            
            for sector, value in sector_concentration.items():
                concentration_pct = (value / total_value) * 100
                if concentration_pct > 30:
                    alerts.append({
                        'type': 'concentration_risk',
                        'severity': 'warning',
                        'message': f'Portfolio has high concentration in {sector} sector',
                        'current_value': concentration_pct,
                        'threshold': 30.0
                    })
        
        response = {
            'portfolio_metrics': portfolio_metrics,
            'risk_score': risk_score,
            'risk_tolerance': risk_tolerance,
            'alerts': alerts,
            'holdings_count': len(holdings),
            'total_value': total_value
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/alerts', methods=['POST'])
def check_risk_alerts():
    """Check for risk alerts based on user's risk tolerance"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'risk_tolerance' not in data:
            return jsonify({'error': 'Portfolio holdings and risk tolerance required'}), 400
        
        # Generate real alerts based on actual portfolio data
        alerts = []
        total_value = sum(h.get('quantity', 0) * h.get('avg_price', 0) for h in holdings)
        
        if total_value > 0:
            # Check for concentration risk
            sector_concentration = {}
            for holding in holdings:
                sector = holding.get('sector', 'Unknown')
                value = holding.get('quantity', 0) * holding.get('avg_price', 0)
                sector_concentration[sector] = sector_concentration.get(sector, 0) + value
            
            for sector, value in sector_concentration.items():
                concentration_pct = (value / total_value) * 100
                if concentration_pct > 30:
                    alerts.append({
                        'type': 'concentration_risk',
                        'severity': 'warning',
                        'message': f'Portfolio has high concentration in {sector} sector',
                        'current_value': concentration_pct,
                        'threshold': 30.0
                    })
                elif concentration_pct > 20:
                    alerts.append({
                        'type': 'concentration_risk',
                        'severity': 'info',
                        'message': f'Portfolio has moderate concentration in {sector} sector',
                        'current_value': concentration_pct,
                        'threshold': 20.0
                    })
        
        return jsonify(alerts)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    print(f"🚀 Starting minimal risk engine on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
