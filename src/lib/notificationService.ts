import { performanceMonitor } from './performance'

// Types for notification system
export enum NotificationType {
  PORTFOLIO_ALERT = 'portfolio_alert',
  PRICE_ALERT = 'price_alert',
  REBALANCING_REMINDER = 'rebalancing_reminder',
  TAX_HARVESTING_OPPORTUNITY = 'tax_harvesting_opportunity',
  RISK_ALERT = 'risk_alert',
  PERFORMANCE_UPDATE = 'performance_update',
  MARKET_UPDATE = 'market_update',
  SYSTEM_ALERT = 'system_alert'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SLACK = 'slack',
  DISCORD = 'discord',
  WEBHOOK = 'webhook',
  SMS = 'sms'
}

export interface NotificationConfig {
  userId: string
  channels: NotificationChannel[]
  preferences: Record<string, any>
  emailSettings?: {
    email: string
    fromEmail?: string
    password?: string
  }
  slackWebhook?: string
  discordWebhook?: string
  pushTokens: string[]
  phoneNumber?: string
  customWebhooks: string[]
  alertThresholds: Record<string, number>
  quietHours?: {
    startTime: string
    endTime: string
  }
  enabled: boolean
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data: Record<string, any>
  channels: NotificationChannel[]
  createdAt: string
  sentAt?: string
  readAt?: string
  expiresAt?: string
}

export interface AlertRule {
  id: string
  userId: string
  name: string
  type: NotificationType
  conditions: Record<string, any>
  actions: Array<Record<string, any>>
  enabled: boolean
  createdAt: string
}

export interface NotificationPreferences {
  emailDigest: boolean
  pushNotifications: boolean
  slackNotifications: boolean
  discordNotifications: boolean
  quietHours: {
    enabled: boolean
    startTime: string
    endTime: string
  }
  alertThresholds: {
    portfolioDrift: number
    dailyPnlThreshold: number
    riskScoreThreshold: number
    priceChangeThreshold: number
  }
  channels: NotificationChannel[]
}

class NotificationService {
  private baseUrl: string
  private websocket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, Set<(notification: Notification) => void>> = new Map()
  private notificationHistory: Notification[] = []
  private isConnected = false

  constructor() {
    this.baseUrl = process.env.REACT_APP_RISK_ENGINE_URL || 'https://quantflow-production.up.railway.app'
  }

  // WebSocket Connection Management
  async connectWebSocket(userId: string): Promise<void> {
    return performanceMonitor.trackAsync('websocket-connect', async () => {
      try {
        const wsUrl = `ws://localhost:8765/${userId}`
        this.websocket = new WebSocket(wsUrl)

        this.websocket.onopen = () => {
          console.log('WebSocket connected for notifications')
          this.isConnected = true
          this.reconnectAttempts = 0
        }

        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'notification') {
              this.handleIncomingNotification(data.data)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.websocket.onclose = () => {
          console.log('WebSocket disconnected')
          this.isConnected = false
          // Don't attempt to reconnect if WebSocket server is not available
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleReconnect(userId)
          }
        }

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnected = false
        }

      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        // Don't throw error, just log it and continue without WebSocket
        console.log('Continuing without WebSocket notifications')
      }
    })
  }

  private handleReconnect(userId: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connectWebSocket(userId)
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached - WebSocket server not available')
      console.log('Continuing without real-time notifications')
    }
  }

  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
      this.isConnected = false
    }
  }

  // Notification Event Listeners
  addNotificationListener(
    userId: string, 
    callback: (notification: Notification) => void
  ): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set())
    }
    
    this.listeners.get(userId)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const userListeners = this.listeners.get(userId)
      if (userListeners) {
        userListeners.delete(callback)
        if (userListeners.size === 0) {
          this.listeners.delete(userId)
        }
      }
    }
  }

  private handleIncomingNotification(notification: Notification): void {
    // Add to history
    this.notificationHistory.unshift(notification)
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100)
    }

    // Notify listeners
    const userListeners = this.listeners.get(notification.userId)
    if (userListeners) {
      userListeners.forEach(callback => {
        try {
          callback(notification)
        } catch (error) {
          console.error('Error in notification listener:', error)
        }
      })
    }

    // Show browser notification if supported
    this.showBrowserNotification(notification)
  }

  private showBrowserNotification(notification: Notification): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/logo192.png',
      tag: notification.id,
      requireInteraction: notification.priority === NotificationPriority.CRITICAL
    })

    browserNotification.onclick = () => {
      window.focus()
      browserNotification.close()
    }
  }

  // API Methods
  async registerUser(config: NotificationConfig): Promise<boolean> {
    return performanceMonitor.trackAsync('register-notification-user', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        })

        if (!response.ok) {
          throw new Error(`Failed to register user: ${response.statusText}`)
        }

        const result = await response.json()
        return result.success
      } catch (error) {
        console.error('Error registering notification user:', error)
        return false
      }
    })
  }

  async unregisterUser(userId: string): Promise<boolean> {
    return performanceMonitor.trackAsync('unregister-notification-user', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/unregister/${userId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error(`Failed to unregister user: ${response.statusText}`)
        }

        const result = await response.json()
        return result.success
      } catch (error) {
        console.error('Error unregistering notification user:', error)
        return false
      }
    })
  }

  async updateNotificationConfig(
    userId: string, 
    config: Partial<NotificationConfig>
  ): Promise<boolean> {
    return performanceMonitor.trackAsync('update-notification-config', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/config/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        })

        if (!response.ok) {
          throw new Error(`Failed to update config: ${response.statusText}`)
        }

        const result = await response.json()
        return result.success
      } catch (error) {
        console.error('Error updating notification config:', error)
        return false
      }
    })
  }

  async getNotificationHistory(
    userId: string, 
    limit: number = 50
  ): Promise<Notification[]> {
    return performanceMonitor.trackAsync('get-notification-history', async () => {
      try {
        const response = await fetch(
          `${this.baseUrl}/api/notifications/history/${userId}?limit=${limit}`,
          {
            method: 'GET',
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to get history: ${response.statusText}`)
        }

        const result = await response.json()
        return result.notifications || []
      } catch (error) {
        console.error('Error getting notification history:', error)
        return []
      }
    })
  }

  async markNotificationRead(notificationId: string): Promise<boolean> {
    return performanceMonitor.trackAsync('mark-notification-read', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/read/${notificationId}`, {
          method: 'PUT',
        })

        if (!response.ok) {
          throw new Error(`Failed to mark as read: ${response.statusText}`)
        }

        const result = await response.json()
        return result.success
      } catch (error) {
        console.error('Error marking notification as read:', error)
        return false
      }
    })
  }

  // Alert Rules Management
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt'>): Promise<AlertRule | null> {
    return performanceMonitor.trackAsync('create-alert-rule', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/alert-rules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rule),
        })

        if (!response.ok) {
          throw new Error(`Failed to create alert rule: ${response.statusText}`)
        }

        const result = await response.json()
        return result.rule
      } catch (error) {
        console.error('Error creating alert rule:', error)
        return null
      }
    })
  }

  async getAlertRules(userId: string): Promise<AlertRule[]> {
    return performanceMonitor.trackAsync('get-alert-rules', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/alert-rules/${userId}`, {
          method: 'GET',
        })

        if (!response.ok) {
          throw new Error(`Failed to get alert rules: ${response.statusText}`)
        }

        const result = await response.json()
        return result.rules || []
      } catch (error) {
        console.error('Error getting alert rules:', error)
        return []
      }
    })
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean> {
    return performanceMonitor.trackAsync('update-alert-rule', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/alert-rules/${ruleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error(`Failed to update alert rule: ${response.statusText}`)
        }

        const result = await response.json()
        return result.success
      } catch (error) {
        console.error('Error updating alert rule:', error)
        return false
      }
    })
  }

  async deleteAlertRule(ruleId: string): Promise<boolean> {
    return performanceMonitor.trackAsync('delete-alert-rule', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/alert-rules/${ruleId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error(`Failed to delete alert rule: ${response.statusText}`)
        }

        const result = await response.json()
        return result.success
      } catch (error) {
        console.error('Error deleting alert rule:', error)
        return false
      }
    })
  }

  // Test Notifications
  async sendTestNotification(
    userId: string, 
    type: NotificationType = NotificationType.SYSTEM_ALERT
  ): Promise<boolean> {
    return performanceMonitor.trackAsync('send-test-notification', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/notifications/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            type: type,
            title: 'Test Notification',
            message: 'This is a test notification from QuantFlow',
            priority: NotificationPriority.MEDIUM
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to send test notification: ${response.statusText}`)
        }

        const result = await response.json()
        return result.success
      } catch (error) {
        console.error('Error sending test notification:', error)
        return false
      }
    })
  }

  // Utility Methods
  getNotificationIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.PORTFOLIO_ALERT]: '💰',
      [NotificationType.PRICE_ALERT]: '📈',
      [NotificationType.REBALANCING_REMINDER]: '⚖️',
      [NotificationType.TAX_HARVESTING_OPPORTUNITY]: '🏛️',
      [NotificationType.RISK_ALERT]: '⚠️',
      [NotificationType.PERFORMANCE_UPDATE]: '📊',
      [NotificationType.MARKET_UPDATE]: '🌍',
      [NotificationType.SYSTEM_ALERT]: '🔔'
    }
    return iconMap[type] || '🔔'
  }

  getPriorityColor(priority: NotificationPriority): string {
    const colorMap: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: '#28a745',
      [NotificationPriority.MEDIUM]: '#ffc107',
      [NotificationPriority.HIGH]: '#fd7e14',
      [NotificationPriority.CRITICAL]: '#dc3545'
    }
    return colorMap[priority] || '#6c757d'
  }

  formatNotificationTime(timestamp: string): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  getUnreadCount(userId: string): number {
    return this.notificationHistory.filter(
      notification => notification.userId === userId && !notification.readAt
    ).length
  }

  // Browser Notification Permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied')
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  // Local Storage Management
  saveNotificationPreferences(userId: string, preferences: NotificationPreferences): void {
    try {
      localStorage.setItem(`notification_preferences_${userId}`, JSON.stringify(preferences))
    } catch (error) {
      console.error('Error saving notification preferences:', error)
    }
  }

  getNotificationPreferences(userId: string): NotificationPreferences | null {
    try {
      const stored = localStorage.getItem(`notification_preferences_${userId}`)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Error loading notification preferences:', error)
      return null
    }
  }

  // Cleanup
  cleanup(): void {
    this.disconnectWebSocket()
    this.listeners.clear()
    this.notificationHistory = []
  }
}

export const notificationService = new NotificationService()

// Default notification preferences
export const createDefaultNotificationPreferences = (): NotificationPreferences => ({
  emailDigest: true,
  pushNotifications: true,
  slackNotifications: false,
  discordNotifications: false,
  quietHours: {
    enabled: true,
    startTime: '22:00',
    endTime: '08:00'
  },
  alertThresholds: {
    portfolioDrift: 0.05,
    dailyPnlThreshold: -1000,
    riskScoreThreshold: 70,
    priceChangeThreshold: 0.05
  },
  channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
})

// Helper functions for creating common alert rules
export const createPortfolioDriftAlert = (
  userId: string, 
  threshold: number = 0.05
): Omit<AlertRule, 'id' | 'createdAt'> => ({
  userId,
  name: 'Portfolio Drift Alert',
  type: NotificationType.PORTFOLIO_ALERT,
  conditions: {
    max_drift: threshold
  },
  actions: [
    {
      type: 'notification',
      channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
    }
  ],
  enabled: true
})

export const createPriceAlert = (
  userId: string, 
  symbol: string, 
  threshold: number,
  direction: 'above' | 'below' = 'above'
): Omit<AlertRule, 'id' | 'createdAt'> => ({
  userId,
  name: `${symbol} Price Alert`,
  type: NotificationType.PRICE_ALERT,
  conditions: {
    symbol,
    threshold_price: threshold,
    direction
  },
  actions: [
    {
      type: 'notification',
      channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL]
    }
  ],
  enabled: true
})

export const createRiskAlert = (
  userId: string, 
  threshold: number = 70
): Omit<AlertRule, 'id' | 'createdAt'> => ({
  userId,
  name: 'High Risk Alert',
  type: NotificationType.RISK_ALERT,
  conditions: {
    max_risk_score: threshold
  },
  actions: [
    {
      type: 'notification',
      channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
    }
  ],
  enabled: true
})
