import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Dict, List, Tuple, Optional
import json
from dataclasses import dataclass
from datetime import datetime

@dataclass
class RebalancingTarget:
    symbol: str
    target_allocation: float  # Percentage (0-100)
    min_allocation: float = 0.0
    max_allocation: float = 100.0

@dataclass
class RebalancingSuggestion:
    symbol: str
    action: str  # 'BUY' or 'SELL'
    quantity: int
    current_value: float
    target_value: float
    drift_percentage: float
    estimated_cost: float
    priority: str  # 'HIGH', 'MEDIUM', 'LOW'

@dataclass
class RebalancingAnalysis:
    current_allocation: Dict[str, float]
    target_allocation: Dict[str, float]
    drift_analysis: Dict[str, float]
    suggestions: List[RebalancingSuggestion]
    total_drift: float
    estimated_transaction_cost: float
    rebalancing_score: float  # 0-100, higher means more rebalancing needed
    optimization_method: str

class RebalancingEngine:
    def __init__(self, transaction_cost_rate: float = 0.005, min_trade_threshold: float = 100.0):
        """
        Initialize the rebalancing engine
        
        Args:
            transaction_cost_rate: Percentage cost per transaction (default 0.5%)
            min_trade_threshold: Minimum trade value to consider (default $100)
        """
        self.transaction_cost_rate = transaction_cost_rate
        self.min_trade_threshold = min_trade_threshold
        
    def calculate_current_allocation(self, holdings: List[Dict]) -> Dict[str, float]:
        """Calculate current portfolio allocation percentages"""
        if not holdings:
            return {}
            
        total_value = sum(holding['quantity'] * holding.get('current_price', holding['avg_price']) 
                         for holding in holdings)
        
        if total_value == 0:
            return {}
            
        allocation = {}
        for holding in holdings:
            symbol = holding['symbol']
            value = holding['quantity'] * holding.get('current_price', holding['avg_price'])
            allocation[symbol] = (value / total_value) * 100
            
        return allocation
    
    def calculate_drift(self, current_allocation: Dict[str, float], 
                       target_allocation: Dict[str, float]) -> Dict[str, float]:
        """Calculate allocation drift from targets"""
        drift = {}
        for symbol in set(current_allocation.keys()) | set(target_allocation.keys()):
            current = current_allocation.get(symbol, 0)
            target = target_allocation.get(symbol, 0)
            drift[symbol] = current - target
        return drift
    
    def calculate_total_drift(self, drift_analysis: Dict[str, float]) -> float:
        """Calculate total portfolio drift"""
        return sum(abs(drift) for drift in drift_analysis.values())
    
    def optimize_portfolio(self, holdings: List[Dict], 
                         target_allocation: Dict[str, float],
                         constraints: Optional[Dict] = None) -> Dict[str, float]:
        """
        Optimize portfolio allocation using Modern Portfolio Theory
        
        Args:
            holdings: Current portfolio holdings
            target_allocation: Target allocation percentages
            constraints: Additional constraints (min/max allocations)
            
        Returns:
            Optimized target allocation
        """
        if not holdings:
            return target_allocation
            
        # Get current prices and values
        current_prices = {}
        current_values = {}
        total_value = 0
        
        for holding in holdings:
            symbol = holding['symbol']
            current_price = holding.get('current_price', holding['avg_price'])
            current_prices[symbol] = current_price
            current_values[symbol] = holding['quantity'] * current_price
            total_value += current_values[symbol]
        
        if total_value == 0:
            return target_allocation
        
        # Create optimization variables (allocation percentages)
        symbols = list(current_prices.keys())
        n_assets = len(symbols)
        
        # Initial guess: current allocation
        initial_weights = np.array([current_values.get(symbol, 0) / total_value * 100 
                                  for symbol in symbols])
        
        # Objective function: minimize drift from target while considering transaction costs
        def objective(weights):
            drift_penalty = 0
            transaction_penalty = 0
            
            for i, symbol in enumerate(symbols):
                target_weight = target_allocation.get(symbol, 0)
                drift = abs(weights[i] - target_weight)
                drift_penalty += drift ** 2
                
                # Transaction cost penalty
                current_weight = initial_weights[i]
                weight_change = abs(weights[i] - current_weight)
                if weight_change > 0.01:  # 1% threshold
                    transaction_penalty += weight_change * self.transaction_cost_rate
            
            return drift_penalty + transaction_penalty * 1000  # Scale transaction penalty
        
        # Constraints: weights must sum to 100%
        constraints_list = [
            {'type': 'eq', 'fun': lambda w: np.sum(w) - 100}
        ]
        
        # Add individual constraints if provided
        if constraints:
            for symbol, (min_alloc, max_alloc) in constraints.items():
                if symbol in symbols:
                    idx = symbols.index(symbol)
                    constraints_list.append({'type': 'ineq', 'fun': lambda w, i=idx, min_val=min_alloc: w[i] - min_val})
                    constraints_list.append({'type': 'ineq', 'fun': lambda w, i=idx, max_val=max_alloc: max_val - w[i]})
        
        # Bounds: weights must be non-negative
        bounds = [(0, 100) for _ in range(n_assets)]
        
        # Optimize
        result = minimize(objective, initial_weights, method='SLSQP', 
                         bounds=bounds, constraints=constraints_list)
        
        if result.success:
            optimized_allocation = {symbol: weight for symbol, weight in zip(symbols, result.x)}
            return optimized_allocation
        else:
            # Fallback to target allocation if optimization fails
            return target_allocation
    
    def generate_rebalancing_suggestions(self, holdings: List[Dict], 
                                       target_allocation: Dict[str, float],
                                       optimized_allocation: Optional[Dict[str, float]] = None) -> List[RebalancingSuggestion]:
        """Generate actionable rebalancing suggestions"""
        if not holdings:
            return []
        
        current_allocation = self.calculate_current_allocation(holdings)
        total_value = sum(holding['quantity'] * holding.get('current_price', holding['avg_price']) 
                         for holding in holdings)
        
        # Use optimized allocation if provided, otherwise use target
        target = optimized_allocation or target_allocation
        
        suggestions = []
        
        for holding in holdings:
            symbol = holding['symbol']
            current_price = holding.get('current_price', holding['avg_price'])
            current_quantity = holding['quantity']
            current_value = current_quantity * current_price
            
            current_pct = current_allocation.get(symbol, 0)
            target_pct = target.get(symbol, 0)
            
            target_value = (target_pct / 100) * total_value
            drift_percentage = current_pct - target_pct
            
            # Calculate required quantity change
            quantity_change = (target_value - current_value) / current_price
            
            # Skip if change is too small
            if abs(quantity_change * current_price) < self.min_trade_threshold:
                continue
            
            # Determine action and priority
            if quantity_change > 0:
                action = 'BUY'
                priority = 'HIGH' if abs(drift_percentage) > 5 else 'MEDIUM'
            else:
                action = 'SELL'
                priority = 'HIGH' if abs(drift_percentage) > 5 else 'MEDIUM'
            
            # Estimate transaction cost
            estimated_cost = abs(quantity_change * current_price) * self.transaction_cost_rate
            
            suggestion = RebalancingSuggestion(
                symbol=symbol,
                action=action,
                quantity=int(abs(quantity_change)),
                current_value=current_value,
                target_value=target_value,
                drift_percentage=drift_percentage,
                estimated_cost=estimated_cost,
                priority=priority
            )
            
            suggestions.append(suggestion)
        
        # Sort by priority and drift magnitude
        suggestions.sort(key=lambda x: (
            {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}[x.priority],
            abs(x.drift_percentage)
        ), reverse=True)
        
        return suggestions
    
    def analyze_rebalancing(self, holdings: List[Dict], 
                          target_allocation: Dict[str, float],
                          constraints: Optional[Dict] = None) -> RebalancingAnalysis:
        """
        Comprehensive rebalancing analysis
        
        Args:
            holdings: Current portfolio holdings
            target_allocation: Target allocation percentages
            constraints: Additional constraints for optimization
            
        Returns:
            Complete rebalancing analysis
        """
        current_allocation = self.calculate_current_allocation(holdings)
        drift_analysis = self.calculate_drift(current_allocation, target_allocation)
        total_drift = self.calculate_total_drift(drift_analysis)
        
        # Optimize portfolio
        optimized_allocation = self.optimize_portfolio(holdings, target_allocation, constraints)
        
        # Generate suggestions
        suggestions = self.generate_rebalancing_suggestions(holdings, target_allocation, optimized_allocation)
        
        # Calculate total transaction cost
        total_transaction_cost = sum(suggestion.estimated_cost for suggestion in suggestions)
        
        # Calculate rebalancing score (0-100)
        rebalancing_score = min(100, total_drift * 2)  # Scale drift to 0-100
        
        return RebalancingAnalysis(
            current_allocation=current_allocation,
            target_allocation=target_allocation,
            drift_analysis=drift_analysis,
            suggestions=suggestions,
            total_drift=total_drift,
            estimated_transaction_cost=total_transaction_cost,
            rebalancing_score=rebalancing_score,
            optimization_method='Modern Portfolio Theory'
        )
    
    def create_what_if_analysis(self, holdings: List[Dict], 
                               suggestions: List[RebalancingSuggestion]) -> Dict:
        """Create what-if analysis showing impact of proposed trades"""
        if not holdings or not suggestions:
            return {}
        
        # Calculate current portfolio metrics
        current_total = sum(holding['quantity'] * holding.get('current_price', holding['avg_price']) 
                           for holding in holdings)
        
        # Simulate rebalancing
        simulated_holdings = []
        total_transaction_cost = 0
        
        for holding in holdings:
            symbol = holding['symbol']
            suggestion = next((s for s in suggestions if s.symbol == symbol), None)
            
            current_quantity = holding['quantity']
            current_price = holding.get('current_price', holding['avg_price'])
            
            if suggestion:
                if suggestion.action == 'BUY':
                    new_quantity = current_quantity + suggestion.quantity
                else:
                    new_quantity = current_quantity - suggestion.quantity
                
                total_transaction_cost += suggestion.estimated_cost
            else:
                new_quantity = current_quantity
            
            simulated_holdings.append({
                'symbol': symbol,
                'quantity': new_quantity,
                'current_price': current_price,
                'value': new_quantity * current_price
            })
        
        simulated_total = sum(holding['value'] for holding in simulated_holdings)
        net_impact = simulated_total - current_total - total_transaction_cost
        
        return {
            'current_total_value': current_total,
            'simulated_total_value': simulated_total,
            'transaction_cost': total_transaction_cost,
            'net_impact': net_impact,
            'impact_percentage': (net_impact / current_total * 100) if current_total > 0 else 0,
            'simulated_holdings': simulated_holdings
        }

# Example usage and testing
if __name__ == "__main__":
    # Example holdings
    holdings = [
        {
            'symbol': 'AAPL',
            'quantity': 100,
            'avg_price': 150.0,
            'current_price': 175.0
        },
        {
            'symbol': 'MSFT',
            'quantity': 50,
            'avg_price': 280.0,
            'current_price': 320.0
        },
        {
            'symbol': 'GOOGL',
            'quantity': 25,
            'avg_price': 2500.0,
            'current_price': 2750.0
        }
    ]
    
    # Target allocation
    target_allocation = {
        'AAPL': 40,
        'MSFT': 35,
        'GOOGL': 25
    }
    
    # Initialize engine
    engine = RebalancingEngine(transaction_cost_rate=0.005, min_trade_threshold=100.0)
    
    # Run analysis
    analysis = engine.analyze_rebalancing(holdings, target_allocation)
    
    print("Rebalancing Analysis:")
    print(f"Total Drift: {analysis.total_drift:.2f}%")
    print(f"Rebalancing Score: {analysis.rebalancing_score:.1f}/100")
    print(f"Estimated Transaction Cost: ${analysis.estimated_transaction_cost:.2f}")
    print(f"Number of Suggestions: {len(analysis.suggestions)}")
    
    print("\nSuggestions:")
    for suggestion in analysis.suggestions:
        print(f"{suggestion.symbol}: {suggestion.action} {suggestion.quantity} shares "
              f"(Drift: {suggestion.drift_percentage:.1f}%, Priority: {suggestion.priority})")
    
    # What-if analysis
    what_if = engine.create_what_if_analysis(holdings, analysis.suggestions)
    print(f"\nWhat-if Analysis:")
    print(f"Net Impact: ${what_if['net_impact']:.2f} ({what_if['impact_percentage']:.2f}%)")
