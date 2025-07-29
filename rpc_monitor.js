require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 8080;

const execAsync = promisify(exec);

// Configuration - Multiple RPC endpoints to monitor
// RPC URLs should be provided at runtime via environment variables
const RPC_ENDPOINTS = {
  hyperliquid_main: {
    name: `Hyperliquid ${process.env.CHAIN || 'Testnet'}`,
    url:
      process.env.HYPERLIQUID_MAIN_URL ||
      (() => {
        console.warn(
          '⚠️  HYPERLIQUID_MAIN_URL not set. Please provide at runtime.'
        );
        return 'https://rpc.hyperliquid-testnet.xyz/evm'; // Default fallback
      })(),
    expected_chain_id: process.env.HYPERLIQUID_CHAIN_ID || '998',
    timeout: parseInt(process.env.HYPERLIQUID_TIMEOUT) || 10000,
    is_reference: true, // This is the main reference node
  },
  local_node: {
    name: process.env.LOCAL_NODE_NAME || 'Local HL Node',
    url:
      process.env.LOCAL_NODE_URL ||
      (() => {
        console.warn('⚠️  LOCAL_NODE_URL not set. Please provide at runtime.');
        return 'http://localhost:3001/evm'; // Default fallback
      })(),
    expected_chain_id: process.env.LOCAL_NODE_CHAIN_ID || '998',
    timeout: parseInt(process.env.LOCAL_NODE_TIMEOUT) || 5000,
    compare_with: 'hyperliquid_main', // Compare block difference with main node
    system_monitor_url: process.env.LOCAL_NODE_SYSTEM_URL, // System monitor URL for this node
  },
  archive_node: {
    name: process.env.ARCHIVE_NODE_NAME || 'Archive Node',
    url:
      process.env.ARCHIVE_NODE_URL ||
      (() => {
        console.warn(
          '⚠️  ARCHIVE_NODE_URL not set. Please provide at runtime.'
        );
        return 'http://localhost:8547'; // Default fallback
      })(),
    expected_chain_id: process.env.ARCHIVE_NODE_CHAIN_ID || '998',
    timeout: parseInt(process.env.ARCHIVE_NODE_TIMEOUT) || 10000,
    compare_with: 'hyperliquid_main', // Compare block difference with main node
    system_monitor_url: process.env.ARCHIVE_NODE_SYSTEM_URL, // System monitor URL for this node
  },
};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  console.log('  To customize RPC URLs, set these environment variables:');
  console.log('  - HYPERLIQUID_MAIN_URL: Main reference RPC endpoint');
  console.log('  - LOCAL_NODE_URL: Local HL node RPC endpoint');
  console.log('  - ARCHIVE_NODE_URL: Archive node RPC endpoint');
  console.log('  - LOCAL_NODE_SYSTEM_URL: System monitor URL for local node');
  console.log(
    '  - ARCHIVE_NODE_SYSTEM_URL: System monitor URL for archive node'
  );
  console.log('\n💡 Example:');
  console.log(
    '  docker run -e HYPERLIQUID_MAIN_URL=https://your-rpc.com -e LOCAL_NODE_URL=http://your-node:3001/evm rpc-monitor'
  );
});
