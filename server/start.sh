#!/bin/bash

echo "🚀 Starting TraiCa IoT System..."
echo "📂 Current directory: $(pwd)"

# Check if we're in the correct directory
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found. Make sure you're in the server directory."
    echo "💡 Try: cd TraiCa/server"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🌟 Starting server..."
echo "📱 Frontend will be available at: http://localhost:5000"
echo "🔌 WebSocket will be available at: ws://localhost:5000"
echo "📡 API will be available at: http://localhost:5000/api"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

node server.js
