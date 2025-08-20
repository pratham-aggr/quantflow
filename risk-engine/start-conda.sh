#!/bin/bash

# Risk Assessment Engine Startup Script (Conda Version)

echo "🚀 Starting QuantFlow Risk Assessment Engine with Conda..."

# Check if conda is installed
if ! command -v conda &> /dev/null; then
    echo "❌ Conda is not installed. Please install Anaconda or Miniconda first."
    echo "   Download from: https://docs.conda.io/en/latest/miniconda.html"
    exit 1
fi

# Check if environment exists
if conda env list | grep -q "quantflow-risk-engine"; then
    echo "✅ Conda environment 'quantflow-risk-engine' found"
else
    echo "📦 Creating conda environment 'quantflow-risk-engine'..."
    conda env create -f environment.yml
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create conda environment. Please check your conda installation."
        exit 1
    fi
fi

# Activate conda environment
echo "🔧 Activating conda environment..."
eval "$(conda shell.bash hook)"
conda activate quantflow-risk-engine

# Verify activation
if [ "$CONDA_DEFAULT_ENV" != "quantflow-risk-engine" ]; then
    echo "❌ Failed to activate conda environment"
    exit 1
fi

echo "✅ Conda environment activated: $CONDA_DEFAULT_ENV"

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
