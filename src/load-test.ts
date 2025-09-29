import { performance } from 'perf_hooks';

import axios from 'axios';

import { MemoryLeakTester } from './memory-leak-tester';
import { addApiTask } from './utils/queue';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const REQUEST_COUNT = parseInt(process.env.REQUEST_COUNT || '1000', 10);
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS || '10', 10);

// Enhanced memory leak testing with Leakage-like functionality
const memoryTester = new MemoryLeakTester({
  iterations: REQUEST_COUNT,
  snapshotInterval: 100,
  leakThreshold: 20, // 20MB threshold for load testing
  verbose: true,
  enableGc: true
});

// Track memory usage
const baselineMemory = process.memoryUsage();

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

// Test scenarios with enhanced reliability using p-queue
async function testSearchEndpoint(): Promise<unknown> {
  const queries = ['New York', 'London', 'Tokyo', 'Paris', 'Berlin'];
  const randomQuery = queries[Math.floor(Math.random() * queries.length)];

  try {
    // Use queue system for reliable API calls
    const response = await addApiTask(
      `load-test-search-${randomQuery}`,
      async () => {
        const result = await axios.get(`${BASE_URL}/api/search`, {
          params: { q: randomQuery }
        });
        return result.data;
      },
      'API_SEARCH'
    );
    return response;
  } catch (error: unknown) {
    console.error('Search endpoint error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

async function testWeatherEndpoint(): Promise<unknown> {
  // Random coordinates within valid ranges
  const lat = (Math.random() * 180 - 90).toFixed(4);
  const lon = (Math.random() * 360 - 180).toFixed(4);
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() - 1);

  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  try {
    // Use queue system for reliable weather API calls
    const response = await addApiTask(
      `load-test-weather-${lat}-${lon}-${start}-${end}`,
      async () => {
        const result = await axios.get(`${BASE_URL}/api/weather`, {
          params: {
            lat,
            lon,
            start,
            end,
            timezone: 'UTC'
          }
        });
        return result.data;
      },
      'API_WEATHER'
    );
    return response;
  } catch (error: unknown) {
    console.error('Weather endpoint error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

async function testReverseGeocodeEndpoint(): Promise<unknown> {
  // Random coordinates within valid ranges
  const lat = (Math.random() * 180 - 90).toFixed(4);
  const lon = (Math.random() * 360 - 180).toFixed(4);

  try {
    // Use queue system for reliable geocode API calls
    const response = await addApiTask(
      `load-test-geocode-${lat}-${lon}`,
      async () => {
        const result = await axios.get(`${BASE_URL}/api/reverse-geocode`, {
          params: { lat, lon }
        });
        return result.data;
      },
      'API_GEOCODE'
    );
    return response;
  } catch (error: unknown) {
    console.error('Reverse geocode endpoint error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Execute a single test iteration
async function runTestIteration(iteration: number): Promise<void> {
  const startTime = performance.now();

  // Run all three endpoint tests
  await Promise.all([
    testSearchEndpoint(),
    testWeatherEndpoint(),
    testReverseGeocodeEndpoint()
  ]);

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`Iteration ${iteration} completed in ${duration.toFixed(2)}ms`);

  // Log memory usage every 100 iterations
  if (iteration % 100 === 0) {
    logMemoryUsage(`After ${iteration} iterations`);
    memoryTester.recordMemoryEvent('allocation', `Load test iteration ${iteration}`, { iteration, duration });
  }
}

// Run concurrent requests
async function runConcurrentRequests(batchNumber: number): Promise<void> {
  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const iteration = batchNumber * CONCURRENT_REQUESTS + i + 1;
    promises.push(runTestIteration(iteration));
  }
  await Promise.all(promises);
}

// Main load test function with enhanced memory testing
async function runLoadTest(): Promise<void> {
  console.log(`Starting load test with ${REQUEST_COUNT} requests (${CONCURRENT_REQUESTS} concurrent)`);
  logMemoryUsage('Baseline');

  // Set up memory tester event listeners
  memoryTester.on('warning', (event) => {
    console.warn(`[LOAD TEST WARNING] ${event.message}`);
  });

  memoryTester.on('snapshot', (event) => {
    console.log(`[LOAD TEST SNAPSHOT] ${event.message}`);
  });

  // Create load test definition for memory tester
  const loadTest = {
    name: 'load-test-endpoints',
    test: async () => {
      await runConcurrentRequests(0);
    },
    cleanup: () => {
      if (global.gc && typeof global.gc === 'function') {
        global.gc();
      }
    }
  };

  const totalBatches = Math.ceil(REQUEST_COUNT / CONCURRENT_REQUESTS);
  const startTime = performance.now();

  for (let batch = 0; batch < totalBatches; batch++) {
    console.log(`Running batch ${batch + 1}/${totalBatches}`);

    // Run the test with memory monitoring
    await memoryTester.runIteration(loadTest, batch + 1);

    // Optional: Add a small delay between batches to avoid overwhelming the server
    if (batch < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  console.log(`Load test completed in ${totalTime.toFixed(2)}ms`);
  console.log(`Average time per request: ${(totalTime / REQUEST_COUNT).toFixed(2)}ms`);
  logMemoryUsage('Final Memory Usage');

  // Get comprehensive memory test results
  const _memoryInfo = memoryTester.getMemoryInfo();
  const finalMemory = process.memoryUsage();
  const heapIncrease = (finalMemory.heapUsed - baselineMemory.heapUsed) / 1024 / 1024;

  // Run final memory test
  const finalResult = await memoryTester.runTests([loadTest]);

  console.log('=== MEMORY LEAK TEST RESULTS ===');
  console.log(`Memory Growth: ${heapIncrease.toFixed(2)} MB`);
  console.log(`Leak Detected: ${finalResult.hasLeak ? 'YES' : 'NO'}`);
  console.log(`Leak Threshold: ${finalResult.leakThreshold} MB`);
  console.log(`Iterations: ${finalResult.iterations}`);
  console.log(`Peak Memory Usage: ${(finalResult.peakMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Snapshots Taken: ${finalResult.snapshots.length}`);

  if (finalResult.hasLeak) {
    console.warn(`WARNING: Memory leak detected! Heap usage increased by ${heapIncrease.toFixed(2)} MB`);
    console.warn(`Recommendation: Review memory usage patterns and implement cleanup`);
  } else {
    console.log(`No significant memory leak detected. Heap usage increased by ${heapIncrease.toFixed(2)} MB`);
  }
}

// Run the test
runLoadTest().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});