require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 8080;

const execAsync = promisify(exec);

// Function to get dynamic RPC endpoints from environment variables
function getRpcEndpoints() {
  const endpoints = {};

  // Check for up to 20 main RPC endpoints
  for (let i = 1; i <= 20; i++) {
    const name = process.env[`RPC_${i}_NAME`];
    const url = process.env[`RPC_${i}_URL`];
    const chainId = process.env[`RPC_${i}_CHAIN_ID`];
    const timeout = process.env[`RPC_${i}_TIMEOUT`];
    const compareWith = process.env[`RPC_${i}_COMPARE_WITH`];
    const systemMonitorUrl = process.env[`RPC_${i}_SYSTEM_URL`];
    const key = process.env[`RPC_${i}_KEY`] || `rpc_${i}`;
    const isReference = process.env[`RPC_${i}_IS_REFERENCE`] === 'true';

    if (name && url) {
      endpoints[key] = {
        name: name,
        url: url,
        expected_chain_id: chainId || '998',
        timeout: parseInt(timeout) || 10000,
        compare_with: compareWith || null,
        system_monitor_url: systemMonitorUrl || null,
        is_reference: isReference,
      };
    }
  }

  return endpoints;
}

// Get RPC endpoints configuration
const RPC_ENDPOINTS = getRpcEndpoints();

// External RPC endpoints for basic connectivity testing
// These are separate from the monitored nodes and are just tested for basic RPC functionality
// Configuration via environment variables:
// EXTERNAL_RPC_1_NAME, EXTERNAL_RPC_1_URL, EXTERNAL_RPC_1_WS_URL, EXTERNAL_RPC_1_DESC
// EXTERNAL_RPC_2_NAME, EXTERNAL_RPC_2_URL, EXTERNAL_RPC_2_WS_URL, EXTERNAL_RPC_2_DESC
// etc.
function getExternalRpcEndpoints() {
  const endpoints = [];

  // Check for up to 10 external RPC endpoints
  for (let i = 1; i <= 10; i++) {
    const name = process.env[`EXTERNAL_RPC_${i}_NAME`];
    const rpcUrl = process.env[`EXTERNAL_RPC_${i}_URL`];
    const wsUrl = process.env[`EXTERNAL_RPC_${i}_WS_URL`];
    const description = process.env[`EXTERNAL_RPC_${i}_DESC`];
    const apiKey = process.env[`EXTERNAL_RPC_${i}_API_KEY`];
    const showInUI = process.env[`EXTERNAL_RPC_${i}_SHOW_IN_UI`] !== 'false'; // Default to true

    if (name && rpcUrl) {
      // Add API key to URLs if provided
      let finalRpcUrl = rpcUrl;
      let finalWsUrl =
        wsUrl ||
        rpcUrl.replace('http://', 'ws://').replace('https://', 'wss://');

      if (apiKey) {
        // Add API key to RPC URL
        const separator = finalRpcUrl.includes('?') ? '&' : '?';
        finalRpcUrl = `${finalRpcUrl}/${apiKey}`;

        // Add API key to WebSocket URL
        const wsSeparator = finalWsUrl.includes('?') ? '&' : '?';
        finalWsUrl = `${finalWsUrl}/${apiKey}`;
      }

      endpoints.push({
        name: name,
        rpcUrl: finalRpcUrl,
        wsUrl: finalWsUrl,
        description: description || `External RPC endpoint ${i}`,
        showInUI: showInUI,
        // For display purposes, show original URL without API key
        displayRpcUrl: rpcUrl,
        displayWsUrl:
          wsUrl ||
          rpcUrl.replace('http://', 'ws://').replace('https://', 'wss://'),
      });
    }
  }

  // If no external RPCs configured via env, use defaults
  if (endpoints.length === 0) {
    return [
      {
        name: 'Proxy RPC 1',
        rpcUrl: 'http://18.142.83.122:9090',
        wsUrl: 'ws://18.142.83.122:9091',
        description: 'Internal proxy RPC endpoint',
        showInUI: true,
        displayRpcUrl: 'http://18.142.83.122:9090',
        displayWsUrl: 'ws://18.142.83.122:9091',
      },
      {
        name: 'HyperLiquid Testnet',
        rpcUrl: 'https://rpc.hyperliquid-testnet.xyz/evm',
        wsUrl: 'wss://rpc.hyperliquid-testnet.xyz/evm',
        description: 'Official HyperLiquid testnet RPC',
        showInUI: true,
        displayRpcUrl: 'https://rpc.hyperliquid-testnet.xyz/evm',
        displayWsUrl: 'wss://rpc.hyperliquid-testnet.xyz/evm',
      },
    ];
  }

  return endpoints;
}

const EXTERNAL_RPC_ENDPOINTS = getExternalRpcEndpoints();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to test WebSocket connectivity
async function testWebSocket(wsUrl, timeout = 5000) {
  return new Promise((resolve) => {
    console.log(`🔌 Testing WebSocket: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.terminate();
        resolve({
          success: false,
          error: 'WebSocket connection timeout',
        });
      }
    }, timeout);

    ws.on('open', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        ws.close();
        resolve({
          success: true,
          message: 'WebSocket connection successful',
        });
      }
    });

    ws.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: error.message,
        });
      }
    });

    ws.on('close', () => {
      // Connection closed normally
    });
  });
}

// Helper function to test external RPC endpoints (basic connectivity)
async function testExternalRpc(rpcUrl, timeout = 5000) {
  try {
    console.log(`🔗 Testing external RPC: ${rpcUrl}`);

    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: timeout,
      }
    );

    if (response.data && response.data.result !== undefined) {
      return {
        success: true,
        blockNumber: parseInt(response.data.result, 16),
        responseTime: response.headers['x-response-time'] || 'N/A',
      };
    }

    return {
      success: false,
      error: 'Invalid response format',
    };
  } catch (error) {
    console.log(`💥 External RPC test error:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Helper function to make RPC calls
async function makeRpcCall(rpcUrl, method, params = [], timeout = 10000) {
  try {
    console.log(`🔗 Making RPC call to ${rpcUrl}: ${method}`);

    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: 1,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: timeout,
      }
    );

    console.log(`📡 RPC response:`, response.data);

    if (response.data && response.data.result !== undefined) {
      return {
        success: true,
        result: response.data.result,
        error: response.data.error,
      };
    }

    return {
      success: false,
      error: 'Invalid response format',
    };
  } catch (error) {
    console.log(`💥 RPC call error:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Get block number from RPC
async function getBlockNumber(rpcUrl, rpcName) {
  const result = await makeRpcCall(rpcUrl, 'eth_blockNumber');

  if (result.success) {
    const blockHex = result.result;
    const blockDecimal = parseInt(blockHex, 16);
    console.log(`✅ ${rpcName} block: ${blockDecimal} (${blockHex})`);
    return {
      success: true,
      block: blockDecimal,
      hex: blockHex,
    };
  }

  console.log(`❌ ${rpcName} failed: ${result.error}`);
  return { success: false, error: result.error };
}

// Get chain ID from RPC
async function getChainId(rpcUrl, rpcName) {
  const result = await makeRpcCall(rpcUrl, 'eth_chainId');

  if (result.success) {
    const chainIdHex = result.result;
    const chainIdDecimal = parseInt(chainIdHex, 16);
    console.log(`✅ ${rpcName} chain ID: ${chainIdDecimal} (${chainIdHex})`);
    return {
      success: true,
      chainId: chainIdDecimal,
      hex: chainIdHex,
    };
  }

  console.log(`❌ ${rpcName} chain ID failed: ${result.error}`);
  return { success: false, error: result.error };
}

// Get gas price from RPC
async function getGasPrice(rpcUrl, rpcName) {
  const result = await makeRpcCall(rpcUrl, 'eth_gasPrice');

  if (result.success) {
    const gasPriceHex = result.result;
    const gasPriceDecimal = parseInt(gasPriceHex, 16);
    const gasPriceGwei = (gasPriceDecimal / 1e9).toFixed(2);
    console.log(`✅ ${rpcName} gas price: ${gasPriceGwei} Gwei`);
    return {
      success: true,
      gasPrice: gasPriceDecimal,
      gasPriceGwei: gasPriceGwei,
      hex: gasPriceHex,
    };
  }

  console.log(`❌ ${rpcName} gas price failed: ${result.error}`);
  return { success: false, error: result.error };
}

// Get sync status from RPC
async function getSyncStatus(rpcUrl, rpcName) {
  const result = await makeRpcCall(rpcUrl, 'eth_syncing');

  if (result.success) {
    const syncData = result.result;
    if (syncData === false) {
      console.log(`✅ ${rpcName} is not syncing`);
      return {
        success: true,
        syncing: false,
        data: null,
      };
    } else {
      console.log(`⏳ ${rpcName} is syncing:`, syncData);
      return {
        success: true,
        syncing: true,
        data: syncData,
      };
    }
  }

  console.log(`❌ ${rpcName} sync status failed: ${result.error}`);
  return { success: false, error: result.error };
}

// Get system resources for a specific node
async function getNodeSystemResources(nodeName, systemUrl) {
  if (!systemUrl) {
    console.log(`⚠️ No system monitor URL configured for ${nodeName}`);
    return null;
  }

  try {
    console.log(
      `🌐 Getting system resources for ${nodeName} from: ${systemUrl}`
    );

    const response = await axios.get(systemUrl, {
      timeout: 10000,
    });

    if (response.data && response.data.success) {
      console.log(`✅ System resources for ${nodeName} retrieved successfully`);
      return {
        ram: response.data.ram,
        disk: response.data.disk,
        cpu: response.data.cpu,
      };
    } else {
      console.log(`❌ System resources for ${nodeName} failed`);
      return null;
    }
  } catch (error) {
    console.log(`💥 System resources for ${nodeName} error: ${error.message}`);
    return null;
  }
}

// Get local system RAM usage
async function getLocalRamUsage() {
  try {
    console.log('🧠 Getting local RAM usage...');

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percentage = ((usedMem / totalMem) * 100).toFixed(1);

    const ramInfo = {
      success: true,
      total: `${(totalMem / 1024 / 1024 / 1024).toFixed(1)}GB`,
      used: `${(usedMem / 1024 / 1024 / 1024).toFixed(1)}GB`,
      available: `${(freeMem / 1024 / 1024 / 1024).toFixed(1)}GB`,
      percentage: percentage,
    };

    console.log(`✅ Local RAM usage: ${percentage}%`);
    return ramInfo;
  } catch (error) {
    console.log(`💥 Local RAM usage error:`, error);
    return { success: false, error: error.message };
  }
}

// Get local disk usage
async function getLocalDiskUsage() {
  try {
    console.log('💾 Getting local disk usage...');

    // Get disk usage for the current directory
    const result = await execAsync('df -h .');
    const lines = result.stdout.trim().split('\n');

    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);

      if (parts.length >= 5) {
        const diskInfo = {
          success: true,
          total: parts[1],
          used: parts[2],
          available: parts[3],
          usage_percent: parts[4].replace('%', ''),
        };

        console.log(`✅ Local disk usage: ${diskInfo.usage_percent}%`);
        return diskInfo;
      }
    }

    console.log(`❌ Could not parse local disk usage`);
    return { success: false, error: 'Could not parse disk usage' };
  } catch (error) {
    console.log(`💥 Local disk usage error:`, error);
    return { success: false, error: error.message };
  }
}

// Get local CPU usage
async function getLocalCpuUsage() {
  try {
    console.log('⚡ Getting local CPU usage...');

    // Get CPU usage using top command
    const result = await execAsync(
      "top -l 1 | grep 'CPU usage' | awk '{print $3}' | sed 's/%//'"
    );
    const cpuUsage = parseFloat(result.stdout.trim());

    if (!isNaN(cpuUsage)) {
      const cpuInfo = {
        success: true,
        usage: cpuUsage.toFixed(1),
        cores: os.cpus().length,
        model: os.cpus()[0].model,
      };

      console.log(`✅ Local CPU usage: ${cpuInfo.usage}%`);
      return cpuInfo;
    }

    // Fallback to os.loadavg() if top command fails
    const loadAvg = os.loadavg();
    const cpuInfo = {
      success: true,
      usage: 'N/A (using load average)',
      loadAverage: {
        '1min': loadAvg[0].toFixed(2),
        '5min': loadAvg[1].toFixed(2),
        '15min': loadAvg[2].toFixed(2),
      },
      cores: os.cpus().length,
      model: os.cpus()[0].model,
    };

    console.log(`✅ Local CPU load average: ${loadAvg[0].toFixed(2)} (1min)`);
    return cpuInfo;
  } catch (error) {
    console.log(`💥 Local CPU usage error:`, error);
    return { success: false, error: error.message };
  }
}

// Get all local system resources
async function getLocalSystemResources() {
  const ramUsage = await getLocalRamUsage();
  const diskUsage = await getLocalDiskUsage();
  const cpuUsage = await getLocalCpuUsage();

  return {
    ram: ramUsage,
    disk: diskUsage,
    cpu: cpuUsage,
  };
}

// Get block numbers for all endpoints simultaneously
async function getAllBlockNumbers() {
  console.log('🔗 Getting block numbers for all endpoints simultaneously...');

  const blockPromises = [];
  const endpointKeys = [];

  for (const [key, endpoint] of Object.entries(RPC_ENDPOINTS)) {
    blockPromises.push(getBlockNumber(endpoint.url, endpoint.name));
    endpointKeys.push(key);
  }

  try {
    const blockResults = await Promise.all(blockPromises);
    const blockData = {};

    for (let i = 0; i < endpointKeys.length; i++) {
      blockData[endpointKeys[i]] = blockResults[i];
    }

    console.log('✅ All block numbers retrieved simultaneously');
    return blockData;
  } catch (error) {
    console.log('💥 Error getting block numbers:', error);
    return {};
  }
}

// Test RPC endpoint comprehensively
async function testRpcEndpoint(
  endpointKey,
  endpoint,
  allResults = {},
  blockNumbers = {}
) {
  console.log(`🧪 Testing RPC endpoint: ${endpoint.name} (${endpoint.url})`);

  const results = {
    name: endpoint.name,
    url: endpoint.url,
    timestamp: new Date().toISOString(),
    tests: {},
    blockDifference: null,
    system: null,
  };

  // Use pre-fetched block number if available, otherwise fetch it
  if (blockNumbers[endpointKey]) {
    results.tests.blockNumber = blockNumbers[endpointKey];
  } else {
    const blockResult = await getBlockNumber(endpoint.url, endpoint.name);
    results.tests.blockNumber = blockResult;
  }

  // Run all RPC tests concurrently for this endpoint
  const rpcTests = [
    getChainId(endpoint.url, endpoint.name),
    getGasPrice(endpoint.url, endpoint.name),
    getSyncStatus(endpoint.url, endpoint.name),
  ];

  // Add system resources test if configured
  if (endpoint.system_monitor_url) {
    rpcTests.push(
      getNodeSystemResources(endpoint.name, endpoint.system_monitor_url)
    );
  }

  // Execute all tests concurrently
  const testResults = await Promise.all(rpcTests);

  // Assign results to tests object
  results.tests.chainId = testResults[0];
  results.tests.gasPrice = testResults[1];
  results.tests.syncStatus = testResults[2];

  // Assign system resources if available
  if (endpoint.system_monitor_url) {
    results.system = testResults[3];
  }

  // Calculate block difference only if block numbers are provided (for /api/status endpoint)
  if (
    Object.keys(blockNumbers).length > 0 &&
    endpoint.compare_with &&
    blockNumbers[endpoint.compare_with] &&
    blockNumbers[endpoint.compare_with].success &&
    results.tests.blockNumber.success
  ) {
    const referenceBlock = blockNumbers[endpoint.compare_with].block;
    const currentBlock = results.tests.blockNumber.block;
    const difference = referenceBlock - currentBlock;

    results.blockDifference = {
      referenceBlock: referenceBlock,
      currentBlock: currentBlock,
      difference: difference,
      isBehind: difference > 0,
      isAhead: difference < 0,
      isSynced: difference === 0,
    };

    console.log(
      `📊 ${endpoint.name} block difference: ${difference} (${
        difference > 0 ? 'behind' : difference < 0 ? 'ahead' : 'synced'
      })`
    );
  }

  // Calculate overall health
  const successfulTests = Object.values(results.tests).filter(
    (test) => test.success
  ).length;
  const totalTests = Object.keys(results.tests).length;
  results.health = {
    score: (successfulTests / totalTests) * 100,
    successfulTests,
    totalTests,
  };

  console.log(
    `✅ ${endpoint.name} test completed. Health: ${results.health.score.toFixed(
      1
    )}%`
  );
  return results;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/status', async (req, res) => {
  try {
    console.log('🔄 API Status request received');

    // First, get all block numbers simultaneously to ensure accurate comparison
    const blockNumbers = await getAllBlockNumbers();

    // Test all RPC endpoints concurrently with pre-fetched block numbers
    const endpointTests = Object.entries(RPC_ENDPOINTS).map(([key, endpoint]) =>
      testRpcEndpoint(key, endpoint, {}, blockNumbers)
    );

    const endpointResults = await Promise.all(endpointTests);

    // Convert array results back to object format
    const results = {};
    Object.keys(RPC_ENDPOINTS).forEach((key, index) => {
      results[key] = endpointResults[index];
    });

    // Calculate overall statistics
    const allEndpoints = Object.values(results);
    const totalEndpoints = allEndpoints.length;
    const healthyEndpoints = allEndpoints.filter(
      (endpoint) => endpoint.health.score >= 80
    ).length;
    const partiallyHealthyEndpoints = allEndpoints.filter(
      (endpoint) => endpoint.health.score >= 50 && endpoint.health.score < 80
    ).length;
    const unhealthyEndpoints = allEndpoints.filter(
      (endpoint) => endpoint.health.score < 50
    ).length;

    const response = {
      timestamp: new Date().toISOString(),
      endpoints: results,
      summary: {
        total: totalEndpoints,
        healthy: healthyEndpoints,
        partiallyHealthy: partiallyHealthyEndpoints,
        unhealthy: unhealthyEndpoints,
        overallHealth: (healthyEndpoints / totalEndpoints) * 100,
      },
    };

    console.log('✅ API Status response prepared');
    res.json(response);
  } catch (error) {
    console.log('💥 API Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Individual endpoint test with block comparison
app.get('/api/test/:endpointKey', async (req, res) => {
  try {
    const endpointKey = req.params.endpointKey;
    const endpoint = RPC_ENDPOINTS[endpointKey];

    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Get all block numbers for comparison
    const blockNumbers = await getAllBlockNumbers();

    const result = await testRpcEndpoint(
      endpointKey,
      endpoint,
      {},
      blockNumbers
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available endpoints (must come before dynamic route)
app.get('/api/endpoints', (req, res) => {
  const endpoints = Object.entries(RPC_ENDPOINTS).map(([key, endpoint]) => ({
    key: key,
    name: endpoint.name,
    url: endpoint.url,
    compare_with: endpoint.compare_with,
  }));
  res.json(endpoints);
});

// Get external RPC endpoints list
app.get('/api/external-rpcs', (req, res) => {
  res.json(EXTERNAL_RPC_ENDPOINTS);
});

// Test all external RPC endpoints
app.get('/api/external-rpcs/status', async (req, res) => {
  try {
    console.log('🔍 Testing external RPC and WebSocket endpoints...');

    const results = await Promise.allSettled(
      EXTERNAL_RPC_ENDPOINTS.map(async (endpoint) => {
        // Test both RPC and WebSocket in parallel
        const [rpcResult, wsResult] = await Promise.allSettled([
          testExternalRpc(endpoint.rpcUrl),
          testWebSocket(endpoint.wsUrl),
        ]);

        const rpcTest =
          rpcResult.status === 'fulfilled'
            ? rpcResult.value
            : {
                success: false,
                error: rpcResult.reason?.message || 'RPC test failed',
              };
        const wsTest =
          wsResult.status === 'fulfilled'
            ? wsResult.value
            : {
                success: false,
                error: wsResult.reason?.message || 'WebSocket test failed',
              };

        return {
          name: endpoint.name,
          rpcUrl: endpoint.displayRpcUrl || endpoint.rpcUrl,
          wsUrl: endpoint.displayWsUrl || endpoint.wsUrl,
          description: endpoint.description,
          rpc: rpcTest,
          websocket: wsTest,
          overallSuccess: rpcTest.success && wsTest.success,
          timestamp: new Date().toISOString(),
        };
      })
    );

    const endpointResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: EXTERNAL_RPC_ENDPOINTS[index].name,
          rpcUrl:
            EXTERNAL_RPC_ENDPOINTS[index].displayRpcUrl ||
            EXTERNAL_RPC_ENDPOINTS[index].rpcUrl,
          wsUrl:
            EXTERNAL_RPC_ENDPOINTS[index].displayWsUrl ||
            EXTERNAL_RPC_ENDPOINTS[index].wsUrl,
          description: EXTERNAL_RPC_ENDPOINTS[index].description,
          rpc: { success: false, error: 'RPC test failed' },
          websocket: { success: false, error: 'WebSocket test failed' },
          overallSuccess: false,
          error: result.reason?.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    });

    // Filter out endpoints that shouldn't be shown in UI
    const visibleEndpoints = endpointResults.filter((endpoint, index) => {
      return EXTERNAL_RPC_ENDPOINTS[index].showInUI !== false;
    });

    const workingEndpoints = visibleEndpoints.filter(
      (endpoint) => endpoint.overallSuccess
    );
    const failedEndpoints = visibleEndpoints.filter(
      (endpoint) => !endpoint.overallSuccess
    );

    res.json({
      timestamp: new Date().toISOString(),
      total: visibleEndpoints.length,
      working: workingEndpoints.length,
      failed: failedEndpoints.length,
      endpoints: visibleEndpoints,
    });
  } catch (error) {
    console.log('💥 External RPC status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dynamic endpoint route for any endpoint key (must come after specific routes)
app.get('/api/:endpointKey', async (req, res) => {
  const { endpointKey } = req.params;

  if (!RPC_ENDPOINTS[endpointKey]) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }

  try {
    const result = await testRpcEndpoint(
      endpointKey,
      RPC_ENDPOINTS[endpointKey],
      {},
      {} // No pre-fetched block numbers for individual endpoints
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: Object.keys(RPC_ENDPOINTS),
  });
});

// Configuration endpoint
app.get('/config', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    port: PORT,
    endpoints: RPC_ENDPOINTS,
  });
});

// External API endpoint for simplified external RPC status with block differences
app.get('/api/external/status', async (req, res) => {
  try {
    // Find the reference RPC (the one marked as reference)
    const referenceEndpoint = Object.entries(RPC_ENDPOINTS).find(
      ([key, endpoint]) => endpoint.is_reference
    );

    if (!referenceEndpoint) {
      return res.status(500).json({
        error: 'No reference RPC found',
        message:
          'Please configure a reference RPC with RPC_1_IS_REFERENCE=true',
      });
    }

    const [referenceKey, referenceRpc] = referenceEndpoint;

    // Get reference RPC block number
    let referenceBlock = null;
    try {
      const referenceResponse = await axios.get(
        `http://localhost:${PORT}/api/${referenceKey}`,
        {
          timeout: 10000,
        }
      );
      if (referenceResponse.data?.tests?.blockNumber?.success) {
        referenceBlock = referenceResponse.data.tests.blockNumber.block;
      }
    } catch (error) {
      console.error('Error getting reference RPC block:', error);
      return res.status(500).json({
        error: 'Reference RPC unavailable',
        message: `Cannot get block number from reference RPC: ${error.message}`,
      });
    }

    if (referenceBlock === null) {
      return res.status(500).json({
        error: 'Reference RPC block unavailable',
        message: 'Reference RPC is not responding with valid block number',
      });
    }

    // Test all external RPCs and calculate block differences
    const results = [];

    for (const externalRpc of EXTERNAL_RPC_ENDPOINTS) {
      try {
        // Test the external RPC
        const rpcResponse = await axios.post(
          externalRpc.rpcUrl,
          {
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          },
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (rpcResponse.data?.result) {
          const currentBlock = parseInt(rpcResponse.data.result, 16);
          const difference = referenceBlock - currentBlock;

          results.push({
            rpc: externalRpc.displayRpcUrl,
            blockDifference: {
              referenceBlock: referenceBlock,
              currentBlock: currentBlock,
              difference: difference,
              isBehind: difference > 0,
              isAhead: difference < 0,
              isSynced: difference === 0,
            },
            rpcName: externalRpc.name,
            blockNumber: currentBlock,
            isHealthy: Math.abs(difference) <= 5, // Consider healthy if within 5 blocks
          });
        } else {
          results.push({
            rpc: externalRpc.displayRpcUrl,
            blockDifference: null,
            rpcName: externalRpc.name,
            blockNumber: null,
            isHealthy: false,
            error: 'Invalid response from RPC',
          });
        }
      } catch (error) {
        results.push({
          rpc: externalRpc.displayRpcUrl,
          blockDifference: null,
          rpcName: externalRpc.name,
          blockNumber: null,
          isHealthy: false,
          error: error.message,
        });
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      referenceRpc: {
        name: referenceRpc.name,
        url: referenceRpc.displayUrl || referenceRpc.url,
        blockNumber: referenceBlock,
      },
      data: results,
    });
  } catch (error) {
    console.error('Error in external status API:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RPC Monitor running on port ${PORT}`);
  console.log(
    `📡 Monitoring ${Object.keys(RPC_ENDPOINTS).length} RPC endpoints:`
  );

  for (const [key, endpoint] of Object.entries(RPC_ENDPOINTS)) {
    console.log(`  - ${endpoint.name}: ${endpoint.url}`);
  }

  console.log('\n📋 Configuration:');
  console.log('  To customize RPC endpoints, set these environment variables:');
  console.log('  - RPC_1_NAME, RPC_1_URL, RPC_1_CHAIN_ID, etc.');
  console.log('  - EXTERNAL_RPC_1_NAME, EXTERNAL_RPC_1_URL, etc.');
  console.log('  See README.md for complete configuration options');
  console.log('\n💡 Example:');
  console.log('  docker run --env-file .env rpc-monitor');
});
