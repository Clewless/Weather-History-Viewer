#!/usr/bin/env node

/**
 * Custom Memory Leak Testing System
 *
 * This module provides Leakage-like functionality for memory leak testing
 * using pure Node.js APIs. It's designed to be cross-platform compatible
 * and provides comprehensive memory leak detection capabilities.
 */

import { writeHeapSnapshot } from 'v8';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

// Type definitions for our memory leak testing
export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  timestamp: number;
}

export interface MemoryTestResult {
  iterations: number;
  duration: number;
  initialMemory: MemoryUsage;
  finalMemory: MemoryUsage;
  peakMemory: MemoryUsage;
  memoryGrowth: number;
  hasLeak: boolean;
  leakThreshold: number;
  snapshots: string[];
  events: MemoryEvent[];
}

export interface MemoryEvent {
  type: 'allocation' | 'deallocation' | 'snapshot' | 'warning' | 'error';
  timestamp: number;
  memory: MemoryUsage;
  message: string;
  metadata?: { [key: string]: unknown };
}

export interface TestOptions {
  iterations?: number;
  duration?: number;
  snapshotInterval?: number;
  leakThreshold?: number;
  enableGc?: boolean;
  verbose?: boolean;
}

export interface LeakageTest {
  name: string;
  test: () => Promise<void> | void;
  cleanup?: () => Promise<void> | void;
}

/**
 * Enhanced Memory Leak Tester
 * Provides comprehensive memory leak detection similar to Leakage library
 */
export class MemoryLeakTester extends EventEmitter {
  private baselineMemory: MemoryUsage;
  private peakMemory: MemoryUsage;
  private snapshots: string[] = [];
  private events: MemoryEvent[] = [];
  private testStartTime: number = 0;
  private iterationCount: number = 0;
  private options: Required<TestOptions>;

  constructor(options: TestOptions = {}) {
    super();
    this.options = {
      iterations: options.iterations || 100,
      duration: options.duration || 30000, // 30 seconds
      snapshotInterval: options.snapshotInterval || 10,
      leakThreshold: options.leakThreshold || 50, // 50MB
      enableGc: options.enableGc !== false,
      verbose: options.verbose !== false
    };

    // Initialize memory tracking first
    const initialMemory = this.getMemoryUsageUntracked();
    this.baselineMemory = initialMemory;
    this.peakMemory = initialMemory;
  }

  /**
   * Get current memory usage without tracking peak
   */
  private getMemoryUsageUntracked(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      timestamp: Date.now()
    };
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): MemoryUsage {
    const current = this.getMemoryUsageUntracked();

    // Track peak memory
    if (current.heapUsed > this.peakMemory.heapUsed) {
      this.peakMemory = { ...current };
    }

    return current;
  }

  /**
   * Force garbage collection if available
   */
  private forceGC(): void {
    if (this.options.enableGc && typeof (global as { gc?: () => void }).gc === 'function') {
      (global as { gc?: () => void }).gc!();
      this.log('Garbage collection forced', 'info');
    }
  }

  /**
   * Take a heap snapshot
   */
  private takeSnapshot(label: string): string {
    try {
      const snapshotPath = writeHeapSnapshot();
      const snapshot: MemoryEvent = {
        type: 'snapshot',
        timestamp: Date.now(),
        memory: this.getMemoryUsage(),
        message: `Heap snapshot: ${label}`,
        metadata: { path: snapshotPath }
      };

      this.snapshots.push(snapshotPath);
      this.events.push(snapshot);
      this.emit('snapshot', snapshot);

      this.log(`Heap snapshot taken: ${label} -> ${snapshotPath}`, 'info');
      return snapshotPath;
    } catch (error) {
      this.log(`Failed to take heap snapshot: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Log a message with optional level
   */
  private log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (this.options.verbose) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Record a memory event
   */
  private recordEvent(type: MemoryEvent['type'], message: string, metadata?: { [key: string]: unknown }): void {
    const event: MemoryEvent = {
      type,
      timestamp: Date.now(),
      memory: this.getMemoryUsage(),
      message,
      metadata
    };

    this.events.push(event);
    this.emit('event', event);

    if (type === 'warning') {
      this.emit('warning', event);
    } else if (type === 'error') {
      this.emit('error', event);
    }
  }

  /**
   * Public method to record memory events
   */
  public recordMemoryEvent(type: MemoryEvent['type'], message: string, metadata?: { [key: string]: unknown }): void {
    this.recordEvent(type, message, metadata);
  }

  /**
   * Check if memory usage indicates a potential leak
   */
  private checkForLeak(current: MemoryUsage): boolean {
    const growth = (current.heapUsed - this.baselineMemory.heapUsed) / 1024 / 1024; // MB
    return growth > this.options.leakThreshold;
  }

  /**
   * Run a single test iteration
   */
  async runIteration(test: LeakageTest, iteration: number): Promise<void> {
    this.iterationCount = iteration;
    const iterationStart = performance.now();

    try {
      // Run the test function
      await test.test();

      const iterationEnd = performance.now();
      const duration = iterationEnd - iterationStart;
      const currentMemory = this.getMemoryUsage();

      // Check for potential memory leak
      if (this.checkForLeak(currentMemory)) {
        this.recordEvent('warning', `Potential memory leak detected at iteration ${iteration}`, {
          growth: (currentMemory.heapUsed - this.baselineMemory.heapUsed) / 1024 / 1024
        });
      }

      // Take snapshot if needed
      if (iteration % this.options.snapshotInterval === 0) {
        this.takeSnapshot(`iteration-${iteration}`);
      }

      // Log progress
      if (this.options.verbose && iteration % 10 === 0) {
        const growth = (currentMemory.heapUsed - this.baselineMemory.heapUsed) / 1024 / 1024;
        this.log(`Iteration ${iteration}: Heap growth: ${growth.toFixed(2)} MB, Duration: ${duration.toFixed(2)}ms`);
      }

      this.emit('iteration', { iteration, duration, memory: currentMemory });

    } catch (error) {
      this.recordEvent('error', `Test iteration ${iteration} failed: ${error}`, { iteration, error });
      throw error;
    }
  }

  /**
   * Run memory leak tests
   */
  async runTests(tests: LeakageTest[]): Promise<MemoryTestResult> {
    this.log(`Starting memory leak testing with ${tests.length} test(s)...`);
    this.log(`Options: ${JSON.stringify(this.options, null, 2)}`);

    this.testStartTime = performance.now();
    this.baselineMemory = this.getMemoryUsage();
    this.peakMemory = { ...this.baselineMemory };

    // Take initial snapshot
    this.takeSnapshot('initial');

    try {
      const testPromises = tests.map(async (test, index) => {
        this.log(`Running test: ${test.name}`);

        for (let i = 1; i <= this.options.iterations; i++) {
          await this.runIteration(test, (index * this.options.iterations) + i);

          // Optional cleanup
          if (test.cleanup) {
            try {
              await test.cleanup();
            } catch (cleanupError) {
              this.log(`Cleanup failed for test ${test.name}: ${cleanupError}`, 'warning');
            }
          }

          // Force GC periodically
          if (i % 50 === 0) {
            this.forceGC();
          }
        }
      });

      await Promise.all(testPromises);

    } catch (error) {
      this.log(`Test execution failed: ${error}`, 'error');
      throw error;
    }

    // Take final snapshot
    this.takeSnapshot('final');

    const endTime = performance.now();
    const duration = endTime - this.testStartTime;
    const finalMemory = this.getMemoryUsage();
    const memoryGrowth = (finalMemory.heapUsed - this.baselineMemory.heapUsed) / 1024 / 1024;
    const hasLeak = memoryGrowth > this.options.leakThreshold;

    if (hasLeak) {
      this.log(`WARNING: Memory leak detected! Growth: ${memoryGrowth.toFixed(2)} MB`, 'warning');
    } else {
      this.log(`No significant memory leak detected. Growth: ${memoryGrowth.toFixed(2)} MB`, 'info');
    }

    const result: MemoryTestResult = {
      iterations: this.iterationCount,
      duration,
      initialMemory: this.baselineMemory,
      finalMemory,
      peakMemory: this.peakMemory,
      memoryGrowth,
      hasLeak,
      leakThreshold: this.options.leakThreshold,
      snapshots: this.snapshots,
      events: this.events
    };

    this.emit('complete', result);
    return result;
  }

  /**
   * Get current memory information
   */
  getMemoryInfo(): {
    current: MemoryUsage;
    baseline: MemoryUsage;
    peak: MemoryUsage;
    snapshots: string[];
    events: MemoryEvent[];
  } {
    return {
      current: this.getMemoryUsage(),
      baseline: this.baselineMemory,
      peak: this.peakMemory,
      snapshots: [...this.snapshots],
      events: [...this.events]
    };
  }

  /**
   * Reset the tester state
   */
  reset(): void {
    this.baselineMemory = this.getMemoryUsage();
    this.peakMemory = { ...this.baselineMemory };
    this.snapshots = [];
    this.events = [];
    this.iterationCount = 0;
    this.testStartTime = 0;
  }
}

/**
 * Convenience function to run memory leak tests
 */
export async function testForLeaks(
  tests: LeakageTest[],
  options: TestOptions = {}
): Promise<MemoryTestResult> {
  const tester = new MemoryLeakTester(options);
  return await tester.runTests(tests);
}

/**
 * Create a simple memory test
 */
export function createTest(
  name: string,
  testFn: () => Promise<void> | void,
  cleanupFn?: () => Promise<void> | void
): LeakageTest {
  return { name, test: testFn, cleanup: cleanupFn };
}

// Export default instance
export const defaultTester = new MemoryLeakTester();