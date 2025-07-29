#!/bin/bash

# RPC Monitor Docker Run Script
# Usage: ./run-docker.sh [HYPERLIQUID_URL] [LOCAL_NODE_URL] [ARCHIVE_NODE_URL] [LOCAL_SYSTEM_URL] [ARCHIVE_SYSTEM_URL]

set -e

# Default values
DEFAULT_HYPERLIQUID_URL="https://rpc.hyperliquid-testnet.xyz/evm"
DEFAULT_LOCAL_NODE_URL="http://localhost:3001/evm"
DEFAULT_ARCHIVE_NODE_URL="http://localhost:8547"
DEFAULT_LOCAL_SYSTEM_URL="http://localhost:8081/system"
DEFAULT_ARCHIVE_SYSTEM_URL="http://localhost:8081/system"

# Parse command line arguments
HYPERLIQUID_URL=${1:-$DEFAULT_HYPERLIQUID_URL}
LOCAL_NODE_URL=${2:-$DEFAULT_LOCAL_NODE_URL}
ARCHIVE_NODE_URL=${3:-$DEFAULT_ARCHIVE_NODE_URL}
LOCAL_SYSTEM_URL=${4:-$DEFAULT_LOCAL_SYSTEM_URL}
ARCHIVE_SYSTEM_URL=${5:-$DEFAULT_ARCHIVE_SYSTEM_URL}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 RPC Monitor Docker Runner${NC}"
echo -e "${BLUE}========================${NC}"
echo ""

# Display configuration
echo -e "${YELLOW}Configuration:${NC}"
echo "  HyperLiquid URL: $HYPERLIQUID_URL"
echo "  Local Node URL:  $LOCAL_NODE_URL"
echo "  Archive Node URL: $ARCHIVE_NODE_URL"
echo "  Local System URL: $LOCAL_SYSTEM_URL"
echo "  Archive System URL: $ARCHIVE_SYSTEM_URL"
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
if docker ps -q -f name=rpc-monitor > /dev/null 2>&1; then
    echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
    docker stop rpc-monitor
    docker rm rpc-monitor
fi

# Run the container
echo -e "${YELLOW}🚀 Starting RPC Monitor container...${NC}"
docker run -d \
    --name rpc-monitor \
    -p 8080:8080 \
    -e HYPERLIQUID_MAIN_URL="$HYPERLIQUID_URL" \
    -e LOCAL_NODE_URL="$LOCAL_NODE_URL" \
    -e ARCHIVE_NODE_URL="$ARCHIVE_NODE_URL" \
    -e LOCAL_NODE_SYSTEM_URL="$LOCAL_SYSTEM_URL" \
    -e ARCHIVE_NODE_SYSTEM_URL="$ARCHIVE_SYSTEM_URL" \
    -e CHAIN=Testnet \
    -e HYPERLIQUID_CHAIN_ID=998 \
    -e LOCAL_NODE_CHAIN_ID=998 \
    -e ARCHIVE_NODE_CHAIN_ID=998 \
    --restart unless-stopped \
    rpc-monitor

echo -e "${GREEN}✅ Container started successfully${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard available at: http://localhost:8080${NC}"
echo -e "${BLUE}🔍 Container logs: docker logs -f rpc-monitor${NC}"
echo -e "${BLUE}🛑 Stop container: docker stop rpc-monitor${NC}"
echo ""

# Show logs for a few seconds
echo -e "${YELLOW}📋 Recent logs:${NC}"
docker logs --tail 10 rpc-monitor 