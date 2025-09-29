import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createReadStream } from 'fs';
import { join , dirname } from 'path';
import { fileURLToPath } from 'url';
import { setImmediate } from 'timers';

import { MemoryLeakTester, createTest } from './memory-leak-tester';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced memory monitoring with Leakage-like functionality
const memoryTester = new MemoryLeakTester({
  iterations: 1000,
  snapshotInterval: 50,
  leakThreshold: 25, // 25MB threshold
  verbose: true
});

// Track request-specific memory
let requestCount = 0;
const baselineMemory = process.memoryUsage();

function logMemoryUsage(label: string, memory = process.memoryUsage()): void {
  console.log(`${label}:`);
  console.log(`  RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External: ${(memory.external / 1024 / 1024).toFixed(2)} MB`);

  // Compare with baseline
  console.log(`  Change from baseline:`);
  console.log(`    RSS: ${((memory.rss - baselineMemory.rss) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    Heap Used: ${((memory.heapUsed - baselineMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  console.log('---');
}

// Set up memory tester event listeners
memoryTester.on('warning', (event) => {
  console.warn(`[MEMORY WARNING] ${event.message}`);
  console.warn(`Memory growth: ${((event.memory.heapUsed - baselineMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
});

memoryTester.on('error', (event) => {
  console.error(`[MEMORY ERROR] ${event.message}`);
});

memoryTester.on('snapshot', (event) => {
  console.log(`[SNAPSHOT] ${event.message} - Path: ${event.metadata?.path}`);
});

// Periodic memory logging
setInterval(() => {
  const currentMemory = process.memoryUsage();
  logMemoryUsage('Periodic Memory Check', currentMemory);

  // Check for memory leaks
  const growth = (currentMemory.heapUsed - baselineMemory.heapUsed) / 1024 / 1024;
  if (growth > 25) {
    memoryTester.recordMemoryEvent('warning', `Significant memory growth detected: ${growth.toFixed(2)} MB`, { growth });
  }
}, 30000); // Log every 30 seconds

// Create a simple server for testing
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  requestCount++;
  const startMemory = process.memoryUsage();

  // Log memory at start of request
  logMemoryUsage(`Start of request ${requestCount}: ${req.url}`, startMemory);

  // Create a memory test for this request
  const requestTest = createTest(
    `request-${requestCount}`,
    async () => {
      // Simulate request processing
      await new Promise(resolve => setTimeout(resolve, 50));
    },
    () => {
      // Cleanup after request
      if (global.gc && typeof global.gc === 'function') {
        global.gc();
      }
    }
  );

  // Run the request test with memory monitoring
  memoryTester.runIteration(requestTest, requestCount).catch(err => {
    console.error(`Request test failed: ${err}`);
  });

  if (req.url === '/') {
    // Serve the index.html file
    const indexPath = join(__dirname, '..', 'dist', 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    createReadStream(indexPath).pipe(res);
  } else if (req.url === '/memory-test') {
    // Run a comprehensive memory test
    memoryTester.runTests([
      createTest('memory-intensive-operation', async () => {
        // Simulate memory-intensive operation
        const _data = Array(10000).fill(null).map((_, i) => ({
          id: i,
          data: `Large string data ${i}`.repeat(100)
        }));

        await new Promise(resolve => setTimeout(resolve, 100));

        // Cleanup
        if (global.gc && typeof global.gc === 'function') {
          global.gc();
        }
      })
    ]).then(result => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Memory test completed',
        result: {
          hasLeak: result.hasLeak,
          memoryGrowth: result.memoryGrowth,
          iterations: result.iterations,
          snapshots: result.snapshots.length
        }
      }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
  } else if (req.url && req.url.startsWith('/api/')) {
    // Simulate API responses with memory testing
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Sample API response',
        timestamp: new Date().toISOString(),
        data: Array(1000).fill(null).map((_, i) => ({ id: i, value: Math.random() }))
      }));
    }, 100);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }

  // Log memory at end of request
  setImmediate(() => {
    const endMemory = process.memoryUsage();
    logMemoryUsage(`End of request ${requestCount}: ${req.url}`, endMemory);

    const growth = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
    if (growth > 10) {
      console.warn(`High memory usage in request ${requestCount}: ${growth.toFixed(2)} MB`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Memory monitoring server running on port ${PORT}`);
  logMemoryUsage('Server Started');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  logMemoryUsage('Server Shutdown');
  server.close(() => {
    process.exit(0);
  });
});