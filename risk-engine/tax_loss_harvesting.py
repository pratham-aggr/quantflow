"""
Tax-Loss Harvesting Engine
Identifies opportunities to realize losses for tax benefits while maintaining portfolio allocation.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import yfinance as yf
from scipy.optimize import minimize

@dataclass
class TaxLossOpportunity:
    """Represents a tax-loss harvesting opportunity."""
    symbol: str
    shares_to_sell: float
    current_price: float
    cost_basis: float
    unrealized_loss: float
    tax_savings: float
    replacement_symbol: Optional[str] = None
    replacement_shares: Optional[float] = None
    wash_sale_risk: bool = False
    holding_period: int = 0  # days
    
@dataclass
class TaxSettings:
    """Tax settings for harvesting calculations."""
    short_term_rate: float = 0.37  # Short-term capital gains rate
    long_term_rate: float = 0.20   # Long-term capital gains rate
    state_tax_rate: float = 0.0    # State tax rate
    wash_sale_days: int = 30       # Wash sale rule days
    min_loss_threshold: float = 100.0  # Minimum loss to consider
    max_correlation: float = 0.95  # Max correlation for replacement securities

class TaxLossHarvestingEngine:
    """Advanced tax-loss harvesting engine."""
    
    def __init__(self, tax_settings: Optional[TaxSettings] = None):
        self.tax_settings = tax_settings or TaxSettings()
        self.sector_etfs = {
            'Technology': ['VGT', 'QQQ', 'FTEC'],
            'Healthcare': ['VHT', 'XLV', 'IHI'],
            'Financial': ['VFH', 'XLF', 'KBE'],
            'Consumer Discretionary': ['VCR', 'XLY', 'RTH'],
            'Consumer Staples': ['VDC', 'XLP', 'KXI'],
            'Industrial': ['VIS', 'XLI', 'IYJ'],
            'Energy': ['VDE', 'XLE', 'IYE'],
            'Materials': ['VAW', 'XLB', 'IYM'],
            'Utilities': ['VPU', 'XLU', 'IDU'],
            'Real Estate': ['VNQ', 'XLRE', 'IYR'],
            'Communication': ['VOX', 'XLC', 'IYZ']
        }
        
    def analyze_portfolio_for_harvesting(
        self, 
        holdings: List[Dict], 
        transactions: List[Dict],
        target_date: Optional[datetime] = None
    ) -> List[TaxLossOpportunity]:
        """
        Analyze portfolio for tax-loss harvesting opportunities.
        
        Args:
            holdings: List of current holdings with symbols, quantities, current prices
            transactions: List of historical transactions for cost basis calculation
            target_date: Date for analysis (default: today)
            
        Returns:
            List of tax-loss harvesting opportunities
        """
        if target_date is None:
            target_date = datetime.now()
            
        opportunities = []
        
        # Calculate cost basis for each holding
        cost_basis_data = self._calculate_cost_basis(holdings, transactions)
        
        for holding in holdings:
            symbol = holding['symbol']
            current_shares = holding['quantity']
            current_price = holding.get('current_price', holding.get('avg_price', 0))
            
            if symbol not in cost_basis_data:
                continue
                
            # Analyze each tax lot
            tax_lots = cost_basis_data[symbol]
            
            for lot in tax_lots:
                if lot['shares'] <= 0:
                    continue
                    
                cost_basis = lot['cost_basis']
                shares_available = min(lot['shares'], current_shares)
                purchase_date = lot['purchase_date']
                
                # Calculate unrealized loss
                current_value = shares_available * current_price
                cost_value = shares_available * cost_basis
                unrealized_loss = cost_value - current_value
                
                if unrealized_loss < self.tax_settings.min_loss_threshold:
                    continue
                    
                # Calculate holding period
                holding_period = (target_date - purchase_date).days
                
                # Calculate tax savings
                tax_savings = self._calculate_tax_savings(
                    unrealized_loss, 
                    holding_period
                )
                
                # Check for wash sale risk
                wash_sale_risk = self._check_wash_sale_risk(
                    symbol, 
                    transactions, 
                    target_date
                )
                
                # Find replacement security
                replacement_symbol, replacement_shares = self._find_replacement_security(
                    symbol, 
                    shares_available, 
                    current_price
                )
                
                opportunity = TaxLossOpportunity(
                    symbol=symbol,
                    shares_to_sell=shares_available,
                    current_price=current_price,
                    cost_basis=cost_basis,
                    unrealized_loss=unrealized_loss,
                    tax_savings=tax_savings,
                    replacement_symbol=replacement_symbol,
                    replacement_shares=replacement_shares,
                    wash_sale_risk=wash_sale_risk,
                    holding_period=holding_period
                )
                
                opportunities.append(opportunity)
                
                # Reduce available shares for next lot
                current_shares -= shares_available
                if current_shares <= 0:
                    break
                    
        # Sort by tax savings potential
        opportunities.sort(key=lambda x: x.tax_savings, reverse=True)
        
        return opportunities
    
    def optimize_harvesting_strategy(
        self, 
        opportunities: List[TaxLossOpportunity],
        max_transactions: int = 10,
        portfolio_constraints: Optional[Dict] = None
    ) -> List[TaxLossOpportunity]:
        """
        Optimize which opportunities to execute based on constraints.
        
        Args:
            opportunities: List of harvesting opportunities
            max_transactions: Maximum number of transactions to execute
            portfolio_constraints: Portfolio allocation constraints
            
        Returns:
            Optimized list of opportunities to execute
        """
        if not opportunities:
            return []
            
        # Filter out wash sale risks
        safe_opportunities = [
            opp for opp in opportunities 
            if not opp.wash_sale_risk
        ]
        
        # Apply portfolio constraints if provided
        if portfolio_constraints:
            safe_opportunities = self._apply_portfolio_constraints(
                safe_opportunities, 
                portfolio_constraints
            )
        
        # Select top opportunities up to max_transactions
        selected_opportunities = safe_opportunities[:max_transactions]
        
        return selected_opportunities
    
    def generate_execution_plan(
        self, 
        selected_opportunities: List[TaxLossOpportunity]
    ) -> Dict:
        """
        Generate detailed execution plan for tax-loss harvesting.
        
        Args:
            selected_opportunities: Selected opportunities to execute
            
        Returns:
            Detailed execution plan
        """
        total_loss_realized = sum(opp.unrealized_loss for opp in selected_opportunities)
        total_tax_savings = sum(opp.tax_savings for opp in selected_opportunities)
        
        sell_orders = []
        buy_orders = []
        
        for opp in selected_opportunities:
            # Sell order
            sell_orders.append({
                'action': 'SELL',
                'symbol': opp.symbol,
                'shares': opp.shares_to_sell,
                'price': opp.current_price,
                'value': opp.shares_to_sell * opp.current_price,
                'loss_realized': opp.unrealized_loss,
                'tax_savings': opp.tax_savings
            })
            
            # Buy order for replacement (if applicable)
            if opp.replacement_symbol and opp.replacement_shares:
                buy_orders.append({
                    'action': 'BUY',
                    'symbol': opp.replacement_symbol,
                    'shares': opp.replacement_shares,
                    'estimated_price': opp.current_price,  # Estimate based on current correlation
                    'value': opp.replacement_shares * opp.current_price,
                    'replaces': opp.symbol
                })
        
        execution_plan = {
            'summary': {
                'total_opportunities': len(selected_opportunities),
                'total_loss_realized': total_loss_realized,
                'total_tax_savings': total_tax_savings,
                'execution_date': datetime.now().isoformat()
            },
            'sell_orders': sell_orders,
            'buy_orders': buy_orders,
            'timing_considerations': self._generate_timing_considerations(),
            'risk_warnings': self._generate_risk_warnings(selected_opportunities)
        }
        
        return execution_plan
    
    def _calculate_cost_basis(
        self, 
        holdings: List[Dict], 
        transactions: List[Dict]
    ) -> Dict[str, List[Dict]]:
        """Calculate cost basis using FIFO method."""
        cost_basis_data = {}
        
        # Group transactions by symbol
        symbol_transactions = {}
        for txn in transactions:
            symbol = txn.get('symbol', '')
            if symbol not in symbol_transactions:
                symbol_transactions[symbol] = []
            symbol_transactions[symbol].append(txn)
        
        # Sort transactions by date for each symbol
        for symbol in symbol_transactions:
            symbol_transactions[symbol].sort(
                key=lambda x: datetime.fromisoformat(x.get('date', '2020-01-01'))
            )
        
        # Calculate cost basis for each holding
        for holding in holdings:
            symbol = holding['symbol']
            current_shares = holding['quantity']
            
            if symbol not in symbol_transactions:
                continue
                
            tax_lots = []
            remaining_shares = current_shares
            
            for txn in symbol_transactions[symbol]:
                if remaining_shares <= 0:
                    break
                    
                txn_type = txn.get('type', 'buy').lower()
                txn_shares = abs(txn.get('quantity', 0))
                txn_price = txn.get('price', 0)
                txn_date = datetime.fromisoformat(txn.get('date', '2020-01-01'))
                
                if txn_type == 'buy':
                    shares_for_lot = min(txn_shares, remaining_shares)
                    
                    tax_lots.append({
                        'shares': shares_for_lot,
                        'cost_basis': txn_price,
                        'purchase_date': txn_date,
                        'transaction_id': txn.get('id', '')
                    })
                    
                    remaining_shares -= shares_for_lot
                elif txn_type == 'sell':
                    # Reduce shares from existing lots (FIFO)
                    shares_to_reduce = txn_shares
                    for lot in tax_lots:
                        if shares_to_reduce <= 0:
                            break
                        reduction = min(lot['shares'], shares_to_reduce)
                        lot['shares'] -= reduction
                        shares_to_reduce -= reduction
            
            cost_basis_data[symbol] = [lot for lot in tax_lots if lot['shares'] > 0]
        
        return cost_basis_data
    
    def _calculate_tax_savings(self, loss: float, holding_period: int) -> float:
        """Calculate tax savings from realized loss."""
        if loss <= 0:
            return 0
            
        # Determine tax rate based on holding period
        if holding_period <= 365:
            tax_rate = self.tax_settings.short_term_rate
        else:
            tax_rate = self.tax_settings.long_term_rate
            
        # Add state tax rate
        total_tax_rate = tax_rate + self.tax_settings.state_tax_rate
        
        # Tax savings = loss * tax rate
        tax_savings = loss * total_tax_rate
        
        return tax_savings
    
    def _check_wash_sale_risk(
        self, 
        symbol: str, 
        transactions: List[Dict], 
        target_date: datetime
    ) -> bool:
        """Check if selling would trigger wash sale rule."""
        wash_sale_window = timedelta(days=self.tax_settings.wash_sale_days)
        
        # Check for purchases within wash sale window
        for txn in transactions:
            if txn.get('symbol') != symbol:
                continue
                
            txn_date = datetime.fromisoformat(txn.get('date', '2020-01-01'))
            txn_type = txn.get('type', 'buy').lower()
            
            if txn_type == 'buy':
                if target_date - wash_sale_window <= txn_date <= target_date + wash_sale_window:
                    return True
                    
        return False
    
    def _find_replacement_security(
        self, 
        symbol: str, 
        shares: float, 
        current_price: float
    ) -> Tuple[Optional[str], Optional[float]]:
        """Find suitable replacement security to maintain exposure."""
        try:
            # Get sector information
            ticker = yf.Ticker(symbol)
            info = ticker.info
            sector = info.get('sector', 'Unknown')
            
            # Find replacement ETFs for the sector
            if sector in self.sector_etfs:
                replacement_options = self.sector_etfs[sector]
                
                # Filter out the current symbol if it's in the list
                replacement_options = [
                    etf for etf in replacement_options 
                    if etf.upper() != symbol.upper()
                ]
                
                if replacement_options:
                    # Use the first available replacement
                    replacement_symbol = replacement_options[0]
                    
                    # Calculate equivalent shares (rough estimate)
                    replacement_ticker = yf.Ticker(replacement_symbol)
                    replacement_price = replacement_ticker.history(period='1d')['Close'].iloc[-1]
                    
                    investment_amount = shares * current_price
                    replacement_shares = investment_amount / replacement_price
                    
                    return replacement_symbol, replacement_shares
                    
        except Exception as e:
            print(f"Error finding replacement for {symbol}: {e}")
            
        return None, None
    
    def _apply_portfolio_constraints(
        self, 
        opportunities: List[TaxLossOpportunity],
        constraints: Dict
    ) -> List[TaxLossOpportunity]:
        """Apply portfolio allocation constraints."""
        # This is a simplified implementation
        # In practice, you'd want more sophisticated constraint handling
        
        max_sector_exposure = constraints.get('max_sector_exposure', 0.3)
        max_single_position = constraints.get('max_single_position', 0.1)
        
        # Filter opportunities that would violate constraints
        filtered_opportunities = []
        
        for opp in opportunities:
            # Add basic constraint checks here
            # This would require additional portfolio context
            filtered_opportunities.append(opp)
            
        return filtered_opportunities
    
    def _generate_timing_considerations(self) -> List[str]:
        """Generate timing considerations for execution."""
        considerations = [
            "Execute sales before market close to lock in current prices",
            "Consider executing replacement purchases on the same day",
            "Be aware of settlement periods (T+2) for cash availability",
            "Consider market volatility when timing executions",
            "Review any pending corporate actions or dividends"
        ]
        
        return considerations
    
    def _generate_risk_warnings(
        self, 
        opportunities: List[TaxLossOpportunity]
    ) -> List[str]:
        """Generate risk warnings for the execution plan."""
        warnings = []
        
        # Check for concentrated positions
        total_value_to_sell = sum(
            opp.shares_to_sell * opp.current_price 
            for opp in opportunities
        )
        
        if total_value_to_sell > 50000:  # Arbitrary threshold
            warnings.append(
                f"Large total transaction value: ${total_value_to_sell:,.2f}"
            )
        
        # Check for multiple positions in same sector
        symbols_to_sell = {opp.symbol for opp in opportunities}
        if len(symbols_to_sell) > 5:
            warnings.append(
                f"Selling {len(symbols_to_sell)} different positions"
            )
        
        # Check for any wash sale risks
        wash_sale_risks = [opp for opp in opportunities if opp.wash_sale_risk]
        if wash_sale_risks:
            warnings.append(
                f"{len(wash_sale_risks)} positions have wash sale risk"
            )
        
        return warnings
    
    def estimate_annual_tax_benefit(
        self, 
        portfolio_value: float,
        expected_volatility: float = 0.15
    ) -> Dict:
        """
        Estimate potential annual tax benefits from systematic harvesting.
        
        Args:
            portfolio_value: Total portfolio value
            expected_volatility: Expected annual volatility
            
        Returns:
            Dictionary with estimated annual benefits
        """
        # Conservative estimates based on research
        # Typical tax-loss harvesting can add 0.77% annually in after-tax returns
        
        annual_loss_opportunity = portfolio_value * expected_volatility * 0.3  # 30% of volatility creates loss opportunities
        tax_savings_rate = (self.tax_settings.short_term_rate + self.tax_settings.long_term_rate) / 2
        
        estimated_annual_benefit = annual_loss_opportunity * tax_savings_rate
        benefit_as_percentage = (estimated_annual_benefit / portfolio_value) * 100
        
        return {
            'estimated_annual_benefit': estimated_annual_benefit,
            'benefit_percentage': benefit_as_percentage,
            'loss_opportunity': annual_loss_opportunity,
            'assumptions': {
                'portfolio_value': portfolio_value,
                'expected_volatility': expected_volatility,
                'harvest_efficiency': 0.3,
                'average_tax_rate': tax_savings_rate
            }
        }
