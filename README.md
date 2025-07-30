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

2. **Set RPC URLs** (required):

   ```bash
   export HYPERLIQUID_MAIN_URL="https://rpc.hyperliquid-testnet.xyz/evm"
   export LOCAL_NODE_URL="http://your-node:3001/evm"
   export ARCHIVE_NODE_URL="http://your-archive:8547"
   export LOCAL_NODE_SYSTEM_URL="http://your-node:8081/system"
   export ARCHIVE_NODE_SYSTEM_URL="http://your-archive:8081/system"
   ```

3. **Start the monitor**:

   ```bash
   npm start
   ```

4. **Access the dashboard**:
   Open your browser and navigate to `http://localhost:8080`

### Docker Deployment

#### Quick Start (Default Configuration)

```bash
# Run with default configuration
./quick-run.sh
```

#### Custom Configuration

```bash
# Run with custom RPC URLs and port
./run-docker.sh \
  "https://rpc.hyperliquid-testnet.xyz/evm" \
  "http://your-node:3001/evm" \
  "http://your-archive:8547" \
  "http://your-node:8081/system" \
  "http://your-archive:8081/system" \
  3000
```

#### Manual Docker Commands

```bash
# Build the image
docker build -t rpc-monitor .

# Run with custom RPC URLs
docker run -p 8080:8080 \
  -e HYPERLIQUID_MAIN_URL="https://rpc.hyperliquid-testnet.xyz/evm" \
  -e LOCAL_NODE_URL="http://your-node:3001/evm" \
  -e ARCHIVE_NODE_URL="http://your-archive:8547" \
  -e LOCAL_NODE_SYSTEM_URL="http://your-node:8081/system" \
  -e ARCHIVE_NODE_SYSTEM_URL="http://your-archive:8081/system" \
  rpc-monitor
```

## Configuration

### Environment Variables

| Variable                  | Default                           | Description                     |
| ------------------------- | --------------------------------- | ------------------------------- |
| `PORT`                    | `8080`                            | Port to run the web server on   |
| `CHAIN`                   | `Mainnet`                         | Chain name for dynamic naming   |
| `HYPERLIQUID_MAIN_URL`    | `https://rpc.hyperliquid.xyz/evm` | HyperLiquid main RPC URL        |
| `HYPERLIQUID_CHAIN_ID`    | `1`                               | HyperLiquid chain ID            |
| `HYPERLIQUID_TIMEOUT`     | `10000`                           | HyperLiquid RPC timeout         |
| `LOCAL_NODE_URL`          | `http://localhost:3001/evm`       | Local node RPC URL              |
| `LOCAL_NODE_CHAIN_ID`     | `1`                               | Local node chain ID             |
| `LOCAL_NODE_TIMEOUT`      | `5000`                            | Local node RPC timeout          |
| `ARCHIVE_NODE_URL`        | `http://localhost:8545`           | Archive node RPC URL            |
| `ARCHIVE_NODE_CHAIN_ID`   | `1`                               | Archive node chain ID           |
| `ARCHIVE_NODE_TIMEOUT`    | `10000`                           | Archive node RPC timeout        |
| `LOCAL_NODE_SYSTEM_URL`   | -                                 | Local node system monitor URL   |
| `ARCHIVE_NODE_SYSTEM_URL` | -                                 | Archive node system monitor URL |

### Adding Custom Endpoints

To add custom RPC endpoints, modify the `RPC_ENDPOINTS` object in `rpc_monitor.js`:

```javascript
const RPC_ENDPOINTS = {
  // ... existing endpoints ...
  my_custom_endpoint: {
    name: 'My Custom Endpoint',
    url: 'https://my-rpc-endpoint.com',
    expected_chain_id: '1',
    timeout: 10000,
  },
};
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

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t rpc-monitor .
docker run -p 8080:8080 rpc-monitor
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
