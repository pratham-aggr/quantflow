import pandas as pd
import numpy as np
from typing import List, Dict, Any
from risk_calculator import RiskCalculator
import logging

logger = logging.getLogger(__name__)

class PortfolioAnalyzer:
    def __init__(self):
        self.risk_calculator = RiskCalculator()
        
        # Risk tolerance thresholds
        self.risk_thresholds = {
            'conservative': {
                'max_volatility': 0.15,  # 15% annualized volatility
                'max_beta': 0.8,
                'max_var_95': 0.02,  # 2% daily VaR
                'min_sharpe': 0.5,
                'max_concentration': 0.15  # 15% max in single holding
            },
            'moderate': {
                'max_volatility': 0.25,  # 25% annualized volatility
                'max_beta': 1.2,
                'max_var_95': 0.035,  # 3.5% daily VaR
                'min_sharpe': 0.3,
                'max_concentration': 0.25  # 25% max in single holding
            },
            'aggressive': {
                'max_volatility': 0.40,  # 40% annualized volatility
                'max_beta': 1.5,
                'max_var_95': 0.05,  # 5% daily VaR
                'min_sharpe': 0.1,
                'max_concentration': 0.40  # 40% max in single holding
            }
        }
    
    def calculate_portfolio_risk(self, holdings: List[Dict], risk_tolerance: str = 'moderate') -> Dict[str, Any]:
        """Calculate comprehensive portfolio risk metrics"""
        try:
            if not holdings:
                return self._empty_risk_metrics()
            
            # Calculate individual risk metrics
            volatility = self.risk_calculator.calculate_portfolio_volatility(holdings)
            beta_metrics = self.risk_calculator.calculate_portfolio_beta(holdings)
            portfolio_returns = self.risk_calculator.calculate_portfolio_returns(holdings)
            
            # Calculate additional metrics
            sharpe_ratio = self._calculate_portfolio_sharpe(portfolio_returns)
            max_drawdown = self._calculate_portfolio_drawdown(holdings)
            concentration_risk = self._calculate_concentration_risk(holdings)
            diversification_score = self._calculate_diversification_score(holdings)
            
            # Calculate VaR
            var_metrics = self._calculate_portfolio_var(holdings)
            
            # Calculate risk score
            risk_score = self.calculate_risk_score(holdings, risk_tolerance)
            
            return {
                'portfolio_metrics': {
                    'volatility': round(volatility * 100, 2),  # Convert to percentage
                    'beta': beta_metrics['beta'],
                    'correlation': beta_metrics['correlation'],
                    'r_squared': beta_metrics['r_squared'],
                    'sharpe_ratio': round(sharpe_ratio, 3),
                    'max_drawdown': round(max_drawdown * 100, 2),  # Convert to percentage
                    'concentration_risk': round(concentration_risk * 100, 2),
                    'diversification_score': round(diversification_score, 2),
                    'var_95': round(var_metrics['var_95'] * 100, 2),
                    'var_99': round(var_metrics['var_99'] * 100, 2)
                },
                'risk_score': risk_score,
                'risk_tolerance': risk_tolerance,
                'alerts': self.check_risk_alerts(holdings, risk_tolerance),
                'holdings_count': len(holdings),
                'total_value': sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
            }
            
        except Exception as e:
            logger.error(f"Error calculating portfolio risk: {e}")
            return self._empty_risk_metrics()
    
    def calculate_risk_score(self, holdings: List[Dict], risk_tolerance: str = 'moderate') -> Dict[str, Any]:
        """Calculate overall risk score (1-10) for portfolio"""
        try:
            if not holdings:
                return {'score': 1, 'level': 'Very Low', 'description': 'No holdings'}
            
            # Get portfolio metrics
            volatility = self.risk_calculator.calculate_portfolio_volatility(holdings)
            beta_metrics = self.risk_calculator.calculate_portfolio_beta(holdings)
            portfolio_returns = self.risk_calculator.calculate_portfolio_returns(holdings)
            sharpe_ratio = self._calculate_portfolio_sharpe(portfolio_returns)
            concentration_risk = self._calculate_concentration_risk(holdings)
            var_metrics = self._calculate_portfolio_var(holdings)
            
            # Calculate individual component scores (0-10)
            volatility_score = min(10, max(1, (volatility / 0.4) * 10))  # 40% volatility = score 10
            beta_score = min(10, max(1, (abs(beta_metrics['beta']) / 2) * 10))  # Beta 2 = score 10
            sharpe_score = max(1, min(10, 10 - (sharpe_ratio * 5)))  # Higher Sharpe = lower score
            concentration_score = min(10, max(1, concentration_risk * 10))
            var_score = min(10, max(1, (var_metrics['var_95'] / 0.05) * 10))  # 5% VaR = score 10
            
            # Weighted average score
            weights = {
                'volatility': 0.25,
                'beta': 0.20,
                'sharpe': 0.15,
                'concentration': 0.20,
                'var': 0.20
            }
            
            total_score = (
                volatility_score * weights['volatility'] +
                beta_score * weights['beta'] +
                sharpe_score * weights['sharpe'] +
                concentration_score * weights['concentration'] +
                var_score * weights['var']
            )
            
            # Determine risk level
            if total_score <= 3:
                level = 'Very Low'
                description = 'Conservative portfolio with minimal risk'
            elif total_score <= 5:
                level = 'Low'
                description = 'Moderately conservative portfolio'
            elif total_score <= 7:
                level = 'Moderate'
                description = 'Balanced portfolio with moderate risk'
            elif total_score <= 8.5:
                level = 'High'
                description = 'Aggressive portfolio with significant risk'
            else:
                level = 'Very High'
                description = 'Highly aggressive portfolio with substantial risk'
            
            return {
                'score': round(total_score, 1),
                'level': level,
                'description': description,
                'components': {
                    'volatility_score': round(volatility_score, 1),
                    'beta_score': round(beta_score, 1),
                    'sharpe_score': round(sharpe_score, 1),
                    'concentration_score': round(concentration_score, 1),
                    'var_score': round(var_score, 1)
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating risk score: {e}")
            return {'score': 5, 'level': 'Unknown', 'description': 'Error calculating risk score'}
    
    def check_risk_alerts(self, holdings: List[Dict], risk_tolerance: str = 'moderate') -> List[Dict]:
        """Check for risk alerts based on user's risk tolerance"""
        alerts = []
        
        try:
            if not holdings:
                return alerts
            
            thresholds = self.risk_thresholds.get(risk_tolerance, self.risk_thresholds['moderate'])
            
            # Calculate portfolio metrics
            volatility = self.risk_calculator.calculate_portfolio_volatility(holdings)
            beta_metrics = self.risk_calculator.calculate_portfolio_beta(holdings)
            concentration_risk = self._calculate_concentration_risk(holdings)
            var_metrics = self._calculate_portfolio_var(holdings)
            
            # Check volatility alert
            if volatility > thresholds['max_volatility']:
                alerts.append({
                    'type': 'high_volatility',
                    'severity': 'warning',
                    'message': f'Portfolio volatility ({volatility*100:.1f}%) exceeds {risk_tolerance} threshold ({thresholds["max_volatility"]*100:.1f}%)',
                    'current_value': round(volatility * 100, 1),
                    'threshold': round(thresholds['max_volatility'] * 100, 1)
                })
            
            # Check beta alert
            if abs(beta_metrics['beta']) > thresholds['max_beta']:
                alerts.append({
                    'type': 'high_beta',
                    'severity': 'warning',
                    'message': f'Portfolio beta ({beta_metrics["beta"]:.2f}) exceeds {risk_tolerance} threshold ({thresholds["max_beta"]:.2f})',
                    'current_value': beta_metrics['beta'],
                    'threshold': thresholds['max_beta']
                })
            
            # Check concentration alert
            if concentration_risk > thresholds['max_concentration']:
                alerts.append({
                    'type': 'high_concentration',
                    'severity': 'warning',
                    'message': f'Portfolio concentration risk ({concentration_risk*100:.1f}%) exceeds {risk_tolerance} threshold ({thresholds["max_concentration"]*100:.1f}%)',
                    'current_value': round(concentration_risk * 100, 1),
                    'threshold': round(thresholds['max_concentration'] * 100, 1)
                })
            
            # Check VaR alert
            if var_metrics['var_95'] > thresholds['max_var_95']:
                alerts.append({
                    'type': 'high_var',
                    'severity': 'warning',
                    'message': f'Portfolio VaR ({var_metrics["var_95"]*100:.1f}%) exceeds {risk_tolerance} threshold ({thresholds["max_var_95"]*100:.1f}%)',
                    'current_value': round(var_metrics['var_95'] * 100, 1),
                    'threshold': round(thresholds['max_var_95'] * 100, 1)
                })
            
            # Check for individual holding concentration
            total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
            for holding in holdings:
                holding_value = holding.get('quantity', 0) * holding.get('avg_price', 0)
                holding_weight = holding_value / total_value if total_value > 0 else 0
                
                if holding_weight > thresholds['max_concentration']:
                    alerts.append({
                        'type': 'individual_concentration',
                        'severity': 'info',
                        'message': f'{holding["symbol"]} represents {holding_weight*100:.1f}% of portfolio (exceeds {thresholds["max_concentration"]*100:.1f}%)',
                        'symbol': holding['symbol'],
                        'current_value': round(holding_weight * 100, 1),
                        'threshold': round(thresholds['max_concentration'] * 100, 1)
                    })
            
        except Exception as e:
            logger.error(f"Error checking risk alerts: {e}")
            alerts.append({
                'type': 'calculation_error',
                'severity': 'error',
                'message': 'Error calculating risk metrics'
            })
        
        return alerts
    
    def _calculate_portfolio_sharpe(self, portfolio_returns: pd.Series, risk_free_rate: float = 0.02) -> float:
        """Calculate portfolio Sharpe ratio"""
        if len(portfolio_returns) < 30:
            return 0.0
        
        excess_returns = portfolio_returns - risk_free_rate / 252
        return excess_returns.mean() / portfolio_returns.std() * np.sqrt(252)
    
    def _calculate_portfolio_drawdown(self, holdings: List[Dict]) -> float:
        """Calculate portfolio maximum drawdown"""
        try:
            # Get historical data for all holdings
            portfolio_prices = self._calculate_portfolio_prices(holdings)
            if portfolio_prices.empty:
                return 0.0
            
            peak = portfolio_prices.expanding().max()
            drawdown = (portfolio_prices - peak) / peak
            return abs(drawdown.min())
            
        except Exception as e:
            logger.error(f"Error calculating portfolio drawdown: {e}")
            return 0.0
    
    def _calculate_portfolio_prices(self, holdings: List[Dict]) -> pd.Series:
        """Calculate historical portfolio prices"""
        try:
            if not holdings:
                return pd.Series()
            
            # Get price data for all holdings
            price_data = {}
            for holding in holdings:
                symbol = holding['symbol']
                try:
                    data = self.risk_calculator.get_historical_data(symbol)
                    price_data[symbol] = data['Close']
                except Exception as e:
                    logger.warning(f"Could not get price data for {symbol}: {e}")
                    continue
            
            if not price_data:
                return pd.Series()
            
            # Create price DataFrame
            prices_df = pd.DataFrame(price_data)
            prices_df = prices_df.dropna()
            
            if len(prices_df) < 30:
                return pd.Series()
            
            # Calculate weighted portfolio prices
            total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
            portfolio_prices = pd.Series(0.0, index=prices_df.index)
            
            for holding in holdings:
                symbol = holding['symbol']
                if symbol in prices_df.columns:
                    quantity = holding.get('quantity', 0)
                    portfolio_prices += quantity * prices_df[symbol]
            
            return portfolio_prices
            
        except Exception as e:
            logger.error(f"Error calculating portfolio prices: {e}")
            return pd.Series()
    
    def _calculate_concentration_risk(self, holdings: List[Dict]) -> float:
        """Calculate portfolio concentration risk (Herfindahl index)"""
        if not holdings:
            return 0.0
        
        total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
        if total_value == 0:
            return 0.0
        
        # Calculate weights
        weights = []
        for holding in holdings:
            value = holding.get('quantity', 0) * holding.get('avg_price', 0)
            weights.append(value / total_value)
        
        # Calculate Herfindahl index (sum of squared weights)
        concentration = sum(w ** 2 for w in weights)
        return concentration
    
    def _calculate_diversification_score(self, holdings: List[Dict]) -> float:
        """Calculate diversification score (0-1, higher is better)"""
        concentration_risk = self._calculate_concentration_risk(holdings)
        
        # Perfect diversification would have concentration = 1/n
        n = len(holdings)
        if n <= 1:
            return 0.0
        
        perfect_concentration = 1 / n
        diversification_score = 1 - (concentration_risk - perfect_concentration) / (1 - perfect_concentration)
        
        return max(0.0, min(1.0, diversification_score))
    
    def _calculate_portfolio_var(self, holdings: List[Dict]) -> Dict[str, float]:
        """Calculate portfolio Value at Risk"""
        try:
            portfolio_returns = self.risk_calculator.calculate_portfolio_returns(holdings)
            
            if len(portfolio_returns) < 30:
                return {'var_95': 0.0, 'var_99': 0.0}
            
            var_95 = abs(np.percentile(portfolio_returns, 5))
            var_99 = abs(np.percentile(portfolio_returns, 1))
            
            return {'var_95': var_95, 'var_99': var_99}
            
        except Exception as e:
            logger.error(f"Error calculating portfolio VaR: {e}")
            return {'var_95': 0.0, 'var_99': 0.0}
    
    def _empty_risk_metrics(self) -> Dict[str, Any]:
        """Return empty risk metrics structure"""
        return {
            'portfolio_metrics': {
                'volatility': 0.0,
                'beta': 0.0,
                'correlation': 0.0,
                'r_squared': 0.0,
                'sharpe_ratio': 0.0,
                'max_drawdown': 0.0,
                'concentration_risk': 0.0,
                'diversification_score': 0.0,
                'var_95': 0.0,
                'var_99': 0.0
            },
            'risk_score': {'score': 1, 'level': 'Very Low', 'description': 'No holdings'},
            'risk_tolerance': 'moderate',
            'alerts': [],
            'holdings_count': 0,
            'total_value': 0
        }
