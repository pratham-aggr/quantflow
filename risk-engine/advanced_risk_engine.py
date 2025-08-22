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
            if not holdings:
                return self._empty_monte_carlo_result()
            
            # Calculate historical returns and volatility for each holding
            returns_data = []
            weights = []
            total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
            
            for holding in holdings:
                # Generate synthetic returns based on price data
                price = holding.get('avg_price', 0)
                current_price = holding.get('current_price', price)
                quantity = holding.get('quantity', 0)
                
                if price > 0 and quantity > 0:
                    # Calculate weight
                    weight = (price * quantity) / total_value
                    weights.append(weight)
                    
                    # Generate synthetic daily returns (normal distribution)
                    # In a real implementation, you'd use historical price data
                    daily_return = (current_price - price) / price / 252  # Annualized daily return
                    volatility = abs(daily_return) * 2  # Estimate volatility
                    
                    returns_data.append({
                        'mean_return': daily_return,
                        'volatility': volatility
                    })
            
            if not returns_data:
                return self._empty_monte_carlo_result()
            
            # Run Monte Carlo simulation
            portfolio_returns = []
            
            for _ in range(self.monte_carlo_simulations):
                # Generate random returns for each holding
                holding_returns = []
                for i, data in enumerate(returns_data):
                    # Generate random return from normal distribution
                    random_return = np.random.normal(data['mean_return'], data['volatility'])
                    holding_returns.append(random_return * weights[i])
                
                # Calculate portfolio return
                portfolio_return = sum(holding_returns)
                portfolio_returns.append(portfolio_return)
            
            portfolio_returns = np.array(portfolio_returns)
            
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
            
            return MonteCarloResult(
                mean_return=mean_return,
                std_return=std_return,
                percentiles=percentiles,
                worst_case=np.min(portfolio_returns),
                best_case=np.max(portfolio_returns),
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
            if len(holdings) < 2:
                return self._empty_correlation_matrix()
            
            symbols = [holding.get('symbol', f'Holding_{i}') for i, holding in enumerate(holdings)]
            
            # Generate synthetic correlation matrix based on sectors
            # In a real implementation, you'd use historical price data
            n_holdings = len(holdings)
            correlation_matrix = np.random.uniform(-0.3, 0.8, (n_holdings, n_holdings))
            
            # Make matrix symmetric and set diagonal to 1
            correlation_matrix = (correlation_matrix + correlation_matrix.T) / 2
            np.fill_diagonal(correlation_matrix, 1.0)
            
            # Ensure positive semi-definite
            eigenvalues = np.linalg.eigvals(correlation_matrix)
            if np.any(eigenvalues < 0):
                correlation_matrix = self._make_positive_semidefinite(correlation_matrix)
            
            # Find high correlation pairs
            high_correlation_pairs = []
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
            
            # Calculate sector correlations (simplified)
            sector_correlation = {}
            sectors = list(sector_data.keys())
            for i, sector1 in enumerate(sectors):
                sector_correlation[sector1] = {}
                for j, sector2 in enumerate(sectors):
                    if i == j:
                        sector_correlation[sector1][sector2] = 1.0
                    else:
                        # Generate synthetic correlation
                        sector_correlation[sector1][sector2] = np.random.uniform(-0.2, 0.6)
            
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
                    model_accuracy=0.85,  # Placeholder
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
            mean_return=0.0, std_return=0.0, percentiles={}, worst_case=0.0,
            best_case=0.0, probability_positive=0.0, confidence_intervals={}
        )
    
    def _empty_correlation_matrix(self) -> CorrelationMatrix:
        return CorrelationMatrix(
            matrix=np.array([]), symbols=[], heatmap_data={},
            high_correlation_pairs=[], diversification_score=0.0
        )
    
    def _empty_sector_analysis(self) -> SectorAnalysis:
        return SectorAnalysis(
            sector_allocation={}, sector_risk={}, sector_correlation={},
            concentration_risk=0.0, sector_recommendations=[]
        )
    
    def _empty_ml_prediction(self) -> MLVolatilityPrediction:
        return MLVolatilityPrediction(
            predicted_volatility=0.0, confidence_interval=(0.0, 0.0),
            feature_importance={}, model_accuracy=0.0, prediction_horizon=30
        )
    
    def _empty_risk_report(self) -> Dict[str, Any]:
        return {
            'summary': {'risk_score': 1, 'risk_level': 'Very Low'},
            'monte_carlo_analysis': {},
            'correlation_analysis': {},
            'sector_analysis': {},
            'ml_prediction': {},
            'recommendations': [],
            'error': 'Failed to generate risk report'
        }
    
    def _make_positive_semidefinite(self, matrix: np.ndarray) -> np.ndarray:
        """Make correlation matrix positive semi-definite"""
        eigenvalues, eigenvectors = np.linalg.eigh(matrix)
        eigenvalues = np.maximum(eigenvalues, 0)
        return eigenvectors @ np.diag(eigenvalues) @ eigenvectors.T
    
    def _calculate_diversification_score(self, correlation_matrix: np.ndarray) -> float:
        """Calculate diversification score based on correlation matrix"""
        if correlation_matrix.size == 0:
            return 0.0
        
        # Average absolute correlation (excluding diagonal)
        n = correlation_matrix.shape[0]
        if n <= 1:
            return 1.0
        
        # Calculate average correlation excluding diagonal
        mask = ~np.eye(n, dtype=bool)
        avg_correlation = np.mean(np.abs(correlation_matrix[mask]))
        
        # Diversification score: 1 - average correlation
        return max(0.0, 1.0 - avg_correlation)
    
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
        
        # Geographic diversity (placeholder)
        geographic_diversity = 1.0  # Would be calculated from actual data
        
        # Market cap diversity (placeholder)
        market_cap_diversity = 1.0  # Would be calculated from actual data
        
        return [portfolio_size, num_holdings, avg_holding_size, sector_diversity, geographic_diversity, market_cap_diversity]
    
    def _statistical_volatility_prediction(self, holdings: List[Dict]) -> MLVolatilityPrediction:
        """Fallback statistical volatility prediction"""
        if not holdings:
            return self._empty_ml_prediction()
        
        # Simple statistical prediction based on current volatility
        current_volatility = self._calculate_portfolio_volatility(holdings)
        predicted_volatility = current_volatility * 1.1  # Slight increase
        
        return MLVolatilityPrediction(
            predicted_volatility=predicted_volatility,
            confidence_interval=(predicted_volatility * 0.8, predicted_volatility * 1.2),
            feature_importance={'current_volatility': 1.0},
            model_accuracy=0.7,
            prediction_horizon=self.prediction_horizon
        )
    
    def _calculate_portfolio_volatility(self, holdings: List[Dict]) -> float:
        """Calculate portfolio volatility"""
        if not holdings:
            return 0.0
        
        # Simplified volatility calculation
        total_value = sum(holding.get('quantity', 0) * holding.get('avg_price', 0) for holding in holdings)
        if total_value == 0:
            return 0.0
        
        weighted_volatility = 0.0
        for holding in holdings:
            value = holding.get('quantity', 0) * holding.get('avg_price', 0)
            weight = value / total_value
            
            price = holding.get('avg_price', 0)
            current_price = holding.get('current_price', price)
            if price > 0:
                volatility = abs((current_price - price) / price)
                weighted_volatility += weight * volatility
        
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
            if price > 0:
                return_rate = (current_price - price) / price
                weighted_return += weight * return_rate
        
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
