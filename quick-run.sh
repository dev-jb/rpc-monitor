#!/bin/bash

# Quick RPC Monitor Docker Runner
# Runs with default configuration for quick testing

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Quick RPC Monitor Runner${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build image if needed
if ! docker image inspect rpc-monitor > /dev/null 2>&1; then
    echo "📦 Building Docker image..."
    docker build -t rpc-monitor .
fi

# Stop existing container if running
if docker ps -q -f name=rpc-monitor > /dev/null 2>&1; then
    echo "🛑 Stopping existing container..."
    docker stop rpc-monitor
    docker rm rpc-monitor
fi

# Run with default configuration
echo "🚀 Starting RPC Monitor with default configuration..."
docker run -d \
    --name rpc-monitor \
    -p 8080:8080 \
    --restart unless-stopped \
    rpc-monitor

echo -e "${GREEN}✅ Container started successfully${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard available at: http://localhost:8080${NC}"
echo -e "${BLUE}🔍 Container logs: docker logs -f rpc-monitor${NC}"
echo -e "${BLUE}🛑 Stop container: docker stop rpc-monitor${NC}" 