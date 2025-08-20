#!/bin/bash

# Risk Assessment Engine Startup Script

echo "🚀 Starting QuantFlow Risk Assessment Engine..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if installation was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please check your internet connection and try again."
    exit 1
fi

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
echo ""
echo "🔄 Press Ctrl+C to stop the server"
echo ""

python app.py
