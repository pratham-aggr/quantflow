import pandas as pd
import numpy as np
import yfinance as yf
from scipy import stats
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiskCalculator:
    def __init__(self):
        self.cache = {}
        self.cache_duration = 3600  # 1 hour cache
        
    def get_historical_data(self, symbol: str, period: str = "1y") -> pd.DataFrame:
        """Get historical price data for a symbol"""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period)
            
            if data.empty:
                raise ValueError(f"No data available for {symbol}")
                
            return data
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            raise
    
    def calculate_returns(self, prices: pd.Series) -> pd.Series:
        """Calculate daily returns from price series"""
        return prices.pct_change().dropna()
    
    def calculate_volatility(self, returns: pd.Series, annualized: bool = True) -> float:
        """Calculate volatility (standard deviation of returns)"""
        volatility = returns.std()
        
        if annualized:
            # Annualize daily volatility (252 trading days)
            volatility = volatility * np.sqrt(252)
            
        return volatility
    
    def calculate_stock_risk(self, symbol: str) -> Dict[str, Any]:
        """Calculate comprehensive risk metrics for a single stock"""
        try:
            # Get historical data
            data = self.get_historical_data(symbol)
            returns = self.calculate_returns(data['Close'])
            
            # Calculate risk metrics
            volatility = self.calculate_volatility(returns)
            sharpe_ratio = self.calculate_sharpe_ratio(returns)
            max_drawdown = self.calculate_max_drawdown(data['Close'])
            var_95 = self.calculate_var(returns, 0.95)
            
            return {
                'symbol': symbol,
                'volatility': round(volatility * 100, 2),  # Convert to percentage
                'sharpe_ratio': round(sharpe_ratio, 3),
                'max_drawdown': round(max_drawdown * 100, 2),  # Convert to percentage
                'var_95': round(var_95 * 100, 2),  # Convert to percentage
                'data_points': len(returns),
                'last_updated': data.index[-1].strftime('%Y-%m-%d')
            }
            
        except Exception as e:
            logger.error(f"Error calculating risk for {symbol}: {e}")
            raise
    
    def calculate_sharpe_ratio(self, returns: pd.Series, risk_free_rate: float = 0.02) -> float:
        """Calculate Sharpe ratio (excess return per unit of risk)"""
        if len(returns) < 2:
            return 0.0
            
        excess_returns = returns - risk_free_rate / 252  # Daily risk-free rate
        return excess_returns.mean() / returns.std() * np.sqrt(252)
    
    def calculate_max_drawdown(self, prices: pd.Series) -> float:
        """Calculate maximum drawdown"""
        peak = prices.expanding().max()
        drawdown = (prices - peak) / peak
        return abs(drawdown.min())
    
    def calculate_var(self, returns: pd.Series, confidence_level: float = 0.95) -> float:
        """Calculate Value at Risk using historical simulation"""
        if len(returns) < 30:
            return 0.0
            
        var_percentile = (1 - confidence_level) * 100
        return abs(np.percentile(returns, var_percentile))
    
    def calculate_portfolio_volatility(self, holdings: List[Dict], weights: List[float] = None) -> float:
        """Calculate portfolio volatility using covariance matrix"""
        if not holdings:
            return 0.0
            
        # Get returns for all holdings
        returns_data = {}
        for holding in holdings:
            symbol = holding['symbol']
            try:
                data = self.get_historical_data(symbol)
                returns_data[symbol] = self.calculate_returns(data['Close'])
            except Exception as e:
                logger.warning(f"Could not get data for {symbol}: {e}")
                continue
        
        if not returns_data:
            return 0.0
        
        # Create returns DataFrame
        returns_df = pd.DataFrame(returns_data)
        returns_df = returns_df.dropna()
        
        if len(returns_df) < 30:
            return 0.0
        
        # Calculate weights if not provided
        if weights is None:
            total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
            weights = []
            for holding in holdings:
                value = holding.get('quantity', 0) * holding.get('avg_price', 0)
                weights.append(value / total_value if total_value > 0 else 0)
        
        # Ensure weights sum to 1
        weights = np.array(weights)
        weights = weights / weights.sum()
        
        # Calculate covariance matrix
        cov_matrix = returns_df.cov()
        
        # Calculate portfolio variance
        portfolio_variance = np.dot(weights.T, np.dot(cov_matrix, weights))
        
        # Annualize volatility
        portfolio_volatility = np.sqrt(portfolio_variance * 252)
        
        return portfolio_volatility
    
    def calculate_portfolio_beta(self, holdings: List[Dict], benchmark: str = '^GSPC') -> Dict[str, Any]:
        """Calculate portfolio beta against market benchmark"""
        try:
            # Get benchmark data
            benchmark_data = self.get_historical_data(benchmark)
            benchmark_returns = self.calculate_returns(benchmark_data['Close'])
            
            # Calculate portfolio returns
            portfolio_returns = self.calculate_portfolio_returns(holdings)
            
            if len(portfolio_returns) < 30 or len(benchmark_returns) < 30:
                return {'beta': 0.0, 'correlation': 0.0, 'r_squared': 0.0}
            
            # Align data
            aligned_data = pd.DataFrame({
                'portfolio': portfolio_returns,
                'benchmark': benchmark_returns
            }).dropna()
            
            if len(aligned_data) < 30:
                return {'beta': 0.0, 'correlation': 0.0, 'r_squared': 0.0}
            
            # Calculate beta
            covariance = np.cov(aligned_data['portfolio'], aligned_data['benchmark'])[0, 1]
            benchmark_variance = np.var(aligned_data['benchmark'])
            beta = covariance / benchmark_variance if benchmark_variance > 0 else 0
            
            # Calculate correlation
            correlation = np.corrcoef(aligned_data['portfolio'], aligned_data['benchmark'])[0, 1]
            
            # Calculate R-squared
            r_squared = correlation ** 2
            
            return {
                'beta': round(beta, 3),
                'correlation': round(correlation, 3),
                'r_squared': round(r_squared, 3),
                'benchmark': benchmark
            }
            
        except Exception as e:
            logger.error(f"Error calculating portfolio beta: {e}")
            return {'beta': 0.0, 'correlation': 0.0, 'r_squared': 0.0}
    
    def calculate_portfolio_returns(self, holdings: List[Dict]) -> pd.Series:
        """Calculate weighted portfolio returns"""
        if not holdings:
            return pd.Series()
        
        # Get returns for all holdings
        returns_data = {}
        for holding in holdings:
            symbol = holding['symbol']
            try:
                data = self.get_historical_data(symbol)
                returns_data[symbol] = self.calculate_returns(data['Close'])
            except Exception as e:
                logger.warning(f"Could not get data for {symbol}: {e}")
                continue
        
        if not returns_data:
            return pd.Series()
        
        # Create returns DataFrame
        returns_df = pd.DataFrame(returns_data)
        returns_df = returns_df.dropna()
        
        if len(returns_df) < 30:
            return pd.Series()
        
        # Calculate weights based on portfolio value
        total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
        weights = {}
        
        for holding in holdings:
            symbol = holding['symbol']
            if symbol in returns_df.columns:
                value = holding.get('quantity', 0) * holding.get('avg_price', 0)
                weights[symbol] = value / total_value if total_value > 0 else 0
        
        # Calculate weighted portfolio returns
        portfolio_returns = pd.Series(0.0, index=returns_df.index)
        for symbol, weight in weights.items():
            if symbol in returns_df.columns:
                portfolio_returns += weight * returns_df[symbol]
        
        return portfolio_returns
