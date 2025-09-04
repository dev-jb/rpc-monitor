#!/bin/bash

# RPC Monitor Docker Run Script
# Usage: ./run-docker.sh [PORT] [CONTAINER_NAME] [INTERNAL_PORT]
# 
# Server deployment considerations:
# - Run with sudo if needed: sudo ./run-docker.sh
# - For production, ensure proper firewall rules
# - Consider using docker-compose for complex deployments
# 
# Configuration Priority (highest to lowest):
# 1. Command line arguments
# 2. .env file variables
# 3. Default values
# 
# Examples:
# 
# Set port via command line:
#   ./run-docker.sh 3000
# 
# Set port via .env file:
#   echo "PORT=3000" > .env
#   ./run-docker.sh
# 
# Set all parameters via command line:
#   ./run-docker.sh 3000 my-monitor 8080
# 
# Set all parameters via .env file:
#   echo -e "PORT=3000\nCONTAINER_NAME=my-monitor\nINTERNAL_PORT=8080" > .env
#   ./run-docker.sh
# 
# Environment variables for .env file:
#   PORT=3000                    # External port (default: 8080)
#   CONTAINER_NAME=my-monitor    # Container name (default: rpc-monitor)
#   INTERNAL_PORT=8080          # Internal container port (default: 8080)

set -e

# Help function
show_help() {
    echo "RPC Monitor Docker Run Script"
    echo ""
    echo "Usage: $0 [PORT] [CONTAINER_NAME] [INTERNAL_PORT]"
    echo ""
    echo "Arguments:"
    echo "  PORT           External port to bind (default: 8080)"
    echo "  CONTAINER_NAME Docker container name (default: rpc-monitor)"
    echo "  INTERNAL_PORT  Internal container port (default: 8080)"
    echo ""
    echo "Configuration Priority:"
    echo "  1. Command line arguments"
    echo "  2. .env file variables"
    echo "  3. Default values"
    echo ""
    echo "Examples:"
    echo "  $0                    # Use defaults"
    echo "  $0 3000              # Use port 3000"
    echo "  $0 3000 my-monitor   # Use port 3000 and container name 'my-monitor'"
    echo ""
    echo "Environment variables (.env file):"
    echo "  PORT=3000"
    echo "  CONTAINER_NAME=my-monitor"
    echo "  INTERNAL_PORT=8080"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  -d, --debug   Enable debug mode (show .env file contents)"
    exit 0
}

# Check for help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
fi

# Check for debug flag
if [ "$1" = "-d" ] || [ "$1" = "--debug" ]; then
    echo "🔍 Debug mode enabled"
    DEBUG_MODE=true
    shift # Remove the debug flag from arguments
else
    DEBUG_MODE=false
fi

# Detect if running on a server (no display)
if [ -z "$DISPLAY" ] && [ -z "$SSH_TTY" ] && [ -z "$SSH_CLIENT" ]; then
    # Likely running on a server
    SERVER_MODE=true
else
    SERVER_MODE=false
fi

# Default values
DEFAULT_PORT="8080"
DEFAULT_CONTAINER_NAME="rpc-monitor"
DEFAULT_INTERNAL_PORT="8080"

# Load values from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading configuration from .env file..."
    
    # Show .env file contents in debug mode
    if [ "$DEBUG_MODE" = true ]; then
        echo "🔍 .env file contents:"
        cat -n .env | sed 's/^/   /'
        echo ""
    fi
    
    # Validate .env file format first
    echo "🔍 Validating .env file format..."
    invalid_lines=()
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
            # Check if line contains = and is a valid environment variable
            if [[ ! "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                invalid_lines+=("$line")
            fi
        fi
    done < .env
    
    # Show invalid lines if any
    if [ ${#invalid_lines[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found ${#invalid_lines[@]} invalid line(s) in .env file:${NC}"
        for line in "${invalid_lines[@]}"; do
            echo -e "${YELLOW}   '$line'${NC}"
        done
        echo -e "${YELLOW}💡 Valid format: KEY=value (no spaces around =)${NC}"
        echo ""
    fi
    
    # Load valid environment variables
    set -a
    while IFS= read -r line; do
        # Trim whitespace from line
        line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # Skip empty lines and comments
        if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
            # Check if line contains = and is a valid environment variable
            if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                export "$line"
                if [ "$DEBUG_MODE" = true ]; then
                    echo "   ✅ Loaded: $line"
                fi
            fi
        fi
    done < .env
    set +a
fi

# Parse command line arguments (these take precedence over .env values)
# Priority: Command line > .env file > defaults
if [ -n "$1" ]; then
    PORT="$1"
    echo "🔧 Using port from command line: $PORT"
elif [ -n "$PORT" ]; then
    echo "🔧 Using port from .env file: $PORT"
else
    PORT="$DEFAULT_PORT"
    echo "🔧 Using default port: $PORT"
fi

if [ -n "$2" ]; then
    CONTAINER_NAME="$2"
    echo "🔧 Using container name from command line: $CONTAINER_NAME"
elif [ -n "$CONTAINER_NAME" ]; then
    echo "🔧 Using container name from .env file: $CONTAINER_NAME"
else
    CONTAINER_NAME="$DEFAULT_CONTAINER_NAME"
    echo "🔧 Using default container name: $CONTAINER_NAME"
fi

if [ -n "$3" ]; then
    INTERNAL_PORT="$3"
    echo "🔧 Using internal port from command line: $INTERNAL_PORT"
elif [ -n "$INTERNAL_PORT" ]; then
    echo "🔧 Using internal port from .env file: $INTERNAL_PORT"
else
    INTERNAL_PORT="$DEFAULT_INTERNAL_PORT"
    echo "🔧 Using default internal port: $INTERNAL_PORT"
fi

# Colors for output (disable in non-interactive environments)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

echo -e "${BLUE}🚀 RPC Monitor Docker Runner${NC}"
echo -e "${BLUE}========================${NC}"
echo ""

# Display configuration summary
echo ""
echo -e "${BLUE}📋 Configuration Summary:${NC}"
echo -e "${BLUE}========================${NC}"

# Show configuration source
if [ -f ".env" ]; then
    echo -e "${YELLOW}📄 .env file found${NC}"
    if [ $# -gt 0 ]; then
        echo -e "${YELLOW}🔄 Command line arguments override .env values${NC}"
    fi
else
    echo -e "${YELLOW}📄 No .env file found${NC}"
    if [ $# -gt 0 ]; then
        echo -e "${YELLOW}🔄 Using command line arguments${NC}"
    else
        echo -e "${YELLOW}🔄 Using default values${NC}"
    fi
fi

# Display final configuration
echo ""
echo -e "${GREEN}Final Configuration:${NC}"
echo "  🌐 External Port: $PORT"
echo "  📦 Container Name: $CONTAINER_NAME"
echo "  🔧 Internal Port: $INTERNAL_PORT"
echo ""
echo -e "${YELLOW}⚠️  Port Mapping: External $PORT -> Internal $INTERNAL_PORT${NC}"
echo -e "${YELLOW}💡 Make sure your app runs on port $INTERNAL_PORT inside the container${NC}"
echo ""
echo -e "${YELLOW}💡 Note: RPC endpoints are configured via environment variables in .env file${NC}"
echo -e "${YELLOW}📖 See README.md for RPC endpoint configuration options${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if user has permission to run Docker
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Permission denied. You may need to run with sudo or add your user to the docker group.${NC}"
    if [ "$SERVER_MODE" = true ]; then
        echo -e "${YELLOW}💡 For server deployment, try: sudo ./run-docker.sh${NC}"
    else
        echo -e "${YELLOW}💡 Try: sudo usermod -aG docker \$USER && newgrp docker${NC}"
    fi
    exit 1
fi

# Check if port is available
if command -v netstat > /dev/null 2>&1; then
    if netstat -tuln | grep -q ":$PORT "; then
        echo -e "${YELLOW}⚠️  Port $PORT is already in use${NC}"
        if [ "$SERVER_MODE" = true ]; then
            echo -e "${YELLOW}💡 Consider using a different port or stopping the service using that port${NC}"
        fi
    fi
fi

# Check if image exists, build if not
if ! docker image inspect rpc-monitor > /dev/null 2>&1; then
    echo -e "${YELLOW}📦 Building Docker image...${NC}"
    if ! docker build -t rpc-monitor .; then
        echo -e "${RED}❌ Failed to build Docker image${NC}"
        exit 1
    fi
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
    if ! docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:$INTERNAL_PORT \
        --env-file .env \
        --restart unless-stopped \
        rpc-monitor; then
        echo -e "${RED}❌ Failed to start container${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found, using default configuration${NC}"
    if ! docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:$INTERNAL_PORT \
        --restart unless-stopped \
        rpc-monitor; then
        echo -e "${RED}❌ Failed to start container${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Container started successfully${NC}"
echo ""
if [ "$SERVER_MODE" = true ]; then
    echo -e "${BLUE}📊 Dashboard available at: http://$(hostname -I | awk '{print $1}'):$PORT${NC}"
    echo -e "${BLUE}📊 Or locally: http://localhost:$PORT${NC}"
else
    echo -e "${BLUE}📊 Dashboard available at: http://localhost:$PORT${NC}"
fi
echo -e "${BLUE}🔍 Container logs: docker logs -f $CONTAINER_NAME${NC}"
echo -e "${BLUE}🛑 Stop container: docker stop $CONTAINER_NAME${NC}"
echo ""

# Show logs for a few seconds (only in interactive mode)
if [ -t 1 ]; then
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    docker logs --tail 10 $CONTAINER_NAME
else
    echo -e "${YELLOW}📋 Container started. Use 'docker logs -f $CONTAINER_NAME' to view logs${NC}"
fi 