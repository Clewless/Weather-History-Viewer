#!/usr/bin/env node

/**
 * Memory Profiling Script
 * 
 * This script helps profile memory usage of the application.
 * It can be used to take heap snapshots and analyze memory growth.
 */

import { writeHeapSnapshot } from 'v8';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createReadStream } from 'fs';
import { join , dirname } from 'path';
import { fileURLToPath } from 'url';
import { setImmediate } from 'timers';

import { MemoryLeakTester } from './memory-leak-tester.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced memory profiling with Leakage-like functionality
const memoryTester = new MemoryLeakTester({
  iterations: 500,
  snapshotInterval: 25,
  leakThreshold: 30, // 30MB threshold for profiler
  verbose: true,
  enableGc: true
});

// Memory tracking
interface HeapSnapshot {
  label: string;
  path: string;
  timestamp: string;
}

const heapSnapshots: HeapSnapshot[] = [];
const baselineMemory = process.memoryUsage();

function takeHeapSnapshot(label: string): string {
  const snapshotPath = writeHeapSnapshot();
  heapSnapshots.push({
    label,
    path: snapshotPath,
    timestamp: new Date().toISOString()
  });
  console.log(`Heap snapshot taken: ${label} -> ${snapshotPath}`);
  return snapshotPath;
}

function logMemoryUsage(label: string): void {
  const currentMemory = process.memoryUsage();
  console.log(`${label}:`);
  console.log(`  RSS: ${(currentMemory.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(currentMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External: ${(currentMemory.external / 1024 / 1024).toFixed(2)} MB`);
  
  // Compare with baseline
  console.log(`  Change from baseline:`);
  console.log(`    RSS: ${((currentMemory.rss - baselineMemory.rss) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    Heap Used: ${((currentMemory.heapUsed - baselineMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  console.log('---');
}

// Take initial snapshot
takeHeapSnapshot('initial');
logMemoryUsage('Initial Memory Usage');

// Periodic snapshots and memory logging
setInterval(() => {
  logMemoryUsage('Periodic Memory Check');
}, 60000); // Every minute

// Force garbage collection if available (for testing)
// Only available when Node.js is run with --expose-gc flag
declare const gc: (() => void) | undefined;

if (typeof gc === 'function') {
  setInterval(() => {
    gc();
    console.log('Garbage collection forced');
  }, 300000); // Every 5 minutes
}

// Set up memory tester event listeners
memoryTester.on('warning', (event) => {
  console.warn(`[PROFILER WARNING] ${event.message}`);
});

memoryTester.on('error', (event) => {
  console.error(`[PROFILER ERROR] ${event.message}`);
});

memoryTester.on('snapshot', (event) => {
  console.log(`[PROFILER SNAPSHOT] ${event.message}`);
});

// Simple server for testing
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const requestId = `req-${Date.now()}`;
  logMemoryUsage(`Start of request: ${req.url} (${requestId})`);

  if (req.url === '/memory-snapshot') {
    // Endpoint to trigger a heap snapshot
    const snapshotPath = takeHeapSnapshot(`manual-${new Date().toISOString()}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Heap snapshot taken',
      path: snapshotPath,
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/memory-test') {
    // Run a comprehensive memory test
    memoryTester.runTests([
      {
        name: 'profiler-load-test',
        test: async () => {
          // Simulate memory-intensive operations
          for (let i = 0; i < 100; i++) {
            const _data = Array(1000).fill(null).map((_, idx) => ({
              id: idx,
              data: `Test data ${idx}`.repeat(50)
            }));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        },
        cleanup: () => {
          if (global.gc && typeof global.gc === 'function') {
            global.gc();
          }
        }
      }
    ]).then(result => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Memory test completed',
        result: {
          hasLeak: result.hasLeak,
          memoryGrowth: result.memoryGrowth,
          iterations: result.iterations,
          snapshots: result.snapshots.length,
          leakThreshold: result.leakThreshold
        }
      }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
  } else if (req.url === '/memory-info') {
    // Endpoint to get current memory info
    const currentMemory = process.memoryUsage();
    const memoryInfo = memoryTester.getMemoryInfo();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      memory: {
        rss: `${(currentMemory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(currentMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(currentMemory.external / 1024 / 1024).toFixed(2)} MB`
      },
      baselineComparison: {
        rssChange: `${((currentMemory.rss - baselineMemory.rss) / 1024 / 1024).toFixed(2)} MB`,
        heapUsedChange: `${((currentMemory.heapUsed - baselineMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`
      },
      testerInfo: {
        hasLeak: memoryInfo.current.heapUsed - memoryInfo.baseline.heapUsed > memoryTester['options'].leakThreshold * 1024 * 1024,
        memoryGrowth: (memoryInfo.current.heapUsed - memoryInfo.baseline.heapUsed) / 1024 / 1024,
        eventsCount: memoryInfo.events.length,
        snapshotsCount: memoryInfo.snapshots.length
      },
      heapSnapshots
    }));
  } else if (req.url === '/') {
    const indexPath = join(__dirname, '..', 'dist', 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    createReadStream(indexPath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
  
  // Log memory at end of request
  setImmediate(() => {
    logMemoryUsage(`End of request: ${req.url}`);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Memory profiling server running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET / - Serve the main application`);
  console.log(`  GET /memory-info - Get current memory information`);
  console.log(`  GET /memory-snapshot - Take a heap snapshot`);
  console.log(`  Heap snapshots will be saved in the current directory`);
  logMemoryUsage('Server Started');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  logMemoryUsage('Server Shutdown');
  takeHeapSnapshot('shutdown');
  server.close(() => {
    console.log('Heap snapshots taken during this session:');
    heapSnapshots.forEach(snapshot => {
      console.log(`  ${snapshot.label}: ${snapshot.path} (${snapshot.timestamp})`);
    });
    process.exit(0);
  });
});