# RPC Endpoint Monitor

A standalone web application for monitoring multiple RPC endpoints with comprehensive health checks and real-time status updates.

## Features

- **Multi-Endpoint Monitoring**: Monitor multiple RPC endpoints simultaneously
- **Comprehensive Health Checks**: Test block numbers, chain IDs, gas prices, peer counts, and sync status
- **Real-time Dashboard**: Beautiful web interface with auto-refresh
- **Health Scoring**: Automatic health scoring based on successful tests
- **RESTful API**: JSON API endpoints for integration with other tools
- **Configurable**: Easy configuration via environment variables

## Quick Start

### Local Development

1. **Install dependencies**:

   ```bash
   cd rpc-monitor
   npm install
   ```

2. **Configure RPC endpoints** (optional):

   Create a `.env` file with your RPC endpoints:

   ```bash
   # Main RPC endpoints
   RPC_1_NAME="Hyperliquid Testnet"
   RPC_1_URL="https://rpc.hyperliquid-testnet.xyz/evm"
   RPC_1_CHAIN_ID="998"
   RPC_1_IS_REFERENCE="true"

   RPC_2_NAME="Local HL Node"
   RPC_2_URL="http://your-node:3001/evm"
   RPC_2_CHAIN_ID="998"
   RPC_2_SYSTEM_URL="http://your-node:8081/system"

   # External RPC endpoints
   EXTERNAL_RPC_1_NAME="Proxy RPC"
   EXTERNAL_RPC_1_URL="http://your-proxy-server:9090"
   EXTERNAL_RPC_1_WS_URL="ws://your-proxy-server:9091"
   EXTERNAL_RPC_1_DESC="Internal proxy RPC endpoint"
   ```

3. **Start the monitor**:

   ```bash
   npm start
   ```

4. **Access the dashboard**:
   Open your browser and navigate to `http://localhost:8080`

### Docker Deployment

#### Quick Start

```bash
# Run with default configuration
./run-docker.sh

# Run with custom port
./run-docker.sh 3000

# Run with custom port and container name
./run-docker.sh 3000 my-rpc-monitor
```

#### Manual Docker Commands

```bash
# Build the image
docker build -t rpc-monitor .

# Run with .env file
docker run -p 8080:8080 --env-file .env rpc-monitor

# Run with docker-compose
docker-compose up -d
```

## Configuration

### Environment Variables

#### Main RPC Endpoints (Detailed Monitoring)

You can configure up to 20 main RPC endpoints for detailed monitoring with block differences, system resources, etc.

| Variable Pattern       | Description                          | Example                                             |
| ---------------------- | ------------------------------------ | --------------------------------------------------- |
| `RPC_{N}_NAME`         | Name of the RPC endpoint             | `RPC_1_NAME=Hyperliquid Testnet`                    |
| `RPC_{N}_URL`          | RPC endpoint URL                     | `RPC_1_URL=https://rpc.hyperliquid-testnet.xyz/evm` |
| `RPC_{N}_CHAIN_ID`     | Expected chain ID (optional)         | `RPC_1_CHAIN_ID=998`                                |
| `RPC_{N}_TIMEOUT`      | Request timeout in ms (optional)     | `RPC_1_TIMEOUT=10000`                               |
| `RPC_{N}_COMPARE_WITH` | Key of reference endpoint (optional) | `RPC_1_COMPARE_WITH=rpc_2`                          |
| `RPC_{N}_SYSTEM_URL`   | System monitor URL (optional)        | `RPC_1_SYSTEM_URL=http://localhost:8081/system`     |
| `RPC_{N}_KEY`          | Unique key for endpoint (optional)   | `RPC_1_KEY=hyperliquid_main`                        |
| `RPC_{N}_IS_REFERENCE` | Set as reference node (optional)     | `RPC_1_IS_REFERENCE=true`                           |
| `RPC_{N}_API_KEY`      | API key (optional)                   | `RPC_1_API_KEY=your-api-key-here`                   |
| `RPC_{N}_DISPLAY_URL`  | URL to show in frontend (optional)   | `RPC_1_DISPLAY_URL=https://rpc.hyperliquid.xyz/evm` |

**Example Configuration**:

```bash
# Main RPC 1 (Reference Node)
RPC_1_NAME=Hyperliquid Testnet
RPC_1_URL=https://rpc.hyperliquid-testnet.xyz/evm
RPC_1_CHAIN_ID=998
RPC_1_KEY=hyperliquid_main
RPC_1_IS_REFERENCE=true

# Main RPC 2 (Local Node)
RPC_2_NAME=Local HL Node
RPC_2_URL=http://your-node:3001/evm
RPC_2_CHAIN_ID=998
RPC_2_COMPARE_WITH=hyperliquid_main
RPC_2_SYSTEM_URL=http://your-node:8081/system
RPC_2_KEY=local_node

# Main RPC 3 (Archive Node)
RPC_3_NAME=Archive Node
RPC_3_URL=http://your-archive-node:8545
RPC_3_CHAIN_ID=998
RPC_3_COMPARE_WITH=hyperliquid_main
RPC_3_SYSTEM_URL=http://your-archive-node:8081/system
RPC_3_KEY=archive_node

# Main RPC 4 (Alchemy with API key - hidden from frontend)
RPC_4_NAME=Alchemy
RPC_4_URL=https://hyperliquid-mainnet.g.alchemy.com/v2
RPC_4_API_KEY=your-alchemy-api-key
RPC_4_DISPLAY_URL=https://hyperliquid-mainnet.g.alchemy.com/v2
RPC_4_CHAIN_ID=1
RPC_4_KEY=alchemy
```

### External RPC Endpoints (Working RPCs Section)

The "Working RPCs" section displays external RPC endpoints that are tested for basic connectivity. These are configured via environment variables:

| Variable Pattern              | Description                          | Example                                             |
| ----------------------------- | ------------------------------------ | --------------------------------------------------- |
| `EXTERNAL_RPC_{N}_NAME`       | Name of the external RPC             | `EXTERNAL_RPC_1_NAME=Proxy RPC 1`                   |
| `EXTERNAL_RPC_{N}_URL`        | RPC endpoint URL                     | `EXTERNAL_RPC_1_URL=http://your-proxy-server:9090`  |
| `EXTERNAL_RPC_{N}_WS_URL`     | WebSocket endpoint URL (optional)    | `EXTERNAL_RPC_1_WS_URL=ws://your-proxy-server:9091` |
| `EXTERNAL_RPC_{N}_DESC`       | Description (optional)               | `EXTERNAL_RPC_1_DESC=Internal proxy RPC endpoint`   |
| `EXTERNAL_RPC_{N}_API_KEY`    | API key (optional)                   | `EXTERNAL_RPC_1_API_KEY=your-api-key-here`          |
| `EXTERNAL_RPC_{N}_SHOW_IN_UI` | Show in UI (optional, default: true) | `EXTERNAL_RPC_1_SHOW_IN_UI=false`                   |

**Example Configuration**:

```bash
# External RPC 1
EXTERNAL_RPC_1_NAME=Proxy RPC 1
EXTERNAL_RPC_1_URL=http://your-proxy-server:9090
EXTERNAL_RPC_1_WS_URL=ws://your-proxy-server:9091
EXTERNAL_RPC_1_DESC=Internal proxy RPC endpoint

# External RPC 2
EXTERNAL_RPC_2_NAME=HyperLiquid Testnet
EXTERNAL_RPC_2_URL=https://rpc.hyperliquid-testnet.xyz/evm
EXTERNAL_RPC_2_WS_URL=wss://rpc.hyperliquid-testnet.xyz/evm
EXTERNAL_RPC_2_DESC=Official HyperLiquid testnet RPC

# External RPC 3 with API key (hidden from UI)
EXTERNAL_RPC_3_NAME=Alchemy
EXTERNAL_RPC_3_URL=https://hyperliquid-mainnet.g.alchemy.com/v2
EXTERNAL_RPC_3_API_KEY=your-alchemy-api-key
EXTERNAL_RPC_3_SHOW_IN_UI=false
EXTERNAL_RPC_3_DESC=Alchemy RPC with API key (hidden from UI)
```

**Notes**:

- You can configure up to 10 external RPC endpoints (EXTERNAL_RPC_1 through EXTERNAL_RPC_10)
- If `EXTERNAL_RPC_{N}_WS_URL` is not provided, it will be auto-generated from the RPC URL
- If `EXTERNAL_RPC_{N}_API_KEY` is provided, it will be automatically appended to both RPC and WebSocket URLs as `?api_key=your-key` or `&api_key=your-key`
- If `EXTERNAL_RPC_{N}_SHOW_IN_UI` is set to `false`, the endpoint will be tested but not displayed in the dashboard UI (useful for hiding endpoints with API keys)
- The dashboard will show the original URLs without API keys for security
- If `EXTERNAL_RPC_{N}_DESC` is not provided, a default description will be used
- If no external RPCs are configured, default endpoints will be used

**Main RPC Endpoints Notes**:

- You can configure up to 20 main RPC endpoints (RPC_1 through RPC_20)
- If `RPC_{N}_KEY` is not provided, it will default to `rpc_{N}`
- If `RPC_{N}_COMPARE_WITH` is set, block differences will be calculated against that reference endpoint
- If `RPC_{N}_IS_REFERENCE` is set to `true`, this endpoint will be used as the reference for block comparisons
- If `RPC_{N}_SYSTEM_URL` is provided, system resources (CPU, RAM, disk) will be monitored
- If `RPC_{N}_API_KEY` is provided, it will be automatically appended to the RPC URL as `?api_key=your-key` or `&api_key=your-key`
- If `RPC_{N}_DISPLAY_URL` is provided, this URL will be shown in the frontend instead of the actual URL (useful for hiding API keys)
- If no main RPC endpoints are configured via `RPC_{N}_*` pattern, the system falls back to legacy environment variables

### Adding Custom Endpoints

To add custom RPC endpoints, use the environment variables described above. You can configure up to 20 main RPC endpoints and 10 external RPC endpoints without modifying the code.

For example, to add a new main RPC endpoint:

```bash
# Add a new main RPC endpoint
RPC_4_NAME=My Custom Endpoint
RPC_4_URL=https://my-rpc-endpoint.com
RPC_4_CHAIN_ID=1
RPC_4_TIMEOUT=10000
RPC_4_KEY=my_custom_endpoint
```

Or to add a new external RPC endpoint:

```bash
# Add a new external RPC endpoint
EXTERNAL_RPC_4_NAME=My External RPC
EXTERNAL_RPC_4_URL=https://my-external-rpc.com
EXTERNAL_RPC_4_DESC=My custom external RPC endpoint
```

## API Endpoints

### GET `/api/status`

Returns comprehensive status of all monitored RPC endpoints.

**Response**:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "endpoints": {
    "hyperliquid_mainnet": {
      "name": "HyperLiquid Mainnet",
      "url": "https://rpc.hyperliquid.xyz",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "tests": {
        "blockNumber": { "success": true, "block": 12345678 },
        "chainId": { "success": true, "chainId": 1 },
        "gasPrice": { "success": true, "gasPriceGwei": "20.5" },
        "peerCount": { "success": true, "peerCount": 15 },
        "syncStatus": { "success": true, "syncing": false }
      },
      "health": {
        "score": 100,
        "successfulTests": 5,
        "totalTests": 5
      }
    }
  },
  "summary": {
    "total": 4,
    "healthy": 3,
    "partiallyHealthy": 1,
    "unhealthy": 0,
    "overallHealth": 87.5
  }
}
```

### GET `/api/endpoints`

Returns the current configuration of all endpoints.

### GET `/api/test/:endpointKey`

Test a specific endpoint by key.

### GET `/health`

Health check endpoint for the monitor itself.

### GET `/config`

Returns the current configuration.

## Health Checks

The monitor performs the following tests on each RPC endpoint:

1. **Block Number** (`eth_blockNumber`): Gets the latest block number
2. **Chain ID** (`eth_chainId`): Verifies the chain ID
3. **Gas Price** (`eth_gasPrice`): Gets current gas price in Gwei
4. **Sync Status** (`eth_syncing`): Checks if the node is syncing

## Per-Node System Monitoring

The RPC monitor can fetch system resources (RAM, CPU, Disk) for each individual node:

### Setup Node System Monitors

1. **Deploy system monitors** on each node server:

   ```bash
   # Copy system_monitor.js to each node server
   node system_monitor.js
   ```

2. **Configure the RPC monitor** to use node-specific system monitors:

   ```bash
   # In your .env file
   LOCAL_NODE_SYSTEM_URL=http://your-local-node-ip:8081/system
   ARCHIVE_NODE_SYSTEM_URL=http://your-archive-node-ip:8081/system
   ```

3. **Each system monitor provides**:
   - RAM usage (total, used, available, percentage)
   - Disk usage (total, used, available, percentage)
   - CPU usage (percentage, cores, model)

### Dashboard Display

System resources are now displayed per-node in the endpoint cards:

- **Local HL Node**: Shows RAM, Disk, CPU usage for the local node
- **Archive Node**: Shows RAM, Disk, CPU usage for the archive node
- **HyperLiquid Mainnet**: No system monitoring (reference node)

### Fallback Behavior

If a node's system monitor is unavailable:

- System resources won't be displayed for that node
- RPC monitoring continues normally
- No interruption to other functionality

## Health Scoring

- **80-100%**: Healthy (Green)
- **50-79%**: Partially Healthy (Yellow)
- **0-49%**: Unhealthy (Red)

## Docker Support

### Quick Start

Use the provided `run-docker.sh` script:

```bash
# Make the script executable
chmod +x run-docker.sh

# Run with default settings (port 8080)
./run-docker.sh

# Run with custom port
./run-docker.sh 3000

# Run with custom port and container name
./run-docker.sh 3000 my-rpc-monitor
```

### Manual Docker Commands

Build the image:

```bash
docker build -t rpc-monitor .
```

Run with environment file:

```bash
# With .env file
docker run -d --name rpc-monitor -p 8080:8080 --env-file .env rpc-monitor

# Without .env file (uses defaults)
docker run -d --name rpc-monitor -p 8080:8080 rpc-monitor
```

### Docker Compose

For easier deployment, use Docker Compose:

```bash
# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Docker Configuration

The Docker container will:

- Use the `.env` file if present (passed via `--env-file`)
- Fall back to default configuration if no `.env` file is provided
- Expose the dashboard on the specified port
- Include health checks for container monitoring

## Server Deployment

### Quick Server Setup

1. **Upload files to server:**

   ```bash
   # Copy all files to your server
   scp -r . user@your-server:/path/to/rpc-monitor/
   ```

2. **SSH into server:**

   ```bash
   ssh user@your-server
   cd /path/to/rpc-monitor
   ```

3. **Create your .env file:**

   ```bash
   # Create .env file with your configuration
   nano .env
   ```

4. **Deploy using Docker Compose (Recommended):**

   ```bash
   # Make scripts executable
   chmod +x run-docker.sh

   # Start with docker-compose
   docker-compose up -d

   # Check status
   docker-compose ps

   # View logs
   docker-compose logs -f
   ```

5. **Or deploy using the run script:**

   ```bash
   # Run with default port 8080
   ./run-docker.sh

   # Run with custom port
   ./run-docker.sh 3000
   ```

### Server Configuration Example

Create a `.env` file on your server:

```bash
# Main RPC Endpoints
RPC_1_NAME=Hyperliquid Testnet
RPC_1_URL=https://rpc.hyperliquid-testnet.xyz/evm
RPC_1_CHAIN_ID=998
RPC_1_IS_REFERENCE=true

RPC_2_NAME=Local HL Node
RPC_2_URL=http://your-server:3001/evm
RPC_2_CHAIN_ID=998
RPC_2_COMPARE_WITH=rpc_1

# External RPC Endpoints
EXTERNAL_RPC_1_NAME=Proxy RPC 1
EXTERNAL_RPC_1_URL=http://your-server:9090
EXTERNAL_RPC_1_WS_URL=ws://your-server:9091
EXTERNAL_RPC_1_DESC=Internal proxy RPC endpoint
EXTERNAL_RPC_1_SHOW_IN_UI=true

# Port configuration
PORT=8080
```

### Server Management Commands

```bash
# Check container status
docker ps

# View logs
docker logs -f rpc-monitor

# Restart container
docker restart rpc-monitor

# Stop container
docker stop rpc-monitor

# Update and restart
docker-compose down
docker-compose up -d --build
```

## Development

### Running in Development Mode

```bash
npm run dev
```

### Adding New Tests

To add new RPC tests, create a new function in `rpc_monitor.js` and add it to the `testRpcEndpoint` function:

```javascript
// Add new test function
async function getNewTest(rpcUrl, rpcName) {
  const result = await makeRpcCall(rpcUrl, 'your_rpc_method');
  // ... process result
  return { success: true, data: result };
}

// Add to testRpcEndpoint function
const newTestResult = await getNewTest(endpoint.url, endpoint.name);
results.tests.newTest = newTestResult;
```

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase the `timeout` value in endpoint configuration
2. **Connection Refused**: Verify the RPC URL is correct and accessible
3. **CORS Issues**: The monitor runs on the same domain, so CORS shouldn't be an issue

### Debug Endpoints

- `/config` - View current configuration
- `/health` - Check if the monitor is running
- `/api/endpoints` - View all configured endpoints

## License

MIT License
