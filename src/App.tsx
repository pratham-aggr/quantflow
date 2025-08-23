import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { PortfolioProvider } from './contexts/PortfolioContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { SimpleDashboard } from './components/SimpleDashboard';
import { Settings } from './components/Settings';
import { AuthPage } from './components/AuthPage';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { PortfolioManagement } from './components/PortfolioManagement';
import { Rebalancing } from './components/Rebalancing';
import { RiskAnalysis } from './components/RiskAnalysis';
import { MarketData } from './components/MarketData';
import { Navigation } from './components/Navigation';
import { AuthDebug } from './components/AuthDebug';
import { ToastContainer, useToast } from './components/Toast';
import './App.css';

// Create a client with better error handling and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Toast Provider Component
const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, dismissToast } = useToast();
  
  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
          <div className="max-w-md mx-auto text-center">
            <div className="robinhood-card p-8">
              <div className="mb-4">
                <div className="w-12 h-12 bg-loss-100 dark:bg-loss-800/50 rounded-full flex items-center justify-center mx-auto">
                  <svg className="h-6 w-6 text-loss-600 dark:text-loss-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-lg font-medium robinhood-text-primary mb-2">Something went wrong</h2>
              <p className="robinhood-text-secondary mb-4">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="robinhood-btn-primary"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Router>
            <AuthProvider>
              <PortfolioProvider>
                <ToastProvider>
                  <div className="App">
                    <Navigation />
                    <AuthDebug />
                    <Routes>
                      {/* Public routes - redirect to dashboard if authenticated */}
                      <Route 
                        path="/login" 
                        element={
                          <PublicRoute>
                            <AuthPage />
                          </PublicRoute>
                        } 
                      />
                      <Route 
                        path="/register" 
                        element={
                          <PublicRoute>
                            <AuthPage />
                          </PublicRoute>
                        } 
                      />
                      <Route 
                        path="/reset-password" 
                        element={
                          <PublicRoute>
                            <ResetPasswordForm />
                          </PublicRoute>
                        } 
                      />
                      
                      {/* Protected routes - redirect to login if not authenticated */}
                      <Route 
                        path="/dashboard" 
                        element={
                          <ProtectedRoute>
                            <SimpleDashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute>
                            <Settings />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/portfolios" 
                        element={
                          <ProtectedRoute>
                            <PortfolioManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/rebalancing" 
                        element={
                          <ProtectedRoute>
                            <Rebalancing />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/risk-analysis" 
                        element={
                          <ProtectedRoute>
                            <RiskAnalysis />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/market-data" 
                        element={
                          <ProtectedRoute>
                            <MarketData />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Default redirects */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </div>
                </ToastProvider>
              </PortfolioProvider>
            </AuthProvider>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
