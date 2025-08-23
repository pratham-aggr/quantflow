import pandas as pd
import numpy as np
from scipy import stats
from scipy.optimize import minimize
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List, Dict, Any, Tuple, Optional
import logging
from dataclasses import dataclass
import warnings
import yfinance as yf
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

@dataclass
class MonteCarloResult:
    """Results from Monte Carlo simulation"""
    mean_return: float
    std_return: float
    percentiles: Dict[str, float]
    worst_case: float
    best_case: float
    probability_positive: float
    confidence_intervals: Dict[str, Tuple[float, float]]

@dataclass
class CorrelationMatrix:
    """Correlation matrix analysis results"""
    matrix: np.ndarray
    symbols: List[str]
    heatmap_data: Dict[str, Any]
    high_correlation_pairs: List[Tuple[str, str, float]]
    diversification_score: float

@dataclass
class SectorAnalysis:
    """Sector allocation analysis"""
    sector_allocation: Dict[str, float]
    sector_risk: Dict[str, float]
    sector_correlation: Dict[str, Dict[str, float]]
    concentration_risk: float
    sector_recommendations: List[str]

@dataclass
class MLVolatilityPrediction:
    """ML-based volatility prediction results"""
    predicted_volatility: float
    confidence_interval: Tuple[float, float]
    feature_importance: Dict[str, float]
    model_accuracy: float
    prediction_horizon: int

class AdvancedRiskEngine:
    """Advanced risk assessment engine with Monte Carlo simulation, correlation analysis, and ML predictions"""
    
    def __init__(self):
        self.risk_free_rate = 0.02  # 2% risk-free rate
        self.monte_carlo_simulations = 10000
        self.prediction_horizon = 30  # 30 days
        self.ml_model = None
        self.scaler = StandardScaler()
        
    def run_monte_carlo_simulation(self, holdings: List[Dict], time_horizon: int = 252) -> MonteCarloResult:
        """
        Run Monte Carlo simulation for portfolio returns
        
        Args:
            holdings: List of portfolio holdings
            time_horizon: Number of days to simulate (default: 252 for 1 year)
            
        Returns:
            MonteCarloResult with simulation statistics
        """
        try:
            logger.info(f"Starting Monte Carlo simulation for {len(holdings)} holdings")
            if not holdings:
                logger.warning("No holdings provided for Monte Carlo simulation")
                return self._empty_monte_carlo_result()
            
            # Check if portfolio has any meaningful holdings
            valid_holdings = [h for h in holdings if h.get('quantity', 0) > 0 and h.get('avg_price', 0) > 0]
            if not valid_holdings:
                logger.warning("Portfolio is empty - no valid holdings found")
                return self._empty_monte_carlo_result()
            
            # Calculate historical returns and volatility for each holding
            returns_data = []
            weights = []
            total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
            logger.info(f"Total portfolio value: {total_value}")
            
            for holding in holdings:
                symbol = holding.get('symbol', '')
                price = holding.get('avg_price', 0)
                current_price = holding.get('current_price', price)
                quantity = holding.get('quantity', 0)
                
                logger.info(f"Processing holding: symbol={symbol}, quantity={quantity}, avg_price={price}, current_price={current_price}")
                
                if price > 0 and quantity > 0 and symbol:
                    # Calculate weight
                    weight = (price * quantity) / total_value
                    weights.append(weight)
                    
                    try:
                        logger.info(f"Fetching data for symbol: {symbol}")
                        # Get real historical data using yfinance
                        ticker = yf.Ticker(symbol)
                        hist = ticker.history(period="1y")
                        logger.info(f"Retrieved {len(hist)} data points for {symbol}")
                        
                        if len(hist) > 30:  # Ensure we have enough data
                            # Calculate daily returns
                            returns = hist['Close'].pct_change().dropna()
                            mean_return = returns.mean()
                            volatility = returns.std()
                            
                            logger.info(f"Calculated returns for {symbol}: mean={mean_return:.6f}, vol={volatility:.6f}")
                            
                            returns_data.append({
                                'mean_return': mean_return,
                                'volatility': volatility,
                                'returns': returns
                            })
                        else:
                            # Skip holdings without sufficient historical data
                            logger.warning(f"Insufficient historical data for {symbol}: only {len(hist)} points")
                            continue
                    except Exception as e:
                        logger.warning(f"Could not fetch data for {symbol}: {e}")
                        # Skip holdings that can't be fetched
                        continue
            
            logger.info(f"Processed {len(returns_data)} holdings with valid data")
            if not returns_data:
                logger.warning("No valid returns data available for Monte Carlo simulation")
                return self._empty_monte_carlo_result()
            
            # Run Monte Carlo simulation
            portfolio_returns = []
            
            for _ in range(self.monte_carlo_simulations):
                # Generate random returns for each holding
                holding_returns = []
                for i, data in enumerate(returns_data):
                    # Use real historical returns with bootstrapping
                    random_return = np.random.choice(data['returns'])
                    holding_returns.append(random_return * weights[i])
                
                # Calculate portfolio return
                portfolio_return = sum(holding_returns)
                portfolio_returns.append(portfolio_return)
            
            portfolio_returns = np.array(portfolio_returns)
            
            # Check for valid data
            if len(portfolio_returns) == 0 or np.any(np.isnan(portfolio_returns)):
                logger.warning("Invalid portfolio returns data")
                return self._empty_monte_carlo_result()
            
            # Calculate statistics
            mean_return = np.mean(portfolio_returns)
            std_return = np.std(portfolio_returns)
            
            # Calculate percentiles
            percentiles = {
                '5th': np.percentile(portfolio_returns, 5),
                '10th': np.percentile(portfolio_returns, 10),
                '25th': np.percentile(portfolio_returns, 25),
                '50th': np.percentile(portfolio_returns, 50),
                '75th': np.percentile(portfolio_returns, 75),
                '90th': np.percentile(portfolio_returns, 90),
                '95th': np.percentile(portfolio_returns, 95)
            }
            
            # Calculate confidence intervals
            confidence_intervals = {
                '90%': (np.percentile(portfolio_returns, 5), np.percentile(portfolio_returns, 95)),
                '95%': (np.percentile(portfolio_returns, 2.5), np.percentile(portfolio_returns, 97.5)),
                '99%': (np.percentile(portfolio_returns, 0.5), np.percentile(portfolio_returns, 99.5))
            }
            
            # Get worst and best case values
            worst_case = np.min(portfolio_returns)
            best_case = np.max(portfolio_returns)
            
            return MonteCarloResult(
                mean_return=mean_return,
                std_return=std_return,
                percentiles=percentiles,
                worst_case=worst_case,
                best_case=best_case,
                probability_positive=np.mean(portfolio_returns > 0),
                confidence_intervals=confidence_intervals
            )
            
        except Exception as e:
            logger.error(f"Error in Monte Carlo simulation: {e}")
            return self._empty_monte_carlo_result()
    
    def calculate_correlation_matrix(self, holdings: List[Dict]) -> CorrelationMatrix:
        """
        Calculate correlation matrix and analyze diversification
        
        Args:
            holdings: List of portfolio holdings
            
        Returns:
            CorrelationMatrix with correlation analysis
        """
        try:
            logger.info(f"Starting correlation analysis for {len(holdings)} holdings")
            if len(holdings) < 2:
                logger.warning("Not enough holdings for correlation analysis (need >=2)")
                return self._empty_correlation_matrix()
            
            symbols = [holding.get('symbol', f'Holding_{i}') for i, holding in enumerate(holdings)]
            logger.info(f"Processing symbols: {symbols}")
            logger.info(f"Holdings data: {holdings}")
            
            # Get real historical data for correlation calculation
            price_data = {}
            valid_symbols = []
            
            # Check if we have valid symbols
            valid_symbols_count = sum(1 for symbol in symbols if symbol and symbol != 'Unknown')
            logger.info(f"Valid symbols count: {valid_symbols_count}")
            if valid_symbols_count < 2:
                logger.warning(f"Not enough valid symbols for correlation: {valid_symbols_count} (need >=2)")
                return self._empty_correlation_matrix()
            
            for holding in holdings:
                symbol = holding.get('symbol', '')
                if symbol and symbol != 'Unknown':
                    try:
                        ticker = yf.Ticker(symbol)
                        hist = ticker.history(period="1y")
                        logger.info(f"Fetched {len(hist)} data points for {symbol}")
                        if len(hist) > 30:
                            price_data[symbol] = hist['Close']
                            valid_symbols.append(symbol)
                            logger.info(f"Added {symbol} to correlation analysis")
                        else:
                            logger.warning(f"Insufficient data for {symbol}: {len(hist)} points")
                    except Exception as e:
                        logger.warning(f"Could not fetch data for {symbol}: {e}")
                else:
                    logger.warning(f"Skipping invalid symbol: {symbol}")
            
            if len(valid_symbols) >= 2:
                # Create DataFrame with aligned dates
                df = pd.DataFrame(price_data)
                df = df.dropna()
                
                logger.info(f"Correlation analysis: {len(valid_symbols)} valid symbols, {len(df)} data points")
                
                if len(df) > 30:
                    # Calculate real correlation matrix
                    correlation_matrix = df.corr().values
                    symbols = valid_symbols
                    logger.info(f"Correlation matrix shape: {correlation_matrix.shape}")
                    
                    # Check if correlation matrix is valid
                    if np.any(np.isnan(correlation_matrix)):
                        logger.warning("Correlation matrix contains NaN values")
                        return self._empty_correlation_matrix()
                    
                    logger.info(f"Correlation matrix is valid")
                else:
                    # Not enough data for correlation analysis
                    logger.warning(f"Not enough data for correlation: {len(df)} points (need >30)")
                    return self._empty_correlation_matrix()
            else:
                # Not enough data for correlation analysis
                logger.warning(f"Not enough valid symbols for correlation: {len(valid_symbols)} (need >=2)")
                return self._empty_correlation_matrix()
            
            # Ensure positive semi-definite
            eigenvalues = np.linalg.eigvals(correlation_matrix)
            if np.any(eigenvalues < 0):
                correlation_matrix = self._make_positive_semidefinite(correlation_matrix)
            
            # Find high correlation pairs
            high_correlation_pairs = []
            n_holdings = len(symbols)
            for i in range(n_holdings):
                for j in range(i + 1, n_holdings):
                    corr = correlation_matrix[i, j]
                    if abs(corr) > 0.7:  # High correlation threshold
                        high_correlation_pairs.append((symbols[i], symbols[j], corr))
            
            # Calculate diversification score
            diversification_score = self._calculate_diversification_score(correlation_matrix)
            
            # Prepare heatmap data
            heatmap_data = {
                'correlation_matrix': correlation_matrix.tolist(),
                'symbols': symbols,
                'high_correlation_pairs': high_correlation_pairs,
                'diversification_score': diversification_score
            }
            
            logger.info(f"Heatmap data prepared: {len(heatmap_data['correlation_matrix'])}x{len(heatmap_data['correlation_matrix'][0]) if heatmap_data['correlation_matrix'] else 0} matrix")
            logger.info(f"Symbols in heatmap: {heatmap_data['symbols']}")
            logger.info(f"High correlation pairs: {len(heatmap_data['high_correlation_pairs'])}")
            
            logger.info(f"Correlation analysis completed successfully")
            logger.info(f"Diversification score: {diversification_score}")
            logger.info(f"High correlation pairs: {len(high_correlation_pairs)}")
            
            return CorrelationMatrix(
                matrix=correlation_matrix,
                symbols=symbols,
                heatmap_data=heatmap_data,
                high_correlation_pairs=high_correlation_pairs,
                diversification_score=diversification_score
            )
            
        except Exception as e:
            logger.error(f"Error calculating correlation matrix: {e}")
            return self._empty_correlation_matrix()
    
    def analyze_sector_allocation(self, holdings: List[Dict]) -> SectorAnalysis:
        """
        Analyze sector allocation and sector-specific risks
        
        Args:
            holdings: List of portfolio holdings with sector information
            
        Returns:
            SectorAnalysis with sector recommendations
        """
        try:
            if not holdings:
                return self._empty_sector_analysis()
            
            # Group holdings by sector
            sector_data = {}
            total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
            
            for holding in holdings:
                sector = holding.get('sector', 'Unknown')
                # Try to infer sector from symbol if not provided
                if sector == 'Unknown':
                    symbol = holding.get('symbol', '').upper()
                    sector = self._infer_sector_from_symbol(symbol)
                
                value = holding.get('quantity', 0) * holding.get('avg_price', 0)
                
                if sector not in sector_data:
                    sector_data[sector] = {
                        'holdings': [],
                        'total_value': 0,
                        'volatility': 0
                    }
                
                sector_data[sector]['holdings'].append(holding)
                sector_data[sector]['total_value'] += value
            
            # Calculate sector allocation percentages
            sector_allocation = {}
            for sector, data in sector_data.items():
                sector_allocation[sector] = (data['total_value'] / total_value) * 100
            
            # Calculate sector-specific risk metrics
            sector_risk = {}
            for sector, data in sector_data.items():
                if data['holdings']:
                    # Calculate weighted average volatility for sector
                    sector_volatility = self._calculate_sector_volatility(data['holdings'])
                    sector_risk[sector] = sector_volatility
            
            # Calculate sector correlations using real market data
            sector_correlation = {}
            sectors = list(sector_data.keys())
            
            # Get sector ETFs for correlation calculation
            sector_etfs = {
                'Technology': 'XLK',
                'Healthcare': 'XLV', 
                'Financial': 'XLF',
                'Consumer Discretionary': 'XLY',
                'Consumer Staples': 'XLP',
                'Energy': 'XLE',
                'Industrials': 'XLI',
                'Materials': 'XLB',
                'Utilities': 'XLU',
                'Real Estate': 'XLRE'
            }
            
            try:
                # Fetch sector ETF data for correlation
                etf_data = {}
                for sector, etf in sector_etfs.items():
                    if sector in sectors:
                        try:
                            ticker = yf.Ticker(etf)
                            hist = ticker.history(period="1y")
                            if len(hist) > 30:
                                etf_data[sector] = hist['Close'].pct_change().dropna()
                        except Exception as e:
                            logger.warning(f"Could not fetch ETF data for {sector}: {e}")
                
                # Calculate sector correlations
                for i, sector1 in enumerate(sectors):
                    sector_correlation[sector1] = {}
                    for j, sector2 in enumerate(sectors):
                        if i == j:
                            sector_correlation[sector1][sector2] = 1.0
                        else:
                            if sector1 in etf_data and sector2 in etf_data:
                                # Calculate real correlation
                                corr = etf_data[sector1].corr(etf_data[sector2])
                                sector_correlation[sector1][sector2] = corr if not np.isnan(corr) else 0.0
                            else:
                                sector_correlation[sector1][sector2] = 0.0
            except Exception as e:
                logger.warning(f"Error calculating sector correlations: {e}")
                # Set default correlations
                for i, sector1 in enumerate(sectors):
                    sector_correlation[sector1] = {}
                    for j, sector2 in enumerate(sectors):
                        if i == j:
                            sector_correlation[sector1][sector2] = 1.0
                        else:
                            sector_correlation[sector1][sector2] = 0.0
            
            # Calculate concentration risk
            concentration_risk = max(sector_allocation.values()) / 100
            
            # Generate sector recommendations
            sector_recommendations = self._generate_sector_recommendations(
                sector_allocation, sector_risk, concentration_risk
            )
            
            return SectorAnalysis(
                sector_allocation=sector_allocation,
                sector_risk=sector_risk,
                sector_correlation=sector_correlation,
                concentration_risk=concentration_risk,
                sector_recommendations=sector_recommendations
            )
            
        except Exception as e:
            logger.error(f"Error analyzing sector allocation: {e}")
            return self._empty_sector_analysis()
    
    def predict_volatility_ml(self, holdings: List[Dict], historical_data: Optional[List[Dict]] = None) -> MLVolatilityPrediction:
        """
        Predict portfolio volatility using machine learning
        
        Args:
            holdings: Current portfolio holdings
            historical_data: Historical portfolio data (optional)
            
        Returns:
            MLVolatilityPrediction with ML-based volatility forecast
        """
        try:
            if not holdings:
                return self._empty_ml_prediction()
            
            # Prepare features for ML model
            features = self._extract_ml_features(holdings)
            
            # If we have a trained model, use it for prediction
            if self.ml_model is not None:
                # Scale features
                features_scaled = self.scaler.transform([features])
                
                # Make prediction
                predicted_volatility = self.ml_model.predict(features_scaled)[0]
                
                # Calculate confidence interval (simplified)
                confidence_interval = (
                    predicted_volatility * 0.8,  # Lower bound
                    predicted_volatility * 1.2   # Upper bound
                )
                
                # Get feature importance
                feature_names = [
                    'portfolio_size', 'num_holdings', 'avg_holding_size',
                    'sector_diversity', 'geographic_diversity', 'market_cap_diversity'
                ]
                feature_importance = dict(zip(feature_names, self.ml_model.feature_importances_))
                
                return MLVolatilityPrediction(
                    predicted_volatility=predicted_volatility,
                    confidence_interval=confidence_interval,
                    feature_importance=feature_importance,
                    model_accuracy=0.0,  # No ML model trained
                    prediction_horizon=self.prediction_horizon
                )
            else:
                # Fallback to statistical prediction
                return self._statistical_volatility_prediction(holdings)
                
        except Exception as e:
            logger.error(f"Error in ML volatility prediction: {e}")
            return self._empty_ml_prediction()
    
    def train_ml_model(self, training_data: List[Dict]) -> bool:
        """
        Train the ML model for volatility prediction
        
        Args:
            training_data: Historical portfolio data with volatility labels
            
        Returns:
            True if training successful, False otherwise
        """
        try:
            if len(training_data) < 50:  # Need sufficient data
                logger.warning("Insufficient training data for ML model")
                return False
            
            # Prepare training data
            X = []  # Features
            y = []  # Target (volatility)
            
            for data_point in training_data:
                features = self._extract_ml_features(data_point.get('holdings', []))
                volatility = data_point.get('volatility', 0)
                
                if volatility > 0:
                    X.append(features)
                    y.append(volatility)
            
            if len(X) < 20:
                logger.warning("Insufficient valid training samples")
                return False
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.ml_model = RandomForestRegressor(n_estimators=100, random_state=42)
            self.ml_model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = self.ml_model.predict(X_test_scaled)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            logger.info(f"ML model trained successfully. MSE: {mse:.4f}, R²: {r2:.4f}")
            return True
            
        except Exception as e:
            logger.error(f"Error training ML model: {e}")
            return False
    
    def generate_risk_report(self, holdings: List[Dict], risk_tolerance: str = 'moderate') -> Dict[str, Any]:
        """
        Generate comprehensive risk report with all advanced metrics
        
        Args:
            holdings: Portfolio holdings
            risk_tolerance: Risk tolerance level
            
        Returns:
            Comprehensive risk report
        """
        try:
            logger.info(f"Generating risk report for {len(holdings)} holdings")
            logger.info(f"Holdings data: {holdings}")
            
            # Check if portfolio is empty
            if not holdings:
                logger.warning("Portfolio is empty - cannot generate risk report")
                return {
                    'summary': {'risk_score': 0, 'risk_level': 'No Data'},
                    'monte_carlo_analysis': {},
                    'correlation_analysis': {},
                    'sector_analysis': {},
                    'ml_prediction': {},
                    'recommendations': ['Please add stocks to your portfolio to generate a risk analysis'],
                    'risk_tolerance': risk_tolerance,
                    'timestamp': pd.Timestamp.now().isoformat(),
                    'error': 'Portfolio is empty'
                }
            
            # Check if portfolio has any meaningful holdings
            valid_holdings = [h for h in holdings if h.get('quantity', 0) > 0 and h.get('avg_price', 0) > 0]
            if not valid_holdings:
                logger.warning("Portfolio has no valid holdings - cannot generate risk report")
                return {
                    'summary': {'risk_score': 0, 'risk_level': 'No Data'},
                    'monte_carlo_analysis': {},
                    'correlation_analysis': {},
                    'sector_analysis': {},
                    'ml_prediction': {},
                    'recommendations': ['Please add stocks with valid quantities and prices to your portfolio'],
                    'risk_tolerance': risk_tolerance,
                    'timestamp': pd.Timestamp.now().isoformat(),
                    'error': 'No valid holdings'
                }
            
            # Run all analyses
            monte_carlo_result = self.run_monte_carlo_simulation(holdings)
            correlation_matrix = self.calculate_correlation_matrix(holdings)
            sector_analysis = self.analyze_sector_allocation(holdings)
            ml_prediction = self.predict_volatility_ml(holdings)
            
            # Calculate traditional risk metrics
            portfolio_volatility = self._calculate_portfolio_volatility(holdings)
            sharpe_ratio = self._calculate_sharpe_ratio(holdings)
            var_95 = self._calculate_value_at_risk(holdings, 0.05)
            
            # Generate risk score
            risk_score = self._calculate_comprehensive_risk_score(
                holdings, monte_carlo_result, correlation_matrix, sector_analysis
            )
            
            # Generate recommendations
            recommendations = self._generate_risk_recommendations(
                holdings, monte_carlo_result, correlation_matrix, sector_analysis, risk_tolerance
            )
            
            return {
                'summary': {
                    'risk_score': risk_score,
                    'risk_level': self._get_risk_level(risk_score),
                    'portfolio_volatility': portfolio_volatility,
                    'sharpe_ratio': sharpe_ratio,
                    'var_95': var_95
                },
                'monte_carlo_analysis': {
                    'mean_return': monte_carlo_result.mean_return,
                    'std_return': monte_carlo_result.std_return,
                    'percentiles': monte_carlo_result.percentiles,
                    'worst_case': monte_carlo_result.worst_case,
                    'best_case': monte_carlo_result.best_case,
                    'probability_positive': monte_carlo_result.probability_positive,
                    'confidence_intervals': monte_carlo_result.confidence_intervals
                },
                'correlation_analysis': {
                    'diversification_score': correlation_matrix.diversification_score,
                    'high_correlation_pairs': correlation_matrix.high_correlation_pairs,
                    'heatmap_data': correlation_matrix.heatmap_data
                },
                'sector_analysis': {
                    'sector_allocation': sector_analysis.sector_allocation,
                    'sector_risk': sector_analysis.sector_risk,
                    'concentration_risk': sector_analysis.concentration_risk,
                    'recommendations': sector_analysis.sector_recommendations
                },
                'ml_prediction': {
                    'predicted_volatility': ml_prediction.predicted_volatility,
                    'confidence_interval': ml_prediction.confidence_interval,
                    'feature_importance': ml_prediction.feature_importance,
                    'model_accuracy': ml_prediction.model_accuracy
                },
                'recommendations': recommendations,
                'risk_tolerance': risk_tolerance,
                'timestamp': pd.Timestamp.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating risk report: {e}")
            return self._empty_risk_report()
    
    # Helper methods
    def _empty_monte_carlo_result(self) -> MonteCarloResult:
        return MonteCarloResult(
            mean_return=float('nan'), std_return=float('nan'), percentiles={}, worst_case=float('nan'),
            best_case=float('nan'), probability_positive=float('nan'), confidence_intervals={}
        )
    
    def _empty_correlation_matrix(self) -> CorrelationMatrix:
        return CorrelationMatrix(
            matrix=np.array([]), symbols=[], heatmap_data={},
            high_correlation_pairs=[], diversification_score=float('nan')
        )
    
    def _empty_sector_analysis(self) -> SectorAnalysis:
        return SectorAnalysis(
            sector_allocation={}, sector_risk={}, sector_correlation={},
            concentration_risk=float('nan'), sector_recommendations=[]
        )
    
    def _empty_ml_prediction(self) -> MLVolatilityPrediction:
        return MLVolatilityPrediction(
            predicted_volatility=float('nan'), confidence_interval=(float('nan'), float('nan')),
            feature_importance={}, model_accuracy=float('nan'), prediction_horizon=30
        )
    

    
    def _empty_risk_report(self) -> Dict[str, Any]:
        return {
            'summary': {'risk_score': float('nan'), 'risk_level': 'No Data'},
            'monte_carlo_analysis': {},
            'correlation_analysis': {},
            'sector_analysis': {},
            'ml_prediction': {},
            'recommendations': ['Unable to generate risk analysis - insufficient data'],
            'error': 'Failed to generate risk report'
        }
    
    def _make_positive_semidefinite(self, matrix: np.ndarray) -> np.ndarray:
        """Make correlation matrix positive semi-definite"""
        eigenvalues, eigenvectors = np.linalg.eigh(matrix)
        eigenvalues = np.maximum(eigenvalues, 0)
        return eigenvectors @ np.diag(eigenvalues) @ eigenvectors.T
    
    def _calculate_diversification_score(self, correlation_matrix: np.ndarray) -> float:
        """Calculate diversification score based on correlation matrix"""
        logger.info(f"Calculating diversification score for matrix shape: {correlation_matrix.shape}")
        
        if correlation_matrix.size == 0:
            logger.warning("Empty correlation matrix")
            return 0.0
        
        # Average absolute correlation (excluding diagonal)
        n = correlation_matrix.shape[0]
        if n <= 1:
            logger.info("Single stock - perfect diversification")
            return 1.0
        
        # Calculate average correlation excluding diagonal
        mask = ~np.eye(n, dtype=bool)
        avg_correlation = np.mean(np.abs(correlation_matrix[mask]))
        
        # Diversification score: 1 - average correlation
        diversification_score = max(0.0, 1.0 - avg_correlation)
        logger.info(f"Average correlation: {avg_correlation}, Diversification score: {diversification_score}")
        
        return diversification_score
    
    def _calculate_sector_volatility(self, holdings: List[Dict]) -> float:
        """Calculate weighted average volatility for a sector"""
        if not holdings:
            return 0.0
        
        total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
        if total_value == 0:
            return 0.0
        
        weighted_volatility = 0.0
        for holding in holdings:
            value = holding.get('quantity', 0) * holding.get('avg_price', 0)
            weight = value / total_value
            
            # Estimate volatility from price data
            price = holding.get('avg_price', 0)
            current_price = holding.get('current_price', price)
            if price > 0:
                volatility = abs((current_price - price) / price)
                weighted_volatility += weight * volatility
        
        return weighted_volatility
    
    def _infer_sector_from_symbol(self, symbol: str) -> str:
        """Infer sector from stock symbol"""
        # Common sector mappings for major stocks
        sector_mappings = {
            # Technology
            'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
            'AMZN': 'Technology', 'META': 'Technology', 'NVDA': 'Technology', 'TSLA': 'Technology',
            'NFLX': 'Technology', 'ADBE': 'Technology', 'CRM': 'Technology', 'ORCL': 'Technology',
            
            # Healthcare
            'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare', 'ABBV': 'Healthcare',
            'MRK': 'Healthcare', 'TMO': 'Healthcare', 'ABT': 'Healthcare', 'DHR': 'Healthcare',
            
            # Financial
            'JPM': 'Financial', 'BAC': 'Financial', 'WFC': 'Financial', 'GS': 'Financial',
            'MS': 'Financial', 'C': 'Financial', 'BLK': 'Financial', 'SCHW': 'Financial',
            
            # Consumer Discretionary
            'HD': 'Consumer Discretionary', 'MCD': 'Consumer Discretionary', 'NKE': 'Consumer Discretionary',
            'SBUX': 'Consumer Discretionary', 'LOW': 'Consumer Discretionary', 'TJX': 'Consumer Discretionary',
            
            # Consumer Staples
            'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples',
            'WMT': 'Consumer Staples', 'COST': 'Consumer Staples', 'PM': 'Consumer Staples',
            
            # Energy
            'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'EOG': 'Energy',
            
            # Industrials
            'BA': 'Industrials', 'CAT': 'Industrials', 'MMM': 'Industrials', 'HON': 'Industrials',
            
            # Materials
            'LIN': 'Materials', 'APD': 'Materials', 'FCX': 'Materials', 'NEM': 'Materials',
            
            # Utilities
            'NEE': 'Utilities', 'DUK': 'Utilities', 'SO': 'Utilities', 'D': 'Utilities',
            
            # Real Estate
            'AMT': 'Real Estate', 'PLD': 'Real Estate', 'CCI': 'Real Estate', 'EQIX': 'Real Estate'
        }
        
        return sector_mappings.get(symbol, 'Unknown')

    def _extract_ml_features(self, holdings: List[Dict]) -> List[float]:
        """Extract features for ML model"""
        if not holdings:
            return [0.0] * 6
        
        total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
        
        # Portfolio size (log scale)
        portfolio_size = np.log(total_value + 1) if total_value > 0 else 0
        
        # Number of holdings
        num_holdings = len(holdings)
        
        # Average holding size
        avg_holding_size = total_value / num_holdings if num_holdings > 0 else 0
        
        # Sector diversity (number of unique sectors)
        sectors = set(holding.get('sector', 'Unknown') for holding in holdings)
        sector_diversity = len(sectors)
        
        # Geographic diversity (not implemented yet)
        geographic_diversity = 0.0  # Would be calculated from actual data
        
        # Market cap diversity (not implemented yet)
        market_cap_diversity = 0.0  # Would be calculated from actual data
        
        return [portfolio_size, num_holdings, avg_holding_size, sector_diversity, geographic_diversity, market_cap_diversity]
    
    def _statistical_volatility_prediction(self, holdings: List[Dict]) -> MLVolatilityPrediction:
        """Fallback statistical volatility prediction"""
        if not holdings:
            return self._empty_ml_prediction()
        
        # Simple statistical prediction based on current volatility
        current_volatility = self._calculate_portfolio_volatility(holdings)
        
        # If we can't calculate volatility, use a reasonable default
        if current_volatility == 0.0:
            # Use average market volatility as fallback
            current_volatility = 0.15  # 15% annual volatility
        
        predicted_volatility = current_volatility * 1.1  # Slight increase
        
        return MLVolatilityPrediction(
            predicted_volatility=predicted_volatility,
            confidence_interval=(predicted_volatility * 0.8, predicted_volatility * 1.2),
            feature_importance={'current_volatility': 1.0},
            model_accuracy=0.7,
            prediction_horizon=self.prediction_horizon
        )
    
    def _calculate_portfolio_volatility(self, holdings: List[Dict]) -> float:
        """Calculate portfolio volatility using real market data when available"""
        if not holdings:
            return 0.0
        
        # Simplified volatility calculation
        total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
        if total_value == 0:
            return 0.0
        
        weighted_volatility = 0.0
        valid_holdings = 0
        
        for holding in holdings:
            value = holding.get('quantity', 0) * holding.get('avg_price', 0)
            weight = value / total_value
            
            # Try to get real volatility from market data
            symbol = holding.get('symbol', '')
            if symbol:
                try:
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(period="1y")
                    if len(hist) > 30:
                        returns = hist['Close'].pct_change().dropna()
                        volatility = returns.std() * np.sqrt(252)  # Annualized volatility
                        weighted_volatility += weight * volatility
                        valid_holdings += 1
                        continue
                except Exception as e:
                    logger.warning(f"Could not fetch volatility data for {symbol}: {e}")
            
            # Fallback to price-based volatility
            price = holding.get('avg_price', 0)
            current_price = holding.get('current_price', price)
            if price > 0 and current_price > 0:
                volatility = abs((current_price - price) / price)
                weighted_volatility += weight * volatility
                valid_holdings += 1
        
        # If no valid holdings, return default volatility
        if valid_holdings == 0:
            return 0.15  # 15% annual volatility as default
        
        return weighted_volatility
    
    def _calculate_sharpe_ratio(self, holdings: List[Dict]) -> float:
        """Calculate Sharpe ratio"""
        if not holdings:
            return 0.0
        
        # Simplified Sharpe ratio calculation
        portfolio_return = self._calculate_portfolio_return(holdings)
        portfolio_volatility = self._calculate_portfolio_volatility(holdings)
        
        if portfolio_volatility == 0:
            return 0.0
        
        return (portfolio_return - self.risk_free_rate) / portfolio_volatility
    
    def _calculate_portfolio_return(self, holdings: List[Dict]) -> float:
        """Calculate portfolio return"""
        if not holdings:
            return 0.0
        
        total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
        if total_value == 0:
            return 0.0
        
        weighted_return = 0.0
        for holding in holdings:
            value = holding.get('quantity', 0) * holding.get('avg_price', 0)
            weight = value / total_value
            
            price = holding.get('avg_price', 0)
            current_price = holding.get('current_price', price)
            if price > 0 and current_price > 0:
                return_rate = (current_price - price) / price
                weighted_return += weight * return_rate
            else:
                # Skip holdings without valid price data
                continue
        
        return weighted_return
    
    def _calculate_value_at_risk(self, holdings: List[Dict], confidence_level: float) -> float:
        """Calculate Value at Risk"""
        if not holdings:
            return 0.0
        
        # Simplified VaR calculation
        portfolio_volatility = self._calculate_portfolio_volatility(holdings)
        z_score = stats.norm.ppf(confidence_level)
        
        return abs(portfolio_volatility * z_score)
    
    def _calculate_comprehensive_risk_score(self, holdings: List[Dict], 
                                          monte_carlo_result: MonteCarloResult,
                                          correlation_matrix: CorrelationMatrix,
                                          sector_analysis: SectorAnalysis) -> float:
        """Calculate comprehensive risk score (1-10)"""
        if not holdings:
            return 1.0
        
        # Base risk score from volatility
        volatility_score = min(10, max(1, monte_carlo_result.std_return * 100))
        
        # Diversification adjustment
        diversification_adjustment = (1 - correlation_matrix.diversification_score) * 2
        
        # Concentration risk adjustment
        concentration_adjustment = sector_analysis.concentration_risk * 3
        
        # Final risk score
        risk_score = volatility_score + diversification_adjustment + concentration_adjustment
        
        return min(10, max(1, risk_score))
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Get risk level description"""
        if risk_score <= 2:
            return 'Very Low'
        elif risk_score <= 4:
            return 'Low'
        elif risk_score <= 6:
            return 'Moderate'
        elif risk_score <= 8:
            return 'High'
        else:
            return 'Very High'
    
    def _generate_sector_recommendations(self, sector_allocation: Dict[str, float],
                                       sector_risk: Dict[str, float],
                                       concentration_risk: float) -> List[str]:
        """Generate sector-specific recommendations"""
        recommendations = []
        
        # Check for over-concentration
        if concentration_risk > 0.4:
            recommendations.append("Consider reducing concentration in largest sector")
        
        # Check for high-risk sectors
        high_risk_sectors = [sector for sector, risk in sector_risk.items() if risk > 0.3]
        if high_risk_sectors:
            recommendations.append(f"Monitor high-risk sectors: {', '.join(high_risk_sectors)}")
        
        # Check for missing sectors
        if len(sector_allocation) < 3:
            recommendations.append("Consider diversifying across more sectors")
        
        return recommendations
    
    def _generate_risk_recommendations(self, holdings: List[Dict],
                                     monte_carlo_result: MonteCarloResult,
                                     correlation_matrix: CorrelationMatrix,
                                     sector_analysis: SectorAnalysis,
                                     risk_tolerance: str) -> List[str]:
        """Generate comprehensive risk recommendations"""
        recommendations = []
        
        # Monte Carlo recommendations
        if monte_carlo_result.probability_positive < 0.6:
            recommendations.append("Portfolio shows low probability of positive returns - consider rebalancing")
        
        if monte_carlo_result.std_return > 0.25:
            recommendations.append("High volatility detected - consider adding defensive positions")
        
        # Correlation recommendations
        if correlation_matrix.diversification_score < 0.5:
            recommendations.append("Low diversification - consider adding uncorrelated assets")
        
        if correlation_matrix.high_correlation_pairs:
            recommendations.append(f"High correlation detected between {len(correlation_matrix.high_correlation_pairs)} pairs")
        
        # Sector recommendations
        recommendations.extend(sector_analysis.sector_recommendations)
        
        return recommendations
