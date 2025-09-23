# Memory Leak Detection

This project includes comprehensive memory leak detection tools with **both custom Leakage-like functionality and Facebook's Memlab integration**. The system provides advanced memory monitoring, profiling, and testing capabilities to identify memory leaks in the application.

## Enhanced Memory Testing System

The project now includes a custom **MemoryLeakTester** class that provides Leakage-like functionality with the following features:

- **Cross-platform compatibility** - Uses only Node.js built-in APIs
- **Comprehensive memory tracking** - Monitors heap usage, RSS, and external memory
- **Automatic leak detection** - Configurable thresholds for leak detection
- **Heap snapshots** - Automatic and manual snapshot generation
- **Event-driven monitoring** - Real-time memory event tracking
- **Configurable testing** - Customizable test iterations and thresholds

## Tools Included

### Core Memory Testing Framework
1. **memory-leak-tester.ts** - Core memory testing framework with Leakage-like functionality
2. **memlab-integration.ts** - Facebook's Memlab integration for professional-grade memory analysis

### Memory Testing Tools
3. **memory-monitor.ts** - Enhanced server memory monitoring with leak detection
4. **load-test.ts** - Load testing with comprehensive memory leak detection
5. **memory-profiler.ts** - Advanced memory profiling with heap snapshots and Memlab integration

## Usage

### Enhanced Memory Leak Testing

#### Custom MemoryLeakTester Framework

The `MemoryLeakTester` class provides comprehensive memory leak detection with Leakage-like functionality:

```typescript
import { MemoryLeakTester, createTest } from './memory-leak-tester.js';

const tester = new MemoryLeakTester({
  iterations: 100,
  leakThreshold: 25, // 25MB
  snapshotInterval: 10,
  verbose: true
});

// Create a test
const test = createTest('my-test', async () => {
  // Your test code here
  const data = Array(1000).fill(null).map((_, i) => ({
    id: i,
    data: `Test data ${i}`.repeat(100)
  }));
});

// Run the test
const result = await tester.runTests([test]);
console.log(`Memory leak detected: ${result.hasLeak}`);
console.log(`Memory growth: ${result.memoryGrowth} MB`);
```

#### Facebook Memlab Integration

The project now includes **Memlab integration** for professional-grade memory analysis:

```typescript
import { MemlabIntegration } from './memlab-integration.js';

const memlab = new MemlabIntegration();

// Get comprehensive memory analysis
const analysis = await memlab.getComprehensiveAnalysis();
console.log(`Memlab available: ${analysis.memlabAvailable}`);

// Run enhanced analysis
const enhancedResult = await memlab.runEnhancedAnalysis('scenario-name');
console.log(`Analysis complete: ${enhancedResult.metadata.analysisType}`);
```

### Memory Monitor

To run the server with enhanced memory monitoring:

```bash
npm run memory-monitor
```

This will start the server with:
- Periodic memory logging every 30 seconds
- Memory logging at the start and end of each request
- Automatic leak detection with configurable thresholds
- Real-time memory event monitoring
- Integration with the MemoryLeakTester framework

### Enhanced Load Testing

For comprehensive load testing with advanced memory leak detection:

```bash
npm run load-test
```

The enhanced load test provides:
- Integration with MemoryLeakTester framework
- Real-time memory monitoring during load testing
- Automatic leak detection with configurable thresholds
- Detailed memory growth analysis
- Comprehensive test result reporting
- Event-driven memory tracking

#### Load Test Configuration

You can configure the load test with environment variables:

```bash
BASE_URL=http://localhost:3001 REQUEST_COUNT=5000 CONCURRENT_REQUESTS=50 npm run load-test
```

- `BASE_URL`: The URL of the server to test (default: http://localhost:3001)
- `REQUEST_COUNT`: Total number of requests to send (default: 1000)
- `CONCURRENT_REQUESTS`: Number of concurrent requests (default: 10)

#### Load Test Results

The enhanced load test provides detailed results:
- Memory growth analysis
- Leak detection with configurable thresholds
- Peak memory usage tracking
- Heap snapshot generation
- Event logging and analysis

### Memory Profiler

For advanced memory profiling with enhanced leak detection:

```bash
npm run memory-profiler
```

The enhanced memory profiler provides:
- Automatic heap snapshots with Leakage-like functionality
- Real-time memory event monitoring
- Integration with MemoryLeakTester framework
- Comprehensive memory growth analysis
- Event-driven memory tracking

#### Memory Profiler Endpoints

When the memory profiler is running, it provides these endpoints:

- `GET /memory-info` - Returns current memory usage with leak detection data
- `GET /memory-snapshot` - Takes a heap snapshot and returns the file path
- `GET /memory-test` - Runs a comprehensive memory leak test

#### Taking Heap Snapshots

To take a heap snapshot while the profiler is running:

```bash
curl http://localhost:3002/memory-snapshot
```

Or visit `http://localhost:3002/memory-snapshot` in your browser.

The snapshots will be saved as `.heapsnapshot` files in the project directory, which can be loaded in Chrome DevTools for analysis.

## Configuration

### MemoryLeakTester Options

The MemoryLeakTester class accepts the following configuration options:

```typescript
interface TestOptions {
  iterations?: number;      // Number of test iterations (default: 100)
  duration?: number;        // Test duration in milliseconds (default: 30000)
  snapshotInterval?: number; // Interval for taking heap snapshots (default: 10)
  leakThreshold?: number;   // Memory leak threshold in MB (default: 50)
  enableGc?: boolean;       // Enable automatic garbage collection (default: true)
  verbose?: boolean;        // Enable verbose logging (default: true)
}
```

### Environment Variables

You can configure the tools with environment variables:

```bash
# Load Testing
BASE_URL=http://localhost:3001 REQUEST_COUNT=5000 CONCURRENT_REQUESTS=50 npm run load-test

# Memory Monitoring
LEAK_THRESHOLD=25 SNAPSHOT_INTERVAL=50 npm run memory-monitor

# Memory Profiling
ENABLE_GC=true VERBOSE=true npm run memory-profiler
```

## Interpreting Results

The tools will log memory usage in the following format:

```
Periodic Memory Check:
  RSS: 45.23 MB
  Heap Total: 32.45 MB
  Heap Used: 28.12 MB
  External: 0.23 MB
  Change from baseline:
    RSS: 5.12 MB
    Heap Used: 3.45 MB
---
```

- **RSS**: Resident Set Size - Total memory allocated for the process
- **Heap Total**: Total size of the V8 heap
- **Heap Used**: Actual memory used by the V8 heap
- **External**: Memory used by C++ objects bound to JavaScript objects

If you see a continuous increase in Heap Used that doesn't plateau or decrease after requests are completed, this could indicate a memory leak.

## Built-in Node.js Memory Debugging

You can also use Node.js's built-in inspector for memory profiling:

```bash
node --inspect-brk dist/server/server.js
```

Then open Chrome DevTools and navigate to `chrome://inspect` to connect to the Node.js process.

## New Features and Capabilities

### Event-Driven Memory Monitoring

The enhanced system provides event-driven memory monitoring:

```typescript
const tester = new MemoryLeakTester();

tester.on('warning', (event) => {
  console.warn(`Memory warning: ${event.message}`);
});

tester.on('snapshot', (event) => {
  console.log(`Snapshot taken: ${event.metadata.path}`);
});

tester.on('complete', (result) => {
  console.log(`Test complete. Leak detected: ${result.hasLeak}`);
});
```

### Comprehensive Memory Tracking

The system tracks multiple memory metrics:
- **RSS**: Resident Set Size - Total memory allocated for the process
- **Heap Total**: Total size of the V8 heap
- **Heap Used**: Actual memory used by the V8 heap
- **External**: Memory used by C++ objects bound to JavaScript objects
- **Peak Memory**: Highest memory usage recorded during testing

### Automatic Leak Detection

Configurable leak detection with multiple threshold levels:
- Automatic detection based on configurable thresholds
- Real-time monitoring during test execution
- Historical memory growth analysis
- Peak memory tracking and reporting

### Cross-Platform Compatibility

Unlike traditional Leakage library, this implementation:
- Uses only Node.js built-in APIs
- No native dependencies or compilation issues
- Works on Windows, macOS, and Linux
- No external package dependencies

## Analyzing Heap Snapshots

Heap snapshots can be analyzed in Chrome DevTools:

1. Open Chrome DevTools
2. Go to the Memory tab
3. Click "Load" and select one of the `.heapsnapshot` files
4. Use the Comparison view to compare snapshots taken at different times
5. Look for objects that continuously grow in number or retained size

Common signs of memory leaks in the snapshots:
- DOM nodes that increase continuously
- Detached DOM trees
- Closures that retain large objects
- Event listeners that aren't properly removed
- Objects that should have been garbage collected but are still retained

## Best Practices

1. **Regular Testing**: Run memory tests regularly during development
2. **Baseline Monitoring**: Establish memory usage baselines for comparison
3. **Threshold Tuning**: Adjust leak thresholds based on your application's needs
4. **Cleanup Functions**: Always provide cleanup functions in your tests
5. **Garbage Collection**: Enable automatic GC for more accurate results
6. **Snapshot Analysis**: Regularly analyze heap snapshots for leak patterns