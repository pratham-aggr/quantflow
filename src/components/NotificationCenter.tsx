import React, { useState, useEffect, useCallback } from 'react'
import { 
  Bell, 
  Settings, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  Clock,
  Mail,
  MessageSquare,
  Zap,
  Shield,
  TrendingUp,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff
} from 'lucide-react'
import { 
  notificationService, 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationChannel,
  AlertRule,
  NotificationPreferences,
  createDefaultNotificationPreferences,
  createPortfolioDriftAlert,
  createPriceAlert,
  createRiskAlert
} from '../lib/notificationService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

interface AlertRuleFormData {
  name: string
  type: NotificationType
  conditions: Record<string, any>
  channels: NotificationChannel[]
  enabled: boolean
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [activeTab, setActiveTab] = useState<'notifications' | 'alerts' | 'preferences'>('notifications')
  const [isLoading, setIsLoading] = useState(false)
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [alertFormData, setAlertFormData] = useState<AlertRuleFormData>({
    name: '',
    type: NotificationType.PORTFOLIO_ALERT,
    conditions: {},
    channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    enabled: true
  })

  // Load data on mount
  useEffect(() => {
    if (isOpen && user) {
      loadNotificationData()
    }
  }, [isOpen, user])

  // Connect to WebSocket for real-time notifications
  useEffect(() => {
    if (user) {
      notificationService.connectWebSocket(user.id)
      
      const unsubscribe = notificationService.addNotificationListener(
        user.id,
        (notification) => {
          setNotifications(prev => [notification, ...prev])
          showToast('info', `New notification: ${notification.title}`)
        }
      )

      return () => {
        unsubscribe()
        notificationService.disconnectWebSocket()
      }
    }
  }, [user, showToast])

  const loadNotificationData = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const [notificationsData, alertRulesData, preferencesData] = await Promise.all([
        notificationService.getNotificationHistory(user.id),
        notificationService.getAlertRules(user.id),
        notificationService.getNotificationPreferences(user.id)
      ])
      
      setNotifications(notificationsData)
      setAlertRules(alertRulesData)
      setPreferences(preferencesData || createDefaultNotificationPreferences())
    } catch (error) {
      console.error('Error loading notification data:', error)
      showToast('error', 'Failed to load notification data')
    } finally {
      setIsLoading(false)
    }
  }, [user, showToast])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationRead(notificationId)
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.readAt)
      await Promise.all(
        unreadNotifications.map(n => notificationService.markNotificationRead(n.id))
      )
      setNotifications(prev => 
        prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      )
      showToast('success', 'All notifications marked as read')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      showToast('error', 'Failed to mark notifications as read')
    }
  }

  const handleSendTestNotification = async () => {
    if (!user) return
    
    try {
      const success = await notificationService.sendTestNotification(user.id)
      if (success) {
        showToast('success', 'Test notification sent successfully')
      } else {
        showToast('error', 'Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      showToast('error', 'Failed to send test notification')
    }
  }

  const handleCreateAlertRule = async () => {
    if (!user) return
    
    try {
      const ruleData = {
        userId: user.id,
        name: alertFormData.name,
        type: alertFormData.type,
        conditions: alertFormData.conditions,
        actions: [{
          type: 'notification',
          channels: alertFormData.channels
        }],
        enabled: alertFormData.enabled
      }
      
      const newRule = await notificationService.createAlertRule(ruleData)
      if (newRule) {
        setAlertRules(prev => [...prev, newRule])
        setShowAlertForm(false)
        setAlertFormData({
          name: '',
          type: NotificationType.PORTFOLIO_ALERT,
          conditions: {},
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
          enabled: true
        })
        showToast('success', 'Alert rule created successfully')
      }
    } catch (error) {
      console.error('Error creating alert rule:', error)
      showToast('error', 'Failed to create alert rule')
    }
  }

  const handleUpdateAlertRule = async () => {
    if (!editingRule) return
    
    try {
      const success = await notificationService.updateAlertRule(editingRule.id, {
        name: alertFormData.name,
        type: alertFormData.type,
        conditions: alertFormData.conditions,
        actions: [{
          type: 'notification',
          channels: alertFormData.channels
        }],
        enabled: alertFormData.enabled
      })
      
      if (success) {
        setAlertRules(prev => 
          prev.map(rule => 
            rule.id === editingRule.id 
              ? { ...rule, ...alertFormData }
              : rule
          )
        )
        setEditingRule(null)
        setShowAlertForm(false)
        showToast('success', 'Alert rule updated successfully')
      }
    } catch (error) {
      console.error('Error updating alert rule:', error)
      showToast('error', 'Failed to update alert rule')
    }
  }

  const handleDeleteAlertRule = async (ruleId: string) => {
    try {
      const success = await notificationService.deleteAlertRule(ruleId)
      if (success) {
        setAlertRules(prev => prev.filter(rule => rule.id !== ruleId))
        showToast('success', 'Alert rule deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting alert rule:', error)
      showToast('error', 'Failed to delete alert rule')
    }
  }

  const handleSavePreferences = async () => {
    if (!user || !preferences) return
    
    try {
      notificationService.saveNotificationPreferences(user.id, preferences)
      showToast('success', 'Notification preferences saved')
    } catch (error) {
      console.error('Error saving preferences:', error)
      showToast('error', 'Failed to save preferences')
    }
  }

  const handleRequestNotificationPermission = async () => {
    try {
      const granted = await notificationService.requestNotificationPermission()
      if (granted) {
        showToast('success', 'Notification permission granted')
      } else {
        showToast('error', 'Notification permission denied')
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      showToast('error', 'Failed to request notification permission')
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, React.ReactNode> = {
      [NotificationType.PORTFOLIO_ALERT]: <DollarSign className="w-4 h-4" />,
      [NotificationType.PRICE_ALERT]: <TrendingUp className="w-4 h-4" />,
      [NotificationType.REBALANCING_REMINDER]: <Shield className="w-4 h-4" />,
      [NotificationType.TAX_HARVESTING_OPPORTUNITY]: <Calendar className="w-4 h-4" />,
      [NotificationType.RISK_ALERT]: <AlertTriangle className="w-4 h-4" />,
      [NotificationType.PERFORMANCE_UPDATE]: <TrendingUp className="w-4 h-4" />,
      [NotificationType.MARKET_UPDATE]: <Globe className="w-4 h-4" />,
      [NotificationType.SYSTEM_ALERT]: <Info className="w-4 h-4" />
    }
    return iconMap[type] || <Bell className="w-4 h-4" />
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    const colorMap: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: 'text-green-600',
      [NotificationPriority.MEDIUM]: 'text-yellow-600',
      [NotificationPriority.HIGH]: 'text-orange-600',
      [NotificationPriority.CRITICAL]: 'text-red-600'
    }
    return colorMap[priority] || 'text-gray-600'
  }

  const unreadCount = notifications.filter(n => !n.readAt).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'notifications' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'alerts' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Alert Rules
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'preferences' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-1" />
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      Recent Notifications
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mark all read
                      </button>
                      <button
                        onClick={handleSendTestNotification}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        Send test
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border ${
                            notification.readAt 
                              ? 'bg-gray-50 border-gray-200' 
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`mt-1 ${getPriorityColor(notification.priority)}`}>
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">
                                    {notification.title}
                                  </h4>
                                  {!notification.readAt && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span>{notificationService.formatNotificationTime(notification.createdAt)}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    notification.priority === NotificationPriority.CRITICAL 
                                      ? 'bg-red-100 text-red-800'
                                      : notification.priority === NotificationPriority.HIGH
                                      ? 'bg-orange-100 text-orange-800'
                                      : notification.priority === NotificationPriority.MEDIUM
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {notification.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {!notification.readAt && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Check className="w-4 h-4 text-gray-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alert Rules Tab */}
              {activeTab === 'alerts' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      Alert Rules
                    </h3>
                    <button
                      onClick={() => setShowAlertForm(true)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Rule</span>
                    </button>
                  </div>

                  {alertRules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No alert rules configured</p>
                      <button
                        onClick={() => setShowAlertForm(true)}
                        className="mt-2 text-blue-600 hover:text-blue-800"
                      >
                        Create your first rule
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alertRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-3 rounded-lg border border-gray-200 bg-white"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {rule.name}
                                </h4>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  rule.enabled 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {rule.enabled ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {rule.type.replace('_', ' ')}
                              </p>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => {
                                  setEditingRule(rule)
                                  setAlertFormData({
                                    name: rule.name,
                                    type: rule.type,
                                    conditions: rule.conditions,
                                    channels: rule.actions[0]?.channels || [],
                                    enabled: rule.enabled
                                  })
                                  setShowAlertForm(true)
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Edit3 className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteAlertRule(rule.id)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Trash2 className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && preferences && (
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Notification Preferences
                  </h3>

                  <div className="space-y-4">
                    {/* Channels */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Notification Channels
                      </h4>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.pushNotifications}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { ...prev, pushNotifications: e.target.checked } : null
                            )}
                            className="mr-2"
                          />
                          <span className="text-sm">Push Notifications</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.emailDigest}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { ...prev, emailDigest: e.target.checked } : null
                            )}
                            className="mr-2"
                          />
                          <span className="text-sm">Email Digest</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.slackNotifications}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { ...prev, slackNotifications: e.target.checked } : null
                            )}
                            className="mr-2"
                          />
                          <span className="text-sm">Slack Notifications</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.discordNotifications}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { ...prev, discordNotifications: e.target.checked } : null
                            )}
                            className="mr-2"
                          />
                          <span className="text-sm">Discord Notifications</span>
                        </label>
                      </div>
                    </div>

                    {/* Quiet Hours */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Quiet Hours
                      </h4>
                      <label className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={preferences.quietHours.enabled}
                          onChange={(e) => setPreferences(prev => 
                            prev ? { 
                              ...prev, 
                              quietHours: { 
                                ...prev.quietHours, 
                                enabled: e.target.checked 
                              } 
                            } : null
                          )}
                          className="mr-2"
                        />
                        <span className="text-sm">Enable quiet hours</span>
                      </label>
                      {preferences.quietHours.enabled && (
                        <div className="flex space-x-2">
                          <input
                            type="time"
                            value={preferences.quietHours.startTime}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { 
                                ...prev, 
                                quietHours: { 
                                  ...prev.quietHours, 
                                  startTime: e.target.value 
                                } 
                              } : null
                            )}
                            className="text-sm border rounded px-2 py-1"
                          />
                          <span className="text-sm text-gray-500">to</span>
                          <input
                            type="time"
                            value={preferences.quietHours.endTime}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { 
                                ...prev, 
                                quietHours: { 
                                  ...prev.quietHours, 
                                  endTime: e.target.value 
                                } 
                              } : null
                            )}
                            className="text-sm border rounded px-2 py-1"
                          />
                        </div>
                      )}
                    </div>

                    {/* Alert Thresholds */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Alert Thresholds
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-600">
                            Portfolio Drift (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={preferences.alertThresholds.portfolioDrift * 100}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { 
                                ...prev, 
                                alertThresholds: { 
                                  ...prev.alertThresholds, 
                                  portfolioDrift: parseFloat(e.target.value) / 100 
                                } 
                              } : null
                            )}
                            className="w-full text-sm border rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">
                            Daily P&L Threshold ($)
                          </label>
                          <input
                            type="number"
                            value={preferences.alertThresholds.dailyPnlThreshold}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { 
                                ...prev, 
                                alertThresholds: { 
                                  ...prev.alertThresholds, 
                                  dailyPnlThreshold: parseFloat(e.target.value) 
                                } 
                              } : null
                            )}
                            className="w-full text-sm border rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">
                            Risk Score Threshold
                          </label>
                          <input
                            type="number"
                            value={preferences.alertThresholds.riskScoreThreshold}
                            onChange={(e) => setPreferences(prev => 
                              prev ? { 
                                ...prev, 
                                alertThresholds: { 
                                  ...prev.alertThresholds, 
                                  riskScoreThreshold: parseFloat(e.target.value) 
                                } 
                              } : null
                            )}
                            className="w-full text-sm border rounded px-2 py-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-4">
                      <button
                        onClick={handleRequestNotificationPermission}
                        className="flex-1 bg-blue-600 text-white text-sm py-2 px-3 rounded hover:bg-blue-700"
                      >
                        Request Permission
                      </button>
                      <button
                        onClick={handleSavePreferences}
                        className="flex-1 bg-green-600 text-white text-sm py-2 px-3 rounded hover:bg-green-700"
                      >
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Alert Rule Form Modal */}
        {showAlertForm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
                </h3>
                <button
                  onClick={() => {
                    setShowAlertForm(false)
                    setEditingRule(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={alertFormData.name}
                    onChange={(e) => setAlertFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Enter rule name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alert Type
                  </label>
                  <select
                    value={alertFormData.type}
                    onChange={(e) => setAlertFormData(prev => ({ 
                      ...prev, 
                      type: e.target.value as NotificationType 
                    }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value={NotificationType.PORTFOLIO_ALERT}>Portfolio Alert</option>
                    <option value={NotificationType.PRICE_ALERT}>Price Alert</option>
                    <option value={NotificationType.RISK_ALERT}>Risk Alert</option>
                    <option value={NotificationType.REBALANCING_REMINDER}>Rebalancing Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notification Channels
                  </label>
                  <div className="space-y-1">
                    {Object.values(NotificationChannel).map((channel) => (
                      <label key={channel} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={alertFormData.channels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAlertFormData(prev => ({
                                ...prev,
                                channels: [...prev.channels, channel]
                              }))
                            } else {
                              setAlertFormData(prev => ({
                                ...prev,
                                channels: prev.channels.filter(c => c !== channel)
                              }))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alertFormData.enabled}
                    onChange={(e) => setAlertFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Enable this rule</span>
                </label>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={() => {
                      setShowAlertForm(false)
                      setEditingRule(null)
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-3 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingRule ? handleUpdateAlertRule : handleCreateAlertRule}
                    disabled={!alertFormData.name}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editingRule ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Missing Globe icon component
const Globe: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
