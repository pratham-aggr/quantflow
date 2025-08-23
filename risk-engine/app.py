from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from risk_calculator import RiskCalculator
from portfolio_analyzer import PortfolioAnalyzer
from rebalancing_engine import RebalancingEngine
from advanced_risk_engine import AdvancedRiskEngine
from tax_loss_harvesting import TaxLossHarvestingEngine, TaxSettings
from advanced_rebalancing import AdvancedRebalancingEngine, RebalancingSettings
from paper_trading import PaperTradingEngine, BrokerageAPISimulator, OrderSide, OrderType
from notification_engine import NotificationEngine, NotificationConfig, NotificationType, NotificationPriority, NotificationChannel, AlertRule

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Get allowed origins from environment or use defaults
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:4000,http://localhost:5001').split(',')
CORS(app, origins=allowed_origins)

# Initialize risk calculation services
risk_calculator = RiskCalculator()
portfolio_analyzer = PortfolioAnalyzer()
rebalancing_engine = RebalancingEngine()
advanced_risk_engine = AdvancedRiskEngine()
tax_loss_engine = TaxLossHarvestingEngine()
advanced_rebalancing_engine = AdvancedRebalancingEngine()
paper_trading_engine = PaperTradingEngine()
brokerage_simulator = BrokerageAPISimulator()
notification_engine = NotificationEngine()

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

# ========== ADVANCED RISK ENGINE ENDPOINTS ==========

@app.route('/api/risk/advanced', methods=['POST'])
def generate_advanced_risk_report():
    """Generate comprehensive advanced risk report with Monte Carlo, correlation, sector analysis, and ML predictions"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        risk_tolerance = data.get('risk_tolerance', 'moderate')
        
        # Generate comprehensive risk report
        risk_report = advanced_risk_engine.generate_risk_report(holdings, risk_tolerance)
        
        return jsonify(risk_report)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/monte-carlo', methods=['POST'])
def run_monte_carlo_simulation():
    """Run Monte Carlo simulation for portfolio returns"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        time_horizon = data.get('time_horizon', 252)
        
        # Run Monte Carlo simulation
        monte_carlo_result = advanced_risk_engine.run_monte_carlo_simulation(holdings, time_horizon)
        
        # Convert to JSON-serializable format
        result = {
            'mean_return': monte_carlo_result.mean_return,
            'std_return': monte_carlo_result.std_return,
            'percentiles': monte_carlo_result.percentiles,
            'worst_case': monte_carlo_result.worst_case,
            'best_case': monte_carlo_result.best_case,
            'probability_positive': monte_carlo_result.probability_positive,
            'confidence_intervals': monte_carlo_result.confidence_intervals
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/correlation', methods=['POST'])
def calculate_correlation_matrix():
    """Calculate correlation matrix and diversification analysis"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        
        # Calculate correlation matrix
        correlation_result = advanced_risk_engine.calculate_correlation_matrix(holdings)
        
        # Convert to JSON-serializable format
        result = {
            'diversification_score': correlation_result.diversification_score,
            'high_correlation_pairs': correlation_result.high_correlation_pairs,
            'heatmap_data': correlation_result.heatmap_data
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/sector-analysis', methods=['POST'])
def analyze_sector_allocation():
    """Analyze sector allocation and sector-specific risks"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        
        # Analyze sector allocation
        sector_result = advanced_risk_engine.analyze_sector_allocation(holdings)
        
        # Convert to JSON-serializable format
        result = {
            'sector_allocation': sector_result.sector_allocation,
            'sector_risk': sector_result.sector_risk,
            'concentration_risk': sector_result.concentration_risk,
            'recommendations': sector_result.sector_recommendations
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/ml-prediction', methods=['POST'])
def predict_volatility_ml():
    """Predict portfolio volatility using machine learning"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        historical_data = data.get('historical_data', None)
        
        # Predict volatility using ML
        ml_result = advanced_risk_engine.predict_volatility_ml(holdings, historical_data)
        
        # Convert to JSON-serializable format
        result = {
            'predicted_volatility': ml_result.predicted_volatility,
            'confidence_interval': ml_result.confidence_interval,
            'feature_importance': ml_result.feature_importance,
            'model_accuracy': ml_result.model_accuracy,
            'prediction_horizon': ml_result.prediction_horizon
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/risk/train-ml', methods=['POST'])
def train_ml_model():
    """Train the ML model for volatility prediction"""
    try:
        data = request.get_json()
        
        if not data or 'training_data' not in data:
            return jsonify({'error': 'Training data required'}), 400
        
        training_data = data['training_data']
        
        # Train ML model
        success = advanced_risk_engine.train_ml_model(training_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'ML model trained successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to train ML model - insufficient data'
            })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Tax-Loss Harvesting Endpoints
@app.route('/api/tax-loss-harvesting/analyze', methods=['POST'])
def analyze_tax_loss_harvesting():
    """Analyze portfolio for tax-loss harvesting opportunities"""
    try:
        data = request.get_json()
        holdings = data.get('holdings', [])
        transactions = data.get('transactions', [])
        tax_settings_data = data.get('tax_settings', {})
        
        # Create tax settings
        tax_settings = TaxSettings(**tax_settings_data) if tax_settings_data else TaxSettings()
        
        # Update engine with settings
        tax_loss_engine.tax_settings = tax_settings
        
        opportunities = tax_loss_engine.analyze_portfolio_for_harvesting(
            holdings, transactions
        )
        
        # Convert to serializable format
        opportunities_data = []
        for opp in opportunities:
            opportunities_data.append({
                'symbol': opp.symbol,
                'shares_to_sell': opp.shares_to_sell,
                'current_price': opp.current_price,
                'cost_basis': opp.cost_basis,
                'unrealized_loss': opp.unrealized_loss,
                'tax_savings': opp.tax_savings,
                'replacement_symbol': opp.replacement_symbol,
                'replacement_shares': opp.replacement_shares,
                'wash_sale_risk': opp.wash_sale_risk,
                'holding_period': opp.holding_period
            })
        
        return jsonify({
            'success': True,
            'opportunities': opportunities_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/tax-loss-harvesting/annual-benefit', methods=['POST'])
def estimate_annual_tax_benefit():
    """Estimate annual tax benefits from systematic harvesting"""
    try:
        data = request.get_json()
        portfolio_value = data.get('portfolio_value', 100000)
        expected_volatility = data.get('expected_volatility', 0.15)
        
        benefit_estimate = tax_loss_engine.estimate_annual_tax_benefit(
            portfolio_value, expected_volatility
        )
        
        return jsonify({
            'success': True,
            **benefit_estimate
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# Paper Trading Endpoints
@app.route('/api/paper-trading/create-portfolio', methods=['POST'])
def create_paper_portfolio():
    """Create a new paper trading portfolio"""
    try:
        data = request.get_json()
        name = data.get('name', 'Paper Portfolio')
        initial_cash = data.get('initial_cash', 100000.0)
        
        portfolio = paper_trading_engine.create_portfolio(name, initial_cash)
        
        return jsonify({
            'success': True,
            'portfolio_id': portfolio.id,
            'name': portfolio.name,
            'initial_cash': portfolio.cash
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/paper-trading/place-order', methods=['POST'])
def place_paper_order():
    """Place a paper trading order"""
    try:
        data = request.get_json()
        portfolio_id = data.get('portfolio_id')
        symbol = data.get('symbol')
        side_str = data.get('side', 'BUY')
        quantity = data.get('quantity', 0)
        order_type_str = data.get('order_type', 'MARKET')
        price = data.get('price')
        stop_price = data.get('stop_price')
        
        # Convert strings to enums
        side = OrderSide.BUY if side_str.upper() == 'BUY' else OrderSide.SELL
        order_type = OrderType[order_type_str.upper()]
        
        order = paper_trading_engine.place_order(
            portfolio_id, symbol, side, quantity, order_type, price, stop_price
        )
        
        return jsonify({
            'success': True,
            'order_id': order.id,
            'symbol': order.symbol,
            'side': order.side.value,
            'quantity': order.quantity,
            'status': order.status.value,
            'created_at': order.created_at.isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/paper-trading/portfolio/<portfolio_id>', methods=['GET'])
def get_paper_portfolio_summary(portfolio_id):
    """Get paper portfolio summary"""
    try:
        summary = paper_trading_engine.get_portfolio_summary(portfolio_id)
        
        return jsonify({
            'success': True,
            **summary
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# Notification Endpoints
@app.route('/api/notifications/register', methods=['POST'])
def register_notification_user():
    """Register a user for notifications"""
    try:
        data = request.get_json()
        
        # Convert data to NotificationConfig
        config = NotificationConfig(
            user_id=data['userId'],
            channels=[NotificationChannel[channel.upper()] for channel in data.get('channels', [])],
            preferences=data.get('preferences', {}),
            email_settings=data.get('emailSettings'),
            slack_webhook=data.get('slackWebhook'),
            discord_webhook=data.get('discordWebhook'),
            push_tokens=data.get('pushTokens', []),
            phone_number=data.get('phoneNumber'),
            custom_webhooks=data.get('customWebhooks', []),
            alert_thresholds=data.get('alertThresholds', {}),
            quiet_hours=data.get('quietHours'),
            enabled=data.get('enabled', True)
        )
        
        notification_engine.register_user(data['userId'], config)
        
        return jsonify({
            'success': True,
            'message': 'User registered for notifications'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/unregister/<user_id>', methods=['DELETE'])
def unregister_notification_user(user_id):
    """Unregister a user from notifications"""
    try:
        notification_engine.unregister_user(user_id)
        
        return jsonify({
            'success': True,
            'message': 'User unregistered from notifications'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/config/<user_id>', methods=['PUT'])
def update_notification_config(user_id):
    """Update notification configuration for a user"""
    try:
        data = request.get_json()
        
        # Get existing config
        config = notification_engine.configs.get(user_id)
        if not config:
            return jsonify({
                'success': False,
                'error': 'User not registered'
            }), 404
        
        # Update config fields
        if 'channels' in data:
            config.channels = [NotificationChannel[channel.upper()] for channel in data['channels']]
        if 'preferences' in data:
            config.preferences.update(data['preferences'])
        if 'emailSettings' in data:
            config.email_settings = data['emailSettings']
        if 'slackWebhook' in data:
            config.slack_webhook = data['slackWebhook']
        if 'discordWebhook' in data:
            config.discord_webhook = data['discordWebhook']
        if 'pushTokens' in data:
            config.push_tokens = data['pushTokens']
        if 'phoneNumber' in data:
            config.phone_number = data['phoneNumber']
        if 'customWebhooks' in data:
            config.custom_webhooks = data['customWebhooks']
        if 'alertThresholds' in data:
            config.alert_thresholds.update(data['alertThresholds'])
        if 'quietHours' in data:
            config.quiet_hours = data['quietHours']
        if 'enabled' in data:
            config.enabled = data['enabled']
        
        return jsonify({
            'success': True,
            'message': 'Configuration updated'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/history/<user_id>', methods=['GET'])
def get_notification_history(user_id):
    """Get notification history for a user"""
    try:
        limit = request.args.get('limit', 50, type=int)
        notifications = notification_engine.get_notification_history(user_id, limit)
        
        # Convert to serializable format
        notifications_data = []
        for notification in notifications:
            notifications_data.append({
                'id': notification.id,
                'userId': notification.user_id,
                'type': notification.type.value,
                'priority': notification.priority.value,
                'title': notification.title,
                'message': notification.message,
                'data': notification.data,
                'channels': [channel.value for channel in notification.channels],
                'createdAt': notification.created_at.isoformat(),
                'sentAt': notification.sent_at.isoformat() if notification.sent_at else None,
                'readAt': notification.read_at.isoformat() if notification.read_at else None,
                'expiresAt': notification.expires_at.isoformat() if notification.expires_at else None
            })
        
        return jsonify({
            'success': True,
            'notifications': notifications_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/read/<notification_id>', methods=['PUT'])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        notification_engine.mark_notification_read(notification_id)
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/alert-rules', methods=['POST'])
def create_alert_rule():
    """Create a new alert rule"""
    try:
        data = request.get_json()
        
        rule = AlertRule(
            user_id=data['userId'],
            name=data['name'],
            type=NotificationType[data['type'].upper()],
            conditions=data['conditions'],
            actions=data['actions'],
            enabled=data.get('enabled', True)
        )
        
        notification_engine.add_alert_rule(rule)
        
        return jsonify({
            'success': True,
            'rule': {
                'id': rule.id,
                'userId': rule.user_id,
                'name': rule.name,
                'type': rule.type.value,
                'conditions': rule.conditions,
                'actions': rule.actions,
                'enabled': rule.enabled,
                'createdAt': rule.created_at.isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/alert-rules/<user_id>', methods=['GET'])
def get_alert_rules(user_id):
    """Get alert rules for a user"""
    try:
        rules = []
        for rule in notification_engine.alert_rules.values():
            if rule.user_id == user_id:
                rules.append({
                    'id': rule.id,
                    'userId': rule.user_id,
                    'name': rule.name,
                    'type': rule.type.value,
                    'conditions': rule.conditions,
                    'actions': rule.actions,
                    'enabled': rule.enabled,
                    'createdAt': rule.created_at.isoformat()
                })
        
        return jsonify({
            'success': True,
            'rules': rules
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/alert-rules/<rule_id>', methods=['PUT'])
def update_alert_rule(rule_id):
    """Update an alert rule"""
    try:
        data = request.get_json()
        
        rule = notification_engine.alert_rules.get(rule_id)
        if not rule:
            return jsonify({
                'success': False,
                'error': 'Rule not found'
            }), 404
        
        # Update rule fields
        if 'name' in data:
            rule.name = data['name']
        if 'type' in data:
            rule.type = NotificationType[data['type'].upper()]
        if 'conditions' in data:
            rule.conditions = data['conditions']
        if 'actions' in data:
            rule.actions = data['actions']
        if 'enabled' in data:
            rule.enabled = data['enabled']
        
        return jsonify({
            'success': True,
            'message': 'Rule updated'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/alert-rules/<rule_id>', methods=['DELETE'])
def delete_alert_rule(rule_id):
    """Delete an alert rule"""
    try:
        notification_engine.remove_alert_rule(rule_id)
        
        return jsonify({
            'success': True,
            'message': 'Rule deleted'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/notifications/test', methods=['POST'])
def send_test_notification():
    """Send a test notification"""
    try:
        data = request.get_json()
        
        from notification_engine import Notification
        
        notification = Notification(
            user_id=data['user_id'],
            type=NotificationType[data['type'].upper()],
            priority=NotificationPriority[data.get('priority', 'MEDIUM').upper()],
            title=data['title'],
            message=data['message'],
            channels=[NotificationChannel.EMAIL, NotificationChannel.PUSH]
        )
        
        # Send the notification
        result = notification_engine.send_notification(notification)
        
        return jsonify({
            'success': True,
            'result': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    import asyncio
    import threading
    
    # Start WebSocket server in a separate thread
    def start_websocket_server():
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(notification_engine.start_websocket_server())
            loop.run_forever()
        except Exception as e:
            print(f"WebSocket server error: {e}")
    
    websocket_thread = threading.Thread(target=start_websocket_server, daemon=True)
    websocket_thread.start()
    
    # Start Flask server
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
