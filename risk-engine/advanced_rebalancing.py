"""
Advanced Rebalancing Engine with Minimum Thresholds and Smart Execution
Extends the basic rebalancing engine with sophisticated features.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from rebalancing_engine import RebalancingEngine, RebalancingTarget, RebalancingSuggestion
from tax_loss_harvesting import TaxLossHarvestingEngine, TaxSettings

@dataclass
class RebalancingSettings:
    """Advanced rebalancing settings."""
    min_drift_threshold: float = 0.05  # 5% minimum drift before rebalancing
    min_transaction_size: float = 100.0  # Minimum transaction size
    max_transaction_cost: float = 10.0  # Maximum transaction cost per trade
    rebalancing_frequency: str = 'monthly'  # daily, weekly, monthly, quarterly
    tax_optimization: bool = True  # Enable tax-loss harvesting
    cash_reserve: float = 0.02  # 2% cash reserve
    tolerance_bands: Dict[str, float] = None  # Custom tolerance bands per asset
    
@dataclass
class TransactionCost:
    """Transaction cost structure."""
    fixed_cost: float = 0.0  # Fixed cost per transaction
    percentage_cost: float = 0.0  # Percentage cost of transaction value
    minimum_cost: float = 0.0  # Minimum cost per transaction
    
@dataclass
class RebalancingRecommendation:
    """Enhanced rebalancing recommendation."""
    symbol: str
    action: str  # 'BUY', 'SELL', 'HOLD'
    shares: float
    current_price: float
    target_value: float
    current_value: float
    drift: float
    priority: int  # 1 = high, 2 = medium, 3 = low
    cost_estimate: float
    tax_impact: float
    execution_timing: str  # 'immediate', 'end_of_day', 'next_session'
    reasoning: str

class AdvancedRebalancingEngine:
    """Advanced rebalancing engine with sophisticated features."""
    
    def __init__(
        self, 
        settings: Optional[RebalancingSettings] = None,
        tax_settings: Optional[TaxSettings] = None
    ):
        self.settings = settings or RebalancingSettings()
        self.base_engine = RebalancingEngine()
        self.tax_engine = TaxLossHarvestingEngine(tax_settings) if self.settings.tax_optimization else None
        
        # Default transaction costs (can be customized per broker)
        self.transaction_costs = {
            'stock': TransactionCost(fixed_cost=0.0, percentage_cost=0.0, minimum_cost=0.0),
            'etf': TransactionCost(fixed_cost=0.0, percentage_cost=0.0, minimum_cost=0.0),
            'mutual_fund': TransactionCost(fixed_cost=0.0, percentage_cost=0.25, minimum_cost=15.0)
        }
        
    def analyze_rebalancing_need(
        self, 
        current_allocation: Dict[str, float],
        target_allocation: Dict[str, float],
        portfolio_value: float,
        last_rebalance_date: Optional[datetime] = None
    ) -> Dict:
        """
        Determine if rebalancing is needed based on advanced criteria.
        
        Args:
            current_allocation: Current portfolio allocation
            target_allocation: Target portfolio allocation
            portfolio_value: Total portfolio value
            last_rebalance_date: Date of last rebalancing
            
        Returns:
            Analysis of rebalancing need
        """
        # Calculate drift for each asset
        drift_analysis = {}
        max_drift = 0.0
        total_drift = 0.0
        
        for symbol in target_allocation:
            current_weight = current_allocation.get(symbol, 0.0)
            target_weight = target_allocation[symbol]
            drift = abs(current_weight - target_weight)
            
            # Custom tolerance bands if specified
            tolerance = self.settings.tolerance_bands.get(symbol, self.settings.min_drift_threshold) \
                if self.settings.tolerance_bands else self.settings.min_drift_threshold
            
            drift_analysis[symbol] = {
                'current_weight': current_weight,
                'target_weight': target_weight,
                'drift': drift,
                'tolerance': tolerance,
                'exceeds_threshold': drift > tolerance,
                'drift_value': drift * portfolio_value
            }
            
            max_drift = max(max_drift, drift)
            total_drift += drift
        
        # Time-based rebalancing check
        time_based_rebalancing = self._check_time_based_rebalancing(last_rebalance_date)
        
        # Determine if rebalancing is needed
        threshold_exceeded = max_drift > self.settings.min_drift_threshold
        significant_drift_count = sum(
            1 for analysis in drift_analysis.values() 
            if analysis['exceeds_threshold']
        )
        
        rebalancing_needed = (
            threshold_exceeded or 
            time_based_rebalancing or 
            significant_drift_count >= 3
        )
        
        return {
            'rebalancing_needed': rebalancing_needed,
            'max_drift': max_drift,
            'total_drift': total_drift,
            'drift_analysis': drift_analysis,
            'significant_drifts': significant_drift_count,
            'time_based_trigger': time_based_rebalancing,
            'threshold_trigger': threshold_exceeded,
            'next_scheduled_rebalance': self._calculate_next_rebalance_date(last_rebalance_date)
        }
    
    def generate_smart_rebalancing_plan(
        self,
        holdings: List[Dict],
        target_allocation: Dict[str, float],
        transactions: Optional[List[Dict]] = None,
        market_conditions: Optional[Dict] = None
    ) -> Dict:
        """
        Generate intelligent rebalancing plan with tax optimization and cost minimization.
        
        Args:
            holdings: Current portfolio holdings
            target_allocation: Target allocation weights
            transactions: Historical transactions for tax analysis
            market_conditions: Current market conditions
            
        Returns:
            Comprehensive rebalancing plan
        """
        # Calculate current allocation and portfolio value
        total_value = sum(
            holding['quantity'] * holding.get('current_price', holding.get('avg_price', 0))
            for holding in holdings
        )
        
        current_allocation = {}
        for holding in holdings:
            symbol = holding['symbol']
            value = holding['quantity'] * holding.get('current_price', holding.get('avg_price', 0))
            current_allocation[symbol] = value / total_value if total_value > 0 else 0
        
        # Check if rebalancing is needed
        rebalancing_analysis = self.analyze_rebalancing_need(
            current_allocation, 
            target_allocation, 
            total_value
        )
        
        if not rebalancing_analysis['rebalancing_needed']:
            return {
                'rebalancing_needed': False,
                'analysis': rebalancing_analysis,
                'recommendations': [],
                'summary': {
                    'total_transactions': 0,
                    'estimated_costs': 0,
                    'tax_impact': 0
                }
            }
        
        # Generate basic rebalancing suggestions
        basic_suggestions = self.base_engine.generate_rebalancing_suggestions(
            current_allocation,
            target_allocation,
            total_value
        )
        
        # Apply minimum transaction filters
        filtered_suggestions = self._filter_minimum_transactions(basic_suggestions, total_value)
        
        # Optimize for tax efficiency
        if self.tax_engine and transactions:
            tax_optimized_suggestions = self._optimize_for_taxes(
                filtered_suggestions, 
                holdings, 
                transactions
            )
        else:
            tax_optimized_suggestions = filtered_suggestions
        
        # Generate enhanced recommendations
        recommendations = self._generate_enhanced_recommendations(
            tax_optimized_suggestions,
            holdings,
            market_conditions
        )
        
        # Calculate execution plan
        execution_plan = self._create_execution_plan(recommendations)
        
        return {
            'rebalancing_needed': True,
            'analysis': rebalancing_analysis,
            'recommendations': recommendations,
            'execution_plan': execution_plan,
            'summary': {
                'total_transactions': len(recommendations),
                'estimated_costs': execution_plan['total_costs'],
                'tax_impact': execution_plan['total_tax_impact'],
                'net_benefit': execution_plan['net_benefit']
            },
            'optimization_notes': self._generate_optimization_notes(recommendations)
        }
    
    def simulate_rebalancing_scenarios(
        self,
        holdings: List[Dict],
        target_allocation: Dict[str, float],
        scenarios: List[Dict]
    ) -> Dict:
        """
        Simulate different rebalancing scenarios to find optimal approach.
        
        Args:
            holdings: Current portfolio holdings
            target_allocation: Target allocation
            scenarios: List of scenarios to simulate
            
        Returns:
            Comparison of rebalancing scenarios
        """
        scenario_results = {}
        
        for i, scenario in enumerate(scenarios):
            scenario_name = scenario.get('name', f'Scenario {i+1}')
            
            # Temporarily update settings for this scenario
            original_settings = self.settings
            scenario_settings = RebalancingSettings(**{
                **original_settings.__dict__,
                **scenario.get('settings', {})
            })
            self.settings = scenario_settings
            
            # Generate plan for this scenario
            plan = self.generate_smart_rebalancing_plan(holdings, target_allocation)
            
            scenario_results[scenario_name] = {
                'plan': plan,
                'settings_used': scenario.get('settings', {}),
                'score': self._score_rebalancing_plan(plan)
            }
            
            # Restore original settings
            self.settings = original_settings
        
        # Find best scenario
        best_scenario = max(
            scenario_results.items(),
            key=lambda x: x[1]['score']
        )
        
        return {
            'scenarios': scenario_results,
            'recommended_scenario': best_scenario[0],
            'comparison_metrics': self._compare_scenarios(scenario_results)
        }
    
    def _check_time_based_rebalancing(self, last_rebalance_date: Optional[datetime]) -> bool:
        """Check if time-based rebalancing is due."""
        if not last_rebalance_date:
            return True
            
        now = datetime.now()
        
        if self.settings.rebalancing_frequency == 'daily':
            return (now - last_rebalance_date).days >= 1
        elif self.settings.rebalancing_frequency == 'weekly':
            return (now - last_rebalance_date).days >= 7
        elif self.settings.rebalancing_frequency == 'monthly':
            return (now - last_rebalance_date).days >= 30
        elif self.settings.rebalancing_frequency == 'quarterly':
            return (now - last_rebalance_date).days >= 90
        
        return False
    
    def _calculate_next_rebalance_date(self, last_rebalance_date: Optional[datetime]) -> datetime:
        """Calculate next scheduled rebalance date."""
        if not last_rebalance_date:
            return datetime.now()
            
        if self.settings.rebalancing_frequency == 'daily':
            return last_rebalance_date + timedelta(days=1)
        elif self.settings.rebalancing_frequency == 'weekly':
            return last_rebalance_date + timedelta(weeks=1)
        elif self.settings.rebalancing_frequency == 'monthly':
            return last_rebalance_date + timedelta(days=30)
        elif self.settings.rebalancing_frequency == 'quarterly':
            return last_rebalance_date + timedelta(days=90)
        
        return last_rebalance_date + timedelta(days=30)
    
    def _filter_minimum_transactions(
        self, 
        suggestions: List[RebalancingSuggestion],
        portfolio_value: float
    ) -> List[RebalancingSuggestion]:
        """Filter out transactions below minimum size threshold."""
        filtered = []
        
        for suggestion in suggestions:
            transaction_value = abs(suggestion.shares * suggestion.current_price)
            
            # Skip if below minimum transaction size
            if transaction_value < self.settings.min_transaction_size:
                continue
                
            # Skip if transaction cost is too high relative to value
            cost = self._estimate_transaction_cost(suggestion)
            if cost > self.settings.max_transaction_cost:
                continue
                
            filtered.append(suggestion)
        
        return filtered
    
    def _optimize_for_taxes(
        self,
        suggestions: List[RebalancingSuggestion],
        holdings: List[Dict],
        transactions: List[Dict]
    ) -> List[RebalancingSuggestion]:
        """Optimize rebalancing for tax efficiency."""
        if not self.tax_engine:
            return suggestions
        
        # Analyze tax-loss harvesting opportunities
        tax_opportunities = self.tax_engine.analyze_portfolio_for_harvesting(
            holdings, 
            transactions
        )
        
        # Modify sell suggestions to prioritize tax-loss harvesting
        optimized_suggestions = []
        
        for suggestion in suggestions:
            if suggestion.action == 'SELL':
                # Check if this sale can be optimized for tax benefits
                tax_opp = next(
                    (opp for opp in tax_opportunities if opp.symbol == suggestion.symbol),
                    None
                )
                
                if tax_opp and tax_opp.tax_savings > 0:
                    # Prioritize this sale for tax benefits
                    suggestion.priority = 1
                    suggestion.tax_impact = -tax_opp.tax_savings  # Negative because it's a benefit
                else:
                    # Check for potential tax liability
                    suggestion.tax_impact = self._estimate_tax_liability(suggestion, holdings, transactions)
            
            optimized_suggestions.append(suggestion)
        
        return optimized_suggestions
    
    def _generate_enhanced_recommendations(
        self,
        suggestions: List[RebalancingSuggestion],
        holdings: List[Dict],
        market_conditions: Optional[Dict] = None
    ) -> List[RebalancingRecommendation]:
        """Convert suggestions to enhanced recommendations."""
        recommendations = []
        
        for suggestion in suggestions:
            # Determine execution priority
            priority = self._calculate_priority(suggestion, market_conditions)
            
            # Estimate costs
            cost_estimate = self._estimate_transaction_cost(suggestion)
            
            # Determine execution timing
            execution_timing = self._determine_execution_timing(suggestion, market_conditions)
            
            # Generate reasoning
            reasoning = self._generate_reasoning(suggestion, priority, cost_estimate)
            
            recommendation = RebalancingRecommendation(
                symbol=suggestion.symbol,
                action=suggestion.action,
                shares=suggestion.shares,
                current_price=suggestion.current_price,
                target_value=suggestion.target_value,
                current_value=suggestion.current_value,
                drift=suggestion.drift,
                priority=priority,
                cost_estimate=cost_estimate,
                tax_impact=getattr(suggestion, 'tax_impact', 0),
                execution_timing=execution_timing,
                reasoning=reasoning
            )
            
            recommendations.append(recommendation)
        
        # Sort by priority and impact
        recommendations.sort(key=lambda x: (x.priority, -abs(x.drift)))
        
        return recommendations
    
    def _create_execution_plan(self, recommendations: List[RebalancingRecommendation]) -> Dict:
        """Create detailed execution plan."""
        # Group by execution timing
        immediate_trades = [r for r in recommendations if r.execution_timing == 'immediate']
        end_of_day_trades = [r for r in recommendations if r.execution_timing == 'end_of_day']
        next_session_trades = [r for r in recommendations if r.execution_timing == 'next_session']
        
        total_costs = sum(r.cost_estimate for r in recommendations)
        total_tax_impact = sum(r.tax_impact for r in recommendations)
        
        # Estimate net benefit (drift reduction minus costs)
        drift_reduction_benefit = sum(abs(r.drift) * abs(r.target_value) for r in recommendations)
        net_benefit = drift_reduction_benefit - total_costs - max(0, total_tax_impact)
        
        return {
            'execution_phases': {
                'immediate': {
                    'trades': len(immediate_trades),
                    'recommendations': immediate_trades
                },
                'end_of_day': {
                    'trades': len(end_of_day_trades),
                    'recommendations': end_of_day_trades
                },
                'next_session': {
                    'trades': len(next_session_trades),
                    'recommendations': next_session_trades
                }
            },
            'total_costs': total_costs,
            'total_tax_impact': total_tax_impact,
            'net_benefit': net_benefit,
            'execution_order': self._generate_execution_order(recommendations)
        }
    
    def _estimate_transaction_cost(self, suggestion: RebalancingSuggestion) -> float:
        """Estimate transaction cost for a suggestion."""
        # Default to stock costs, could be enhanced with asset type detection
        costs = self.transaction_costs['stock']
        
        transaction_value = abs(suggestion.shares * suggestion.current_price)
        
        percentage_cost = transaction_value * costs.percentage_cost
        total_cost = costs.fixed_cost + percentage_cost
        
        return max(total_cost, costs.minimum_cost)
    
    def _estimate_tax_liability(
        self, 
        suggestion: RebalancingSuggestion,
        holdings: List[Dict], 
        transactions: List[Dict]
    ) -> float:
        """Estimate tax liability for a sell transaction."""
        if suggestion.action != 'SELL':
            return 0
            
        # This is a simplified implementation
        # In practice, you'd need detailed cost basis tracking
        
        # Find the holding
        holding = next(
            (h for h in holdings if h['symbol'] == suggestion.symbol),
            None
        )
        
        if not holding:
            return 0
            
        # Estimate capital gain/loss
        avg_cost = holding.get('avg_price', suggestion.current_price)
        shares_to_sell = abs(suggestion.shares)
        
        gain_per_share = suggestion.current_price - avg_cost
        total_gain = gain_per_share * shares_to_sell
        
        if total_gain <= 0:
            return 0  # No tax on losses
            
        # Assume short-term capital gains for simplicity
        tax_rate = 0.25  # This should come from user's tax settings
        
        return total_gain * tax_rate
    
    def _calculate_priority(
        self, 
        suggestion: RebalancingSuggestion,
        market_conditions: Optional[Dict] = None
    ) -> int:
        """Calculate execution priority (1=high, 2=medium, 3=low)."""
        # High priority for large drifts
        if abs(suggestion.drift) > 0.10:  # 10% drift
            return 1
            
        # Medium priority for moderate drifts
        if abs(suggestion.drift) > 0.05:  # 5% drift
            return 2
            
        # Low priority otherwise
        return 3
    
    def _determine_execution_timing(
        self,
        suggestion: RebalancingSuggestion,
        market_conditions: Optional[Dict] = None
    ) -> str:
        """Determine optimal execution timing."""
        # High priority trades should be executed immediately
        if abs(suggestion.drift) > 0.10:
            return 'immediate'
            
        # Consider market conditions for timing
        if market_conditions:
            volatility = market_conditions.get('volatility', 0.15)
            if volatility > 0.25:  # High volatility
                return 'end_of_day'  # Wait for volatility to settle
                
        return 'immediate'
    
    def _generate_reasoning(
        self,
        suggestion: RebalancingSuggestion,
        priority: int,
        cost_estimate: float
    ) -> str:
        """Generate human-readable reasoning for the recommendation."""
        drift_pct = suggestion.drift * 100
        
        reasoning_parts = []
        
        if abs(drift_pct) > 10:
            reasoning_parts.append(f"Large drift of {drift_pct:.1f}% detected")
        elif abs(drift_pct) > 5:
            reasoning_parts.append(f"Moderate drift of {drift_pct:.1f}% detected")
        else:
            reasoning_parts.append(f"Minor drift of {drift_pct:.1f}% detected")
            
        if cost_estimate > 0:
            reasoning_parts.append(f"estimated cost ${cost_estimate:.2f}")
            
        if hasattr(suggestion, 'tax_impact') and suggestion.tax_impact < 0:
            reasoning_parts.append(f"tax benefit of ${abs(suggestion.tax_impact):.2f}")
        elif hasattr(suggestion, 'tax_impact') and suggestion.tax_impact > 0:
            reasoning_parts.append(f"tax cost of ${suggestion.tax_impact:.2f}")
            
        return "; ".join(reasoning_parts)
    
    def _generate_execution_order(self, recommendations: List[RebalancingRecommendation]) -> List[str]:
        """Generate optimal execution order."""
        # Group sells and buys
        sells = [r for r in recommendations if r.action == 'SELL']
        buys = [r for r in recommendations if r.action == 'BUY']
        
        order = []
        
        # Execute sells first (to free up cash)
        for sell in sorted(sells, key=lambda x: x.priority):
            order.append(f"SELL {sell.shares:.0f} shares of {sell.symbol}")
            
        # Then execute buys
        for buy in sorted(buys, key=lambda x: x.priority):
            order.append(f"BUY {buy.shares:.0f} shares of {buy.symbol}")
            
        return order
    
    def _score_rebalancing_plan(self, plan: Dict) -> float:
        """Score a rebalancing plan for comparison."""
        if not plan.get('rebalancing_needed', False):
            return 0
            
        # Higher scores are better
        summary = plan.get('summary', {})
        
        # Base score from drift reduction (benefit)
        score = 1000  # Base score
        
        # Penalize for costs
        score -= summary.get('estimated_costs', 0)
        
        # Penalize for tax impact (if positive)
        tax_impact = summary.get('tax_impact', 0)
        if tax_impact > 0:
            score -= tax_impact
        else:
            score += abs(tax_impact)  # Reward tax benefits
            
        # Penalize for number of transactions
        score -= summary.get('total_transactions', 0) * 5
        
        return score
    
    def _compare_scenarios(self, scenario_results: Dict) -> Dict:
        """Compare scenarios and provide metrics."""
        metrics = {}
        
        for scenario_name, result in scenario_results.items():
            summary = result['plan'].get('summary', {})
            metrics[scenario_name] = {
                'score': result['score'],
                'total_costs': summary.get('estimated_costs', 0),
                'tax_impact': summary.get('tax_impact', 0),
                'total_transactions': summary.get('total_transactions', 0),
                'net_benefit': summary.get('net_benefit', 0)
            }
        
        return metrics
    
    def _generate_optimization_notes(self, recommendations: List[RebalancingRecommendation]) -> List[str]:
        """Generate optimization notes for the user."""
        notes = []
        
        high_priority_count = sum(1 for r in recommendations if r.priority == 1)
        if high_priority_count > 0:
            notes.append(f"{high_priority_count} high-priority trades requiring immediate attention")
            
        total_costs = sum(r.cost_estimate for r in recommendations)
        if total_costs > 100:
            notes.append(f"Total transaction costs estimated at ${total_costs:.2f}")
            
        tax_benefits = sum(abs(r.tax_impact) for r in recommendations if r.tax_impact < 0)
        if tax_benefits > 0:
            notes.append(f"Tax benefits of ${tax_benefits:.2f} available")
            
        return notes
