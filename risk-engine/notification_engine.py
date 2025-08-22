"""
Real-Time Notification Engine
Handles push notifications, email digests, and webhook integrations for portfolio monitoring.
"""

import asyncio
import json
import smtplib
import ssl
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Union
from enum import Enum
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import websockets
import threading
import time
import uuid

class NotificationType(Enum):
    """Types of notifications that can be sent."""
    PORTFOLIO_ALERT = "portfolio_alert"
    PRICE_ALERT = "price_alert"
    REBALANCING_REMINDER = "rebalancing_reminder"
    TAX_HARVESTING_OPPORTUNITY = "tax_harvesting_opportunity"
    RISK_ALERT = "risk_alert"
    PERFORMANCE_UPDATE = "performance_update"
    MARKET_UPDATE = "market_update"
    SYSTEM_ALERT = "system_alert"

class NotificationPriority(Enum):
    """Priority levels for notifications."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class NotificationChannel(Enum):
    """Available notification channels."""
    PUSH = "push"
    EMAIL = "email"
    SLACK = "slack"
    DISCORD = "discord"
    WEBHOOK = "webhook"
    SMS = "sms"

@dataclass
class NotificationConfig:
    """Configuration for notification settings."""
    user_id: str
    channels: List[NotificationChannel] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)
    email_settings: Optional[Dict[str, str]] = None
    slack_webhook: Optional[str] = None
    discord_webhook: Optional[str] = None
    push_tokens: List[str] = field(default_factory=list)
    phone_number: Optional[str] = None
    custom_webhooks: List[str] = field(default_factory=list)
    alert_thresholds: Dict[str, float] = field(default_factory=dict)
    quiet_hours: Dict[str, str] = field(default_factory=dict)  # start_time, end_time
    enabled: bool = True

@dataclass
class Notification:
    """Represents a notification to be sent."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    type: NotificationType = NotificationType.SYSTEM_ALERT
    priority: NotificationPriority = NotificationPriority.MEDIUM
    title: str = ""
    message: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    channels: List[NotificationChannel] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

@dataclass
class AlertRule:
    """Defines when to trigger notifications."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str = ""
    type: NotificationType = NotificationType.PORTFOLIO_ALERT
    conditions: Dict[str, Any] = field(default_factory=dict)
    actions: List[Dict[str, Any]] = field(default_factory=list)
    enabled: bool = True
    created_at: datetime = field(default_factory=datetime.now)

class EmailService:
    """Handles email notifications."""
    
    def __init__(self, smtp_server: str = "smtp.gmail.com", smtp_port: int = 587):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
    
    def send_email(
        self, 
        to_email: str, 
        subject: str, 
        body: str, 
        html_body: Optional[str] = None,
        from_email: Optional[str] = None,
        password: Optional[str] = None
    ) -> bool:
        """Send an email notification."""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = from_email or "noreply@quantflow.com"
            msg['To'] = to_email
            
            # Add plain text version
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)
            
            # Add HTML version if provided
            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
            
            # Send email
            if password:
                context = ssl.create_default_context()
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls(context=context)
                    server.login(from_email, password)
                    server.send_message(msg)
            else:
                # For testing without authentication
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Email sending failed: {e}")
            return False
    
    def generate_daily_digest(
        self, 
        user_id: str, 
        portfolio_summary: Dict[str, Any],
        market_updates: List[Dict[str, Any]],
        alerts: List[Dict[str, Any]]
    ) -> str:
        """Generate HTML email digest."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }}
                .section {{ margin: 20px 0; padding: 15px; border-left: 4px solid #667eea; background: #f8f9fa; }}
                .metric {{ display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .positive {{ color: #28a745; }}
                .negative {{ color: #dc3545; }}
                .alert {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 QuantFlow Daily Digest</h1>
                <p>{datetime.now().strftime('%B %d, %Y')}</p>
            </div>
            
            <div class="section">
                <h2>💰 Portfolio Summary</h2>
                <div class="metric">
                    <strong>Total Value:</strong> ${portfolio_summary.get('total_value', 0):,.2f}
                </div>
                <div class="metric">
                    <strong>Daily P&L:</strong> 
                    <span class="{'positive' if portfolio_summary.get('daily_pnl', 0) >= 0 else 'negative'}">
                        ${portfolio_summary.get('daily_pnl', 0):,.2f}
                    </span>
                </div>
                <div class="metric">
                    <strong>Risk Score:</strong> {portfolio_summary.get('risk_score', 0)}
                </div>
            </div>
            
            <div class="section">
                <h2>📈 Market Updates</h2>
                {self._generate_market_updates_html(market_updates)}
            </div>
            
            <div class="section">
                <h2>🚨 Alerts & Notifications</h2>
                {self._generate_alerts_html(alerts)}
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #e9ecef; border-radius: 5px; text-align: center;">
                <p>💡 <strong>Pro Tip:</strong> Check your portfolio regularly and consider rebalancing if needed.</p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _generate_market_updates_html(self, market_updates: List[Dict[str, Any]]) -> str:
        """Generate HTML for market updates section."""
        if not market_updates:
            return "<p>No significant market updates today.</p>"
        
        html = ""
        for update in market_updates:
            symbol = update.get('symbol', '')
            change = update.get('change', 0)
            change_class = 'positive' if change >= 0 else 'negative'
            change_symbol = '+' if change >= 0 else ''
            
            html += f"""
            <div class="metric">
                <strong>{symbol}:</strong> 
                <span class="{change_class}">{change_symbol}{change:.2f}%</span>
            </div>
            """
        
        return html
    
    def _generate_alerts_html(self, alerts: List[Dict[str, Any]]) -> str:
        """Generate HTML for alerts section."""
        if not alerts:
            return "<p>No alerts today.</p>"
        
        html = ""
        for alert in alerts:
            html += f"""
            <div class="alert">
                <strong>{alert.get('title', 'Alert')}:</strong> {alert.get('message', '')}
            </div>
            """
        
        return html

class WebhookService:
    """Handles webhook notifications to external services."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'QuantFlow-NotificationEngine/1.0'
        })
    
    def send_slack_notification(
        self, 
        webhook_url: str, 
        message: str, 
        title: str = "QuantFlow Alert",
        color: str = "#36a64f"
    ) -> bool:
        """Send notification to Slack."""
        try:
            payload = {
                "attachments": [
                    {
                        "color": color,
                        "title": title,
                        "text": message,
                        "footer": "QuantFlow",
                        "ts": int(datetime.now().timestamp())
                    }
                ]
            }
            
            response = self.session.post(webhook_url, json=payload, timeout=10)
            return response.status_code == 200
            
        except Exception as e:
            print(f"Slack notification failed: {e}")
            return False
    
    def send_discord_notification(
        self, 
        webhook_url: str, 
        message: str, 
        title: str = "QuantFlow Alert",
        color: int = 0x36a64f
    ) -> bool:
        """Send notification to Discord."""
        try:
            payload = {
                "embeds": [
                    {
                        "title": title,
                        "description": message,
                        "color": color,
                        "footer": {
                            "text": "QuantFlow"
                        },
                        "timestamp": datetime.now().isoformat()
                    }
                ]
            }
            
            response = self.session.post(webhook_url, json=payload, timeout=10)
            return response.status_code == 204
            
        except Exception as e:
            print(f"Discord notification failed: {e}")
            return False
    
    def send_custom_webhook(
        self, 
        webhook_url: str, 
        payload: Dict[str, Any]
    ) -> bool:
        """Send custom webhook notification."""
        try:
            response = self.session.post(webhook_url, json=payload, timeout=10)
            return response.status_code in [200, 201, 202, 204]
            
        except Exception as e:
            print(f"Custom webhook failed: {e}")
            return False

class PushNotificationService:
    """Handles push notifications (simplified implementation)."""
    
    def __init__(self):
        self.connected_clients: Dict[str, websockets.WebSocketServerProtocol] = {}
    
    async def register_client(
        self, 
        user_id: str, 
        websocket: websockets.WebSocketServerProtocol
    ):
        """Register a client for push notifications."""
        self.connected_clients[user_id] = websocket
    
    async def unregister_client(self, user_id: str):
        """Unregister a client."""
        if user_id in self.connected_clients:
            del self.connected_clients[user_id]
    
    async def send_push_notification(
        self, 
        user_id: str, 
        notification: Notification
    ) -> bool:
        """Send push notification to a specific user."""
        try:
            if user_id in self.connected_clients:
                websocket = self.connected_clients[user_id]
                payload = {
                    "type": "notification",
                    "data": {
                        "id": notification.id,
                        "type": notification.type.value,
                        "priority": notification.priority.value,
                        "title": notification.title,
                        "message": notification.message,
                        "data": notification.data,
                        "timestamp": notification.created_at.isoformat()
                    }
                }
                
                await websocket.send(json.dumps(payload))
                return True
            else:
                print(f"User {user_id} not connected for push notifications")
                return False
                
        except Exception as e:
            print(f"Push notification failed: {e}")
            return False

class NotificationEngine:
    """Main notification engine that orchestrates all notification services."""
    
    def __init__(self):
        self.email_service = EmailService()
        self.webhook_service = WebhookService()
        self.push_service = PushNotificationService()
        self.configs: Dict[str, NotificationConfig] = {}
        self.alert_rules: Dict[str, AlertRule] = {}
        self.notification_history: List[Notification] = []
        self.websocket_server = None
        self.is_running = False
    
    def register_user(
        self, 
        user_id: str, 
        config: NotificationConfig
    ):
        """Register a user for notifications."""
        self.configs[user_id] = config
    
    def unregister_user(self, user_id: str):
        """Unregister a user."""
        if user_id in self.configs:
            del self.configs[user_id]
    
    def add_alert_rule(self, rule: AlertRule):
        """Add an alert rule."""
        self.alert_rules[rule.id] = rule
    
    def remove_alert_rule(self, rule_id: str):
        """Remove an alert rule."""
        if rule_id in self.alert_rules:
            del self.alert_rules[rule_id]
    
    async def send_notification(self, notification: Notification) -> Dict[str, bool]:
        """Send a notification through all configured channels."""
        if not notification.user_id in self.configs:
            return {"error": "User not registered"}
        
        config = self.configs[notification.user_id]
        if not config.enabled:
            return {"skipped": "Notifications disabled"}
        
        # Check quiet hours
        if self._is_in_quiet_hours(config):
            return {"skipped": "Quiet hours"}
        
        results = {}
        
        # Send through each configured channel
        for channel in notification.channels or config.channels:
            if channel == NotificationChannel.EMAIL:
                results["email"] = await self._send_email_notification(notification, config)
            elif channel == NotificationChannel.SLACK:
                results["slack"] = await self._send_slack_notification(notification, config)
            elif channel == NotificationChannel.DISCORD:
                results["discord"] = await self._send_discord_notification(notification, config)
            elif channel == NotificationChannel.PUSH:
                results["push"] = await self._send_push_notification(notification, config)
            elif channel == NotificationChannel.WEBHOOK:
                results["webhook"] = await self._send_custom_webhooks(notification, config)
        
        # Update notification status
        notification.sent_at = datetime.now()
        self.notification_history.append(notification)
        
        return results
    
    async def send_portfolio_alert(
        self, 
        user_id: str, 
        title: str, 
        message: str, 
        data: Dict[str, Any] = None,
        priority: NotificationPriority = NotificationPriority.MEDIUM
    ):
        """Send a portfolio-related alert."""
        notification = Notification(
            user_id=user_id,
            type=NotificationType.PORTFOLIO_ALERT,
            priority=priority,
            title=title,
            message=message,
            data=data or {}
        )
        
        return await self.send_notification(notification)
    
    async def send_price_alert(
        self, 
        user_id: str, 
        symbol: str, 
        current_price: float, 
        threshold_price: float,
        direction: str = "above"
    ):
        """Send a price alert."""
        title = f"Price Alert: {symbol}"
        message = f"{symbol} is now {direction} ${threshold_price:.2f} (Current: ${current_price:.2f})"
        
        notification = Notification(
            user_id=user_id,
            type=NotificationType.PRICE_ALERT,
            priority=NotificationPriority.HIGH,
            title=title,
            message=message,
            data={
                "symbol": symbol,
                "current_price": current_price,
                "threshold_price": threshold_price,
                "direction": direction
            }
        )
        
        return await self.send_notification(notification)
    
    async def send_rebalancing_reminder(
        self, 
        user_id: str, 
        portfolio_drift: float,
        last_rebalance_date: datetime
    ):
        """Send a rebalancing reminder."""
        days_since_rebalance = (datetime.now() - last_rebalance_date).days
        
        title = "Portfolio Rebalancing Reminder"
        message = f"Your portfolio has drifted {portfolio_drift:.1%} from target allocation. Last rebalanced {days_since_rebalance} days ago."
        
        notification = Notification(
            user_id=user_id,
            type=NotificationType.REBALANCING_REMINDER,
            priority=NotificationPriority.MEDIUM,
            title=title,
            message=message,
            data={
                "portfolio_drift": portfolio_drift,
                "days_since_rebalance": days_since_rebalance,
                "last_rebalance_date": last_rebalance_date.isoformat()
            }
        )
        
        return await self.send_notification(notification)
    
    async def send_tax_harvesting_opportunity(
        self, 
        user_id: str, 
        opportunities: List[Dict[str, Any]]
    ):
        """Send tax-loss harvesting opportunity notification."""
        total_savings = sum(opp.get('tax_savings', 0) for opp in opportunities)
        
        title = "Tax-Loss Harvesting Opportunities Available"
        message = f"Found {len(opportunities)} tax-loss harvesting opportunities worth ${total_savings:,.2f} in potential tax savings."
        
        notification = Notification(
            user_id=user_id,
            type=NotificationType.TAX_HARVESTING_OPPORTUNITY,
            priority=NotificationPriority.HIGH,
            title=title,
            message=message,
            data={
                "opportunities": opportunities,
                "total_savings": total_savings,
                "count": len(opportunities)
            }
        )
        
        return await self.send_notification(notification)
    
    async def send_daily_digest(
        self, 
        user_id: str, 
        portfolio_summary: Dict[str, Any],
        market_updates: List[Dict[str, Any]] = None,
        alerts: List[Dict[str, Any]] = None
    ):
        """Send daily digest email."""
        if not user_id in self.configs:
            return {"error": "User not registered"}
        
        config = self.configs[user_id]
        if not config.email_settings:
            return {"error": "Email not configured"}
        
        # Generate digest content
        html_body = self.email_service.generate_daily_digest(
            user_id, portfolio_summary, market_updates or [], alerts or []
        )
        
        # Send email
        success = self.email_service.send_email(
            to_email=config.email_settings.get('email'),
            subject="📊 QuantFlow Daily Portfolio Digest",
            body="Your daily portfolio summary is attached.",
            html_body=html_body,
            from_email=config.email_settings.get('from_email'),
            password=config.email_settings.get('password')
        )
        
        return {"email": success}
    
    def check_alert_rules(
        self, 
        user_id: str, 
        portfolio_data: Dict[str, Any],
        market_data: Dict[str, Any] = None
    ) -> List[AlertRule]:
        """Check if any alert rules should be triggered."""
        triggered_rules = []
        
        for rule in self.alert_rules.values():
            if rule.user_id != user_id or not rule.enabled:
                continue
            
            if self._evaluate_rule_conditions(rule, portfolio_data, market_data):
                triggered_rules.append(rule)
        
        return triggered_rules
    
    def _evaluate_rule_conditions(
        self, 
        rule: AlertRule, 
        portfolio_data: Dict[str, Any],
        market_data: Dict[str, Any] = None
    ) -> bool:
        """Evaluate if alert rule conditions are met."""
        conditions = rule.conditions
        
        # Portfolio value conditions
        if 'min_portfolio_value' in conditions:
            if portfolio_data.get('total_value', 0) < conditions['min_portfolio_value']:
                return True
        
        if 'max_portfolio_value' in conditions:
            if portfolio_data.get('total_value', 0) > conditions['max_portfolio_value']:
                return True
        
        # P&L conditions
        if 'min_daily_pnl' in conditions:
            if portfolio_data.get('daily_pnl', 0) < conditions['min_daily_pnl']:
                return True
        
        if 'max_daily_pnl' in conditions:
            if portfolio_data.get('daily_pnl', 0) > conditions['max_daily_pnl']:
                return True
        
        # Risk conditions
        if 'max_risk_score' in conditions:
            if portfolio_data.get('risk_score', 0) > conditions['max_risk_score']:
                return True
        
        # Drift conditions
        if 'max_drift' in conditions:
            if portfolio_data.get('portfolio_drift', 0) > conditions['max_drift']:
                return True
        
        return False
    
    async def _send_email_notification(
        self, 
        notification: Notification, 
        config: NotificationConfig
    ) -> bool:
        """Send email notification."""
        if not config.email_settings:
            return False
        
        return self.email_service.send_email(
            to_email=config.email_settings.get('email'),
            subject=notification.title,
            body=notification.message,
            from_email=config.email_settings.get('from_email'),
            password=config.email_settings.get('password')
        )
    
    async def _send_slack_notification(
        self, 
        notification: Notification, 
        config: NotificationConfig
    ) -> bool:
        """Send Slack notification."""
        if not config.slack_webhook:
            return False
        
        color_map = {
            NotificationPriority.LOW: "#36a64f",
            NotificationPriority.MEDIUM: "#ffa500",
            NotificationPriority.HIGH: "#ff6b6b",
            NotificationPriority.CRITICAL: "#dc3545"
        }
        
        return self.webhook_service.send_slack_notification(
            config.slack_webhook,
            notification.message,
            notification.title,
            color_map.get(notification.priority, "#36a64f")
        )
    
    async def _send_discord_notification(
        self, 
        notification: Notification, 
        config: NotificationConfig
    ) -> bool:
        """Send Discord notification."""
        if not config.discord_webhook:
            return False
        
        color_map = {
            NotificationPriority.LOW: 0x36a64f,
            NotificationPriority.MEDIUM: 0xffa500,
            NotificationPriority.HIGH: 0xff6b6b,
            NotificationPriority.CRITICAL: 0xdc3545
        }
        
        return self.webhook_service.send_discord_notification(
            config.discord_webhook,
            notification.message,
            notification.title,
            color_map.get(notification.priority, 0x36a64f)
        )
    
    async def _send_push_notification(
        self, 
        notification: Notification, 
        config: NotificationConfig
    ) -> bool:
        """Send push notification."""
        return await self.push_service.send_push_notification(
            notification.user_id, notification
        )
    
    async def _send_custom_webhooks(
        self, 
        notification: Notification, 
        config: NotificationConfig
    ) -> bool:
        """Send custom webhook notifications."""
        if not config.custom_webhooks:
            return False
        
        success_count = 0
        for webhook_url in config.custom_webhooks:
            payload = {
                "notification_id": notification.id,
                "user_id": notification.user_id,
                "type": notification.type.value,
                "priority": notification.priority.value,
                "title": notification.title,
                "message": notification.message,
                "data": notification.data,
                "timestamp": notification.created_at.isoformat()
            }
            
            if self.webhook_service.send_custom_webhook(webhook_url, payload):
                success_count += 1
        
        return success_count > 0
    
    def _is_in_quiet_hours(self, config: NotificationConfig) -> bool:
        """Check if current time is within quiet hours."""
        if not config.quiet_hours:
            return False
        
        now = datetime.now().time()
        start_time_str = config.quiet_hours.get('start_time', '22:00')
        end_time_str = config.quiet_hours.get('end_time', '08:00')
        
        try:
            start_time = datetime.strptime(start_time_str, '%H:%M').time()
            end_time = datetime.strptime(end_time_str, '%H:%M').time()
            
            if start_time <= end_time:
                return start_time <= now <= end_time
            else:  # Overnight quiet hours
                return now >= start_time or now <= end_time
                
        except ValueError:
            return False
    
    async def start_websocket_server(self, host: str = "localhost", port: int = 8765):
        """Start WebSocket server for real-time push notifications."""
        async def handler(websocket, path):
            try:
                # Extract user_id from path or query parameter
                user_id = path.split('/')[-1] if path != '/' else None
                if not user_id:
                    await websocket.close(1008, "User ID required")
                    return
                
                # Register client
                await self.push_service.register_client(user_id, websocket)
                
                # Keep connection alive
                async for message in websocket:
                    # Handle any client messages if needed
                    pass
                    
            except websockets.exceptions.ConnectionClosed:
                pass
            finally:
                if user_id:
                    await self.push_service.unregister_client(user_id)
        
        self.websocket_server = await websockets.serve(handler, host, port)
        self.is_running = True
        print(f"WebSocket server started on ws://{host}:{port}")
    
    async def stop_websocket_server(self):
        """Stop WebSocket server."""
        if self.websocket_server:
            self.websocket_server.close()
            await self.websocket_server.wait_closed()
            self.is_running = False
            print("WebSocket server stopped")
    
    def get_notification_history(
        self, 
        user_id: str, 
        limit: int = 50
    ) -> List[Notification]:
        """Get notification history for a user."""
        user_notifications = [
            n for n in self.notification_history 
            if n.user_id == user_id
        ]
        
        return sorted(
            user_notifications, 
            key=lambda x: x.created_at, 
            reverse=True
        )[:limit]
    
    def mark_notification_read(self, notification_id: str):
        """Mark a notification as read."""
        for notification in self.notification_history:
            if notification.id == notification_id:
                notification.read_at = datetime.now()
                break
