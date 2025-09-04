#!/bin/bash

# RPC Monitor Docker Run Script
# Usage: ./run-docker.sh [PORT] [CONTAINER_NAME] [INTERNAL_PORT]
# 
# The script will:
# 1. Load values from .env file if it exists
# 2. Override with command line arguments if provided
# 3. Use defaults if neither .env nor command line arguments are provided
# 
# Port can be set via:
# - .env file: PORT=3000
# - Command line: ./run-docker.sh 3000
# - Default: 8080
# 
# Container name can be set via:
# - .env file: CONTAINER_NAME=my-monitor
# - Command line: ./run-docker.sh 8080 my-monitor
# - Default: rpc-monitor
# 
# Internal port can be set via:
# - .env file: INTERNAL_PORT=8080
# - Command line: ./run-docker.sh 8080 rpc-monitor 8080
# - Default: 8080

set -e

# Default values
DEFAULT_PORT="8080"
DEFAULT_CONTAINER_NAME="rpc-monitor"
DEFAULT_INTERNAL_PORT="8080"

# Load values from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading configuration from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Parse command line arguments (these take precedence over .env values)
PORT=${1:-${PORT:-$DEFAULT_PORT}}
CONTAINER_NAME=${2:-${CONTAINER_NAME:-$DEFAULT_CONTAINER_NAME}}
INTERNAL_PORT=${3:-${INTERNAL_PORT:-$DEFAULT_INTERNAL_PORT}}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 RPC Monitor Docker Runner${NC}"
echo -e "${BLUE}========================${NC}"
echo ""

# Display configuration source
if [ -f ".env" ]; then
    echo -e "${YELLOW}📄 Configuration loaded from .env file${NC}"
    if [ $# -gt 0 ]; then
        echo -e "${YELLOW}🔄 Command line arguments override .env values${NC}"
    fi
else
    echo -e "${YELLOW}📄 No .env file found, using defaults${NC}"
    if [ $# -gt 0 ]; then
        echo -e "${YELLOW}🔄 Using command line arguments${NC}"
    else
        echo -e "${YELLOW}🔄 Using default values${NC}"
    fi
fi
echo ""

# Display configuration
echo -e "${YELLOW}Configuration:${NC}"
echo "  Port: $PORT"
echo "  Container Name: $CONTAINER_NAME"
echo "  Internal Port: $INTERNAL_PORT"
echo ""
echo -e "${YELLOW}Note: RPC endpoints are configured via environment variables in .env file${NC}"
echo -e "${YELLOW}See README.md for configuration options${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if image exists, build if not
if ! docker image inspect rpc-monitor > /dev/null 2>&1; then
    echo -e "${YELLOW}📦 Building Docker image...${NC}"
    docker build -t rpc-monitor .
    echo -e "${GREEN}✅ Image built successfully${NC}"
else
    echo -e "${GREEN}✅ Docker image found${NC}"
fi

# Stop existing container if running
if docker ps -q -f name=$CONTAINER_NAME > /dev/null 2>&1; then
    echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
    docker stop $CONTAINER_NAME > /dev/null 2>&1 || true
    docker rm $CONTAINER_NAME > /dev/null 2>&1 || true
elif docker ps -aq -f name=$CONTAINER_NAME > /dev/null 2>&1; then
    echo -e "${YELLOW}🧹 Removing stopped container...${NC}"
    docker rm $CONTAINER_NAME > /dev/null 2>&1 || true
else
    echo -e "${GREEN}✅ No existing container found${NC}"
fi

# Run the container
echo -e "${YELLOW}🚀 Starting RPC Monitor container...${NC}"

# Check if .env file exists and pass it to the container
if [ -f ".env" ]; then
    echo -e "${YELLOW}📄 Passing .env file to container...${NC}"
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:$INTERNAL_PORT \
        --env-file .env \
        --restart unless-stopped \
        rpc-monitor
else
    echo -e "${YELLOW}⚠️  No .env file found, using default configuration${NC}"
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:$INTERNAL_PORT \
        --restart unless-stopped \
        rpc-monitor
fi

echo -e "${GREEN}✅ Container started successfully${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard available at: http://localhost:$PORT${NC}"
echo -e "${BLUE}🔍 Container logs: docker logs -f $CONTAINER_NAME${NC}"
echo -e "${BLUE}🛑 Stop container: docker stop $CONTAINER_NAME${NC}"
echo ""

# Show logs for a few seconds
echo -e "${YELLOW}📋 Recent logs:${NC}"
docker logs --tail 10 $CONTAINER_NAME 