#!/bin/bash

echo "🛑 Stopping QuantFlow Application..."

# Stop React development server
echo "🛑 Stopping React Frontend..."
pkill -f "react-scripts start"

# Stop Node.js API server
echo "🛑 Stopping Node.js API Server..."
pkill -f "node index.js"

# Stop Risk Engine
echo "🛑 Stopping Risk Engine..."
pkill -f "python minimal_app.py"
pkill -f "python app.py"

# Wait a moment for processes to stop
sleep 2

echo "✅ All services stopped!"
echo ""
echo "📋 To restart all services, run: ./start-all.sh"
