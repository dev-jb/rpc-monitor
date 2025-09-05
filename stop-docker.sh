#!/bin/bash

# RPC Monitor Docker Stop Script
# Usage: ./stop-docker.sh [CONTAINER_NAME] [OPTIONS]
# 
# This script stops and removes RPC Monitor Docker containers
# 
# Configuration Priority (highest to lowest):
# 1. Command line arguments
# 2. .env file variables
# 3. Default values
# 
# Examples:
# 
# Stop default container:
#   ./stop-docker.sh
# 
# Stop specific container:
#   ./stop-docker.sh my-monitor
# 
# Stop all RPC Monitor containers:
#   ./stop-docker.sh --all
# 
# Force stop (kill instead of graceful stop):
#   ./stop-docker.sh --force
# 
# Stop and remove images:
#   ./stop-docker.sh --cleanup

set -e

# Help function
show_help() {
    echo "RPC Monitor Docker Stop Script"
    echo ""
    echo "Usage: $0 [CONTAINER_NAME] [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  CONTAINER_NAME Docker container name (default: rpc-monitor)"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -a, --all      Stop all RPC Monitor containers"
    echo "  -f, --force    Force stop (kill instead of graceful stop)"
    echo "  -c, --cleanup  Stop containers and remove images"
    echo "  -l, --logs     Show logs before stopping"
    echo "  -v, --verbose  Show detailed output"
    echo ""
    echo "Examples:"
    echo "  $0                    # Stop default container"
    echo "  $0 my-monitor         # Stop specific container"
    echo "  $0 --all              # Stop all RPC Monitor containers"
    echo "  $0 --force            # Force stop default container"
    echo "  $0 --cleanup          # Stop and remove images"
    echo "  $0 -l my-monitor      # Show logs then stop container"
    echo ""
    echo "Configuration Priority:"
    echo "  1. Command line arguments"
    echo "  2. .env file variables"
    echo "  3. Default values"
    exit 0
}

# Default values
DEFAULT_CONTAINER_NAME="rpc-monitor"
CONTAINER_NAME=""
STOP_ALL=false
FORCE_STOP=false
CLEANUP=false
SHOW_LOGS=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -a|--all)
            STOP_ALL=true
            shift
            ;;
        -f|--force)
            FORCE_STOP=true
            shift
            ;;
        -c|--cleanup)
            CLEANUP=true
            shift
            ;;
        -l|--logs)
            SHOW_LOGS=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -*)
            echo "Unknown option $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
        *)
            if [ -z "$CONTAINER_NAME" ]; then
                CONTAINER_NAME="$1"
            else
                echo "Multiple container names specified. Use --all to stop multiple containers."
                exit 1
            fi
            shift
            ;;
    esac
done

# Load values from .env file if it exists
if [ -f ".env" ]; then
    if [ "$VERBOSE" = true ]; then
        echo "📄 Loading configuration from .env file..."
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
                if [ "$VERBOSE" = true ]; then
                    echo "   ✅ Loaded: $line"
                fi
            fi
        fi
    done < .env
    set +a
fi

# Set container name if not provided
if [ -z "$CONTAINER_NAME" ]; then
    if [ -n "$CONTAINER_NAME" ]; then
        CONTAINER_NAME="$CONTAINER_NAME"
        if [ "$VERBOSE" = true ]; then
            echo "🔧 Using container name from .env file: $CONTAINER_NAME"
        fi
    else
        CONTAINER_NAME="$DEFAULT_CONTAINER_NAME"
        if [ "$VERBOSE" = true ]; then
            echo "🔧 Using default container name: $CONTAINER_NAME"
        fi
    fi
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

echo -e "${BLUE}🛑 RPC Monitor Docker Stopper${NC}"
echo -e "${BLUE}============================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Function to stop a single container
stop_container() {
    local container_name="$1"
    
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}🔍 Checking container: $container_name${NC}"
    fi
    
    # Check if container exists
    if ! docker ps -aq -f name=$container_name > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Container '$container_name' not found${NC}"
        return 1
    fi
    
    # Check if container is running
    if docker ps -q -f name=$container_name > /dev/null 2>&1; then
        echo -e "${YELLOW}🛑 Stopping container: $container_name${NC}"
        
        # Show logs if requested
        if [ "$SHOW_LOGS" = true ]; then
            echo -e "${BLUE}📋 Recent logs for $container_name:${NC}"
            docker logs --tail 20 $container_name
            echo ""
        fi
        
        # Stop container
        if [ "$FORCE_STOP" = true ]; then
            echo -e "${YELLOW}⚡ Force stopping container...${NC}"
            docker kill $container_name > /dev/null 2>&1 || true
        else
            echo -e "${YELLOW}🔄 Gracefully stopping container...${NC}"
            docker stop $container_name > /dev/null 2>&1 || true
        fi
        
        echo -e "${GREEN}✅ Container stopped: $container_name${NC}"
    else
        echo -e "${YELLOW}⚠️  Container '$container_name' is not running${NC}"
    fi
    
    # Remove container
    echo -e "${YELLOW}🧹 Removing container: $container_name${NC}"
    if docker rm $container_name > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Container removed: $container_name${NC}"
    else
        echo -e "${YELLOW}⚠️  Container '$container_name' was already removed${NC}"
    fi
}

# Function to find all RPC Monitor containers
find_rpc_containers() {
    docker ps -aq --filter "name=rpc-monitor" --format "{{.Names}}"
}

# Main execution
if [ "$STOP_ALL" = true ]; then
    echo -e "${BLUE}🔍 Finding all RPC Monitor containers...${NC}"
    
    containers=$(find_rpc_containers)
    if [ -z "$containers" ]; then
        echo -e "${YELLOW}⚠️  No RPC Monitor containers found${NC}"
        exit 0
    fi
    
    echo -e "${GREEN}Found containers:${NC}"
    echo "$containers" | sed 's/^/  - /'
    echo ""
    
    # Stop each container
    while IFS= read -r container; do
        if [ -n "$container" ]; then
            stop_container "$container"
            echo ""
        fi
    done <<< "$containers"
    
    echo -e "${GREEN}✅ All RPC Monitor containers stopped${NC}"
else
    # Stop single container
    stop_container "$CONTAINER_NAME"
fi

# Cleanup images if requested
if [ "$CLEANUP" = true ]; then
    echo -e "${YELLOW}🧹 Cleaning up Docker images...${NC}"
    
    # Remove RPC Monitor image
    if docker images -q rpc-monitor > /dev/null 2>&1; then
        echo -e "${YELLOW}🗑️  Removing rpc-monitor image...${NC}"
        if docker rmi rpc-monitor > /dev/null 2>&1; then
            echo -e "${GREEN}✅ RPC Monitor image removed${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not remove RPC Monitor image (may be in use)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  RPC Monitor image not found${NC}"
    fi
    
    # Remove dangling images
    echo -e "${YELLOW}🧹 Removing dangling images...${NC}"
    if docker image prune -f > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Dangling images removed${NC}"
    else
        echo -e "${YELLOW}⚠️  No dangling images to remove${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Stop operation completed successfully${NC}"
echo ""
echo -e "${BLUE}📋 Useful commands:${NC}"
echo -e "${GREEN}  List containers:${NC} docker ps -a"
echo -e "${GREEN}  List images:${NC} docker images"
echo -e "${GREEN}  Start container:${NC} ./run-docker.sh"
echo -e "${GREEN}  View logs:${NC} docker logs -f $CONTAINER_NAME"
