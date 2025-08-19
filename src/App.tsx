import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { PortfolioProvider } from './contexts/PortfolioContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { Dashboard } from './components/Dashboard';
import { ProfilePage } from './components/ProfilePage';
import { AuthPage } from './components/AuthPage';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { PortfolioManagement } from './components/PortfolioManagement';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <PortfolioProvider>
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
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
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
            
            {/* Default redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </PortfolioProvider>
      </AuthProvider>
    </Router>
    </QueryClientProvider>
  );
}

export default App;
