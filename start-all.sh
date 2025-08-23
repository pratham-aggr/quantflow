#!/bin/bash

echo "🚀 Starting QuantFlow Application..."

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
}

# Function to start service if not running
start_service() {
    local service_name=$1
    local port=$2
    local command=$3
    
    if check_port $port; then
        echo "✅ $service_name already running on port $port"
    else
        echo "🚀 Starting $service_name on port $port..."
        $command &
        sleep 2
        if check_port $port; then
            echo "✅ $service_name started successfully"
        else
            echo "❌ Failed to start $service_name"
        fi
    fi
}

# Start React Frontend
start_service "React Frontend" 3000 "cd /Users/prathamagggarwal/Documents/github/quantflow && npm start"

# Start Node.js API Server
start_service "Node.js API Server" 4000 "cd /Users/prathamagggarwal/Documents/github/quantflow/server && npm start"

# Start Risk Engine
start_service "Risk Engine" 5002 "cd /Users/prathamagggarwal/Documents/github/quantflow/risk-engine && conda activate quantflow-risk-engine && python minimal_app.py"

echo ""
echo "🎉 All services started!"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   API Health: http://localhost:4000/api/health"
echo "   Risk Engine: http://localhost:5002/health"
echo ""
echo "📋 To stop all services, run: ./stop-all.sh"
