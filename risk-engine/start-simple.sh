#!/bin/bash

# Simple Risk Assessment Engine Startup Script
# Assumes conda environment is already active

echo "🚀 Starting QuantFlow Risk Assessment Engine..."

# Set environment variables
export FLASK_ENV=development
export FLASK_DEBUG=1

# Start the Flask server
echo "🌐 Starting Flask server on http://localhost:5001..."
echo "📊 Risk Assessment Engine API endpoints:"
echo "   - Health Check: GET /health"
echo "   - Portfolio Risk: POST /api/risk/portfolio"
echo "   - Stock Risk: GET /api/risk/holding/{symbol}"
echo "   - VaR Calculation: POST /api/risk/var"
echo "   - Beta Calculation: POST /api/risk/beta"
echo "   - Risk Score: POST /api/risk/score"
echo "   - Risk Alerts: POST /api/risk/alerts"
echo "   - Rebalancing Analysis: POST /api/rebalancing/analyze"
echo "   - What-If Analysis: POST /api/rebalancing/what-if"
echo ""
echo "🔄 Press Ctrl+C to stop the server"
echo ""

python app.py
