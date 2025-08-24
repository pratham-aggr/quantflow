"""
Paper Trading Engine for Portfolio Rebalancing
Simulates actual trading without real money to test strategies and provide execution practice.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
import uuid
import json
from enum import Enum

class OrderType(Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"

class OrderStatus(Enum):
    PENDING = "PENDING"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class OrderSide(Enum):
    BUY = "BUY"
    SELL = "SELL"

@dataclass
class PaperOrder:
    """Represents a paper trading order."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str = ""
    side: OrderSide = OrderSide.BUY
    order_type: OrderType = OrderType.MARKET
    quantity: float = 0.0
    price: Optional[float] = None  # For limit orders
    stop_price: Optional[float] = None  # For stop orders
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    filled_at: Optional[datetime] = None
    filled_price: Optional[float] = None
    filled_quantity: float = 0.0
    commission: float = 0.0
    portfolio_id: str = ""
    
@dataclass
class PaperExecution:
    """Represents a trade execution."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = ""
    symbol: str = ""
    side: OrderSide = OrderSide.BUY
    quantity: float = 0.0
    price: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    commission: float = 0.0
    
@dataclass
class PaperPosition:
    """Represents a position in paper trading portfolio."""
    symbol: str = ""
    quantity: float = 0.0
    avg_price: float = 0.0
    market_value: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    
@dataclass
class PaperPortfolio:
    """Paper trading portfolio."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    cash: float = 100000.0  # Starting cash
    positions: Dict[str, PaperPosition] = field(default_factory=dict)
    orders: List[PaperOrder] = field(default_factory=list)
    executions: List[PaperExecution] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

class MarketDataProvider:
    """Real market data provider for paper trading using yfinance."""
    
    def __init__(self):
        import yfinance as yf
        self.yf = yf
        self.market_data = {}
        self._update_prices()
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current market price for symbol using yfinance."""
        try:
            ticker = self.yf.Ticker(symbol.upper())
            info = ticker.info
            return info.get('regularMarketPrice', info.get('currentPrice'))
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
            return None
    
    def get_bid_ask(self, symbol: str) -> Tuple[Optional[float], Optional[float]]:
        """Get bid/ask prices for symbol using yfinance."""
        try:
            ticker = self.yf.Ticker(symbol.upper())
            info = ticker.info
            current_price = info.get('regularMarketPrice', info.get('currentPrice'))
            if current_price:
                spread_pct = 0.001  # 0.1% spread
                spread = current_price * spread_pct / 2
                return current_price - spread, current_price + spread
            return None, None
        except Exception as e:
            print(f"Error fetching bid/ask for {symbol}: {e}")
            return None, None
    
    def _update_prices(self):
        """Update prices using real market data."""
        # This method is now a no-op since we fetch real-time data
        pass

class PaperTradingEngine:
    """Core paper trading engine."""
    
    def __init__(self, market_data_provider: Optional[MarketDataProvider] = None):
        self.market_data = market_data_provider or MarketDataProvider()
        self.portfolios: Dict[str, PaperPortfolio] = {}
        self.commission_per_trade = 0.0  # No commission for paper trading
        self.slippage_factor = 0.001  # 0.1% slippage simulation
        
    def create_portfolio(self, name: str, initial_cash: float = 100000.0) -> PaperPortfolio:
        """Create a new paper trading portfolio."""
        portfolio = PaperPortfolio(
            name=name,
            cash=initial_cash
        )
        self.portfolios[portfolio.id] = portfolio
        return portfolio
    
    def place_order(
        self, 
        portfolio_id: str,
        symbol: str,
        side: OrderSide,
        quantity: float,
        order_type: OrderType = OrderType.MARKET,
        price: Optional[float] = None,
        stop_price: Optional[float] = None
    ) -> PaperOrder:
        """Place a paper trading order."""
        portfolio = self.portfolios.get(portfolio_id)
        if not portfolio:
            raise ValueError(f"Portfolio {portfolio_id} not found")
        
        order = PaperOrder(
            symbol=symbol.upper(),
            side=side,
            order_type=order_type,
            quantity=quantity,
            price=price,
            stop_price=stop_price,
            portfolio_id=portfolio_id
        )
        
        # Validate order
        validation_result = self._validate_order(portfolio, order)
        if not validation_result['valid']:
            order.status = OrderStatus.REJECTED
            order.filled_at = datetime.now()
            portfolio.orders.append(order)
            return order
        
        # Process order based on type
        if order_type == OrderType.MARKET:
            self._execute_market_order(portfolio, order)
        else:
            # For limit/stop orders, add to pending orders
            portfolio.orders.append(order)
        
        portfolio.updated_at = datetime.now()
        return order
    
    def cancel_order(self, portfolio_id: str, order_id: str) -> bool:
        """Cancel a pending order."""
        portfolio = self.portfolios.get(portfolio_id)
        if not portfolio:
            return False
        
        for order in portfolio.orders:
            if order.id == order_id and order.status == OrderStatus.PENDING:
                order.status = OrderStatus.CANCELLED
                order.filled_at = datetime.now()
                portfolio.updated_at = datetime.now()
                return True
        
        return False
    
    def get_portfolio_summary(self, portfolio_id: str) -> Dict:
        """Get comprehensive portfolio summary."""
        portfolio = self.portfolios.get(portfolio_id)
        if not portfolio:
            return {}
        
        # Update market values
        self._update_portfolio_values(portfolio)
        
        total_value = portfolio.cash
        total_unrealized_pnl = 0.0
        total_realized_pnl = sum(execution.commission for execution in portfolio.executions)
        
        positions_summary = []
        for symbol, position in portfolio.positions.items():
            if position.quantity != 0:
                total_value += position.market_value
                total_unrealized_pnl += position.unrealized_pnl
                
                positions_summary.append({
                    'symbol': symbol,
                    'quantity': position.quantity,
                    'avg_price': position.avg_price,
                    'current_price': self.market_data.get_current_price(symbol),
                    'market_value': position.market_value,
                    'unrealized_pnl': position.unrealized_pnl,
                    'unrealized_pnl_pct': (position.unrealized_pnl / (position.avg_price * abs(position.quantity))) * 100 if position.quantity != 0 else 0
                })
        
        return {
            'portfolio_id': portfolio_id,
            'name': portfolio.name,
            'cash': portfolio.cash,
            'total_value': total_value,
            'total_unrealized_pnl': total_unrealized_pnl,
            'total_realized_pnl': total_realized_pnl,
            'positions': positions_summary,
            'pending_orders': [
                {
                    'id': order.id,
                    'symbol': order.symbol,
                    'side': order.side.value,
                    'type': order.order_type.value,
                    'quantity': order.quantity,
                    'price': order.price,
                    'created_at': order.created_at.isoformat()
                }
                for order in portfolio.orders 
                if order.status == OrderStatus.PENDING
            ],
            'recent_executions': [
                {
                    'symbol': execution.symbol,
                    'side': execution.side.value,
                    'quantity': execution.quantity,
                    'price': execution.price,
                    'timestamp': execution.timestamp.isoformat()
                }
                for execution in portfolio.executions[-10:]  # Last 10 executions
            ]
        }
    
    def execute_rebalancing_plan(
        self, 
        portfolio_id: str, 
        rebalancing_plan: Dict
    ) -> Dict:
        """Execute a rebalancing plan in paper trading."""
        portfolio = self.portfolios.get(portfolio_id)
        if not portfolio:
            return {'success': False, 'error': 'Portfolio not found'}
        
        execution_results = {
            'success': True,
            'orders_placed': [],
            'errors': [],
            'summary': {}
        }
        
        recommendations = rebalancing_plan.get('recommendations', [])
        
        # Execute in phases as planned
        execution_plan = rebalancing_plan.get('execution_plan', {})
        phases = execution_plan.get('execution_phases', {})
        
        # Execute immediate trades
        immediate_trades = phases.get('immediate', {}).get('recommendations', [])
        for rec in immediate_trades:
            try:
                side = OrderSide.BUY if rec.action == 'BUY' else OrderSide.SELL
                order = self.place_order(
                    portfolio_id=portfolio_id,
                    symbol=rec.symbol,
                    side=side,
                    quantity=abs(rec.shares),
                    order_type=OrderType.MARKET
                )
                execution_results['orders_placed'].append({
                    'order_id': order.id,
                    'symbol': rec.symbol,
                    'action': rec.action,
                    'quantity': rec.shares,
                    'status': order.status.value
                })
            except Exception as e:
                execution_results['errors'].append({
                    'symbol': rec.symbol,
                    'error': str(e)
                })
        
        # Schedule end-of-day trades (for demo, execute as limit orders)
        end_of_day_trades = phases.get('end_of_day', {}).get('recommendations', [])
        for rec in end_of_day_trades:
            try:
                side = OrderSide.BUY if rec.action == 'BUY' else OrderSide.SELL
                # Place limit orders at current price
                limit_price = rec.current_price
                order = self.place_order(
                    portfolio_id=portfolio_id,
                    symbol=rec.symbol,
                    side=side,
                    quantity=abs(rec.shares),
                    order_type=OrderType.LIMIT,
                    price=limit_price
                )
                execution_results['orders_placed'].append({
                    'order_id': order.id,
                    'symbol': rec.symbol,
                    'action': rec.action,
                    'quantity': rec.shares,
                    'status': order.status.value,
                    'type': 'LIMIT',
                    'price': limit_price
                })
            except Exception as e:
                execution_results['errors'].append({
                    'symbol': rec.symbol,
                    'error': str(e)
                })
        
        # Get updated portfolio summary
        execution_results['summary'] = self.get_portfolio_summary(portfolio_id)
        
        if execution_results['errors']:
            execution_results['success'] = False
        
        return execution_results
    
    def simulate_market_movement(self, volatility_factor: float = 1.0):
        """Simulate market movement and process pending orders."""
        # Update market prices
        self.market_data._update_prices()
        
        # Apply volatility factor using real market data
        # Note: Real market data already includes volatility, so we just update prices
        pass
        
        # Process pending orders for all portfolios
        for portfolio in self.portfolios.values():
            self._process_pending_orders(portfolio)
    
    def _validate_order(self, portfolio: PaperPortfolio, order: PaperOrder) -> Dict:
        """Validate order before execution."""
        current_price = self.market_data.get_current_price(order.symbol)
        if not current_price:
            return {'valid': False, 'reason': 'Invalid symbol or no market data'}
        
        if order.side == OrderSide.BUY:
            # Check if enough cash for purchase
            estimated_cost = order.quantity * current_price + self.commission_per_trade
            if portfolio.cash < estimated_cost:
                return {'valid': False, 'reason': 'Insufficient cash'}
        else:  # SELL
            # Check if enough shares to sell
            position = portfolio.positions.get(order.symbol)
            if not position or position.quantity < order.quantity:
                return {'valid': False, 'reason': 'Insufficient shares'}
        
        if order.quantity <= 0:
            return {'valid': False, 'reason': 'Invalid quantity'}
        
        return {'valid': True}
    
    def _execute_market_order(self, portfolio: PaperPortfolio, order: PaperOrder):
        """Execute a market order immediately."""
        bid, ask = self.market_data.get_bid_ask(order.symbol)
        
        if not bid or not ask:
            order.status = OrderStatus.REJECTED
            order.filled_at = datetime.now()
            portfolio.orders.append(order)
            return
        
        # Determine execution price with slippage
        if order.side == OrderSide.BUY:
            base_price = ask
            slippage = base_price * self.slippage_factor
            execution_price = base_price + slippage
        else:
            base_price = bid
            slippage = base_price * self.slippage_factor
            execution_price = base_price - slippage
        
        # Create execution
        execution = PaperExecution(
            order_id=order.id,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=execution_price,
            commission=self.commission_per_trade
        )
        
        # Update portfolio
        self._update_portfolio_position(portfolio, execution)
        
        # Update order status
        order.status = OrderStatus.FILLED
        order.filled_at = datetime.now()
        order.filled_price = execution_price
        order.filled_quantity = order.quantity
        order.commission = self.commission_per_trade
        
        # Add to portfolio
        portfolio.orders.append(order)
        portfolio.executions.append(execution)
    
    def _process_pending_orders(self, portfolio: PaperPortfolio):
        """Process pending limit and stop orders."""
        for order in portfolio.orders:
            if order.status != OrderStatus.PENDING:
                continue
            
            current_price = self.market_data.get_current_price(order.symbol)
            if not current_price:
                continue
            
            should_execute = False
            
            if order.order_type == OrderType.LIMIT:
                if order.side == OrderSide.BUY and current_price <= order.price:
                    should_execute = True
                elif order.side == OrderSide.SELL and current_price >= order.price:
                    should_execute = True
            elif order.order_type == OrderType.STOP:
                if order.side == OrderSide.BUY and current_price >= order.stop_price:
                    should_execute = True
                elif order.side == OrderSide.SELL and current_price <= order.stop_price:
                    should_execute = True
            
            if should_execute:
                # Convert to market order and execute
                order.order_type = OrderType.MARKET
                self._execute_market_order(portfolio, order)
    
    def _update_portfolio_position(self, portfolio: PaperPortfolio, execution: PaperExecution):
        """Update portfolio position based on execution."""
        symbol = execution.symbol
        
        # Get or create position
        if symbol not in portfolio.positions:
            portfolio.positions[symbol] = PaperPosition(symbol=symbol)
        
        position = portfolio.positions[symbol]
        
        if execution.side == OrderSide.BUY:
            # Calculate new average price
            total_cost = (position.quantity * position.avg_price) + (execution.quantity * execution.price)
            new_quantity = position.quantity + execution.quantity
            
            if new_quantity > 0:
                position.avg_price = total_cost / new_quantity
            position.quantity = new_quantity
            
            # Update cash
            portfolio.cash -= (execution.quantity * execution.price) + execution.commission
            
        else:  # SELL
            # Update realized P&L
            cost_basis = execution.quantity * position.avg_price
            proceeds = execution.quantity * execution.price
            realized_pnl = proceeds - cost_basis - execution.commission
            position.realized_pnl += realized_pnl
            
            # Update quantity
            position.quantity -= execution.quantity
            
            # Update cash
            portfolio.cash += proceeds - execution.commission
        
        # Clean up zero positions
        if abs(position.quantity) < 0.001:  # Essentially zero
            position.quantity = 0.0
    
    def _update_portfolio_values(self, portfolio: PaperPortfolio):
        """Update market values and unrealized P&L for all positions."""
        for symbol, position in portfolio.positions.items():
            if position.quantity == 0:
                position.market_value = 0.0
                position.unrealized_pnl = 0.0
                continue
            
            current_price = self.market_data.get_current_price(symbol)
            if current_price:
                position.market_value = position.quantity * current_price
                cost_basis = position.quantity * position.avg_price
                position.unrealized_pnl = position.market_value - cost_basis

class BrokerageAPISimulator:
    """Simulates brokerage API for testing integration."""
    
    def __init__(self):
        self.paper_engine = PaperTradingEngine()
        self.api_calls = []  # Track API calls for analysis
        
    def authenticate(self, api_key: str, secret: str) -> Dict:
        """Simulate API authentication."""
        self.api_calls.append({
            'endpoint': 'authenticate',
            'timestamp': datetime.now(),
            'success': True
        })
        
        return {
            'success': True,
            'access_token': 'real_access_token',
            'expires_in': 3600,
            'account_id': 'paper_account_001'
        }
    
    def get_account_info(self, account_id: str) -> Dict:
        """Get account information."""
        self.api_calls.append({
            'endpoint': 'get_account_info',
            'timestamp': datetime.now(),
            'account_id': account_id
        })
        
        # Create a default portfolio if none exists
        if not self.paper_engine.portfolios:
            portfolio = self.paper_engine.create_portfolio("Paper Trading Account")
            account_id = portfolio.id
        else:
            account_id = list(self.paper_engine.portfolios.keys())[0]
        
        return self.paper_engine.get_portfolio_summary(account_id)
    
    def place_order(self, order_data: Dict) -> Dict:
        """Place an order through the API."""
        self.api_calls.append({
            'endpoint': 'place_order',
            'timestamp': datetime.now(),
            'order_data': order_data
        })
        
        try:
            account_id = order_data.get('account_id')
            if not account_id and self.paper_engine.portfolios:
                account_id = list(self.paper_engine.portfolios.keys())[0]
            
            side = OrderSide.BUY if order_data['side'].upper() == 'BUY' else OrderSide.SELL
            order_type = OrderType[order_data.get('type', 'MARKET').upper()]
            
            order = self.paper_engine.place_order(
                portfolio_id=account_id,
                symbol=order_data['symbol'],
                side=side,
                quantity=order_data['quantity'],
                order_type=order_type,
                price=order_data.get('price'),
                stop_price=order_data.get('stop_price')
            )
            
            return {
                'success': True,
                'order_id': order.id,
                'status': order.status.value,
                'message': 'Order placed successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Order placement failed'
            }
    
    def get_order_status(self, order_id: str) -> Dict:
        """Get order status."""
        self.api_calls.append({
            'endpoint': 'get_order_status',
            'timestamp': datetime.now(),
            'order_id': order_id
        })
        
        # Find order across all portfolios
        for portfolio in self.paper_engine.portfolios.values():
            for order in portfolio.orders:
                if order.id == order_id:
                    return {
                        'success': True,
                        'order_id': order.id,
                        'symbol': order.symbol,
                        'side': order.side.value,
                        'quantity': order.quantity,
                        'status': order.status.value,
                        'filled_quantity': order.filled_quantity,
                        'filled_price': order.filled_price,
                        'created_at': order.created_at.isoformat(),
                        'filled_at': order.filled_at.isoformat() if order.filled_at else None
                    }
        
        return {
            'success': False,
            'error': 'Order not found'
        }
    
    def cancel_order(self, order_id: str, account_id: str = None) -> Dict:
        """Cancel an order."""
        self.api_calls.append({
            'endpoint': 'cancel_order',
            'timestamp': datetime.now(),
            'order_id': order_id
        })
        
        if not account_id and self.paper_engine.portfolios:
            account_id = list(self.paper_engine.portfolios.keys())[0]
        
        success = self.paper_engine.cancel_order(account_id, order_id)
        
        return {
            'success': success,
            'message': 'Order cancelled successfully' if success else 'Order cancellation failed'
        }
    
    def get_api_usage_stats(self) -> Dict:
        """Get API usage statistics."""
        endpoint_counts = {}
        for call in self.api_calls:
            endpoint = call['endpoint']
            endpoint_counts[endpoint] = endpoint_counts.get(endpoint, 0) + 1
        
        return {
            'total_calls': len(self.api_calls),
            'endpoint_breakdown': endpoint_counts,
            'first_call': self.api_calls[0]['timestamp'].isoformat() if self.api_calls else None,
            'last_call': self.api_calls[-1]['timestamp'].isoformat() if self.api_calls else None
        }
