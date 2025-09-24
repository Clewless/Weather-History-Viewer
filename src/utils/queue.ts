/**
 * Queue utility using p-queue for reliable async operations
 * Provides rate limiting and concurrency control for API calls and other async operations
 */

import PQueue from 'p-queue';

import { validateString, validateFunction } from './invariants';

// Memory monitoring interfaces
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  queueName: string;
  activeTasks: number;
  pendingTasks: number;
}

export interface LeakDetectionConfig {
  enabled: boolean;
  memoryThreshold: number; // MB
  taskThreshold: number; // max tasks before cleanup
  cleanupInterval: number; // ms
  enableAutoCleanup: boolean;
}

export interface QueueMemoryStats {
  queueName: string;
  snapshots: MemorySnapshot[];
  memoryGrowth: number;
  averageTaskMemory: number;
  leakSuspected: boolean;
  lastCleanupTime: number;
}

/**
 * Queue manager for different types of operations with built-in leak prevention
 */
export class QueueManager {
  private queues: Map<string, PQueue> = new Map();
  private memorySnapshots: Map<string, MemorySnapshot[]> = new Map();
  private leakDetectionConfig: LeakDetectionConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private lastMemoryCheck: number = 0;

  constructor(leakDetectionConfig: Partial<LeakDetectionConfig> = {}) {
    this.leakDetectionConfig = {
      enabled: true,
      memoryThreshold: 100, // 100MB default
      taskThreshold: 1000, // 1000 tasks
      cleanupInterval: 30000, // 30 seconds
      enableAutoCleanup: true,
      ...leakDetectionConfig
    };

    if (this.leakDetectionConfig.enabled) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Get or create a queue for a specific operation type with leak prevention
   */
  getQueue(queueName: string, options: Partial<ConstructorParameters<typeof PQueue>[0]> = {}): PQueue {
    validateString(queueName, 'queueName');

    if (!this.queues.has(queueName)) {
      // Default options with sensible defaults
      const defaultOptions = {
        concurrency: 3,
        interval: 1000,
        intervalCap: 1,
        timeout: 30000,
        throwOnTimeout: true,
        ...options
      };

      const queue = new PQueue(defaultOptions);

      // Add error handling with leak detection
      queue.on('error', (error) => {
        console.error(`Queue error in ${queueName}:`, error);
        this.handleQueueError(queueName, error);
      });

      // Add completion tracking for memory monitoring
      queue.on('completed', () => {
        this.recordMemorySnapshot(queueName);
      });

      this.queues.set(queueName, queue);
      this.memorySnapshots.set(queueName, []);
    }

    return this.queues.get(queueName)!;
  }

  /**
   * Start memory monitoring and leak detection
   */
  private startMemoryMonitoring(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performMemoryCheck();
    }, this.leakDetectionConfig.cleanupInterval);
  }

  /**
   * Record memory snapshot for a queue
   */
  private recordMemorySnapshot(queueName: string): void {
    if (!this.leakDetectionConfig.enabled) return;

    const queue = this.queues.get(queueName);
    if (!queue) return;

    // Check if we're in a Node.js environment
    const memoryUsage = typeof process !== 'undefined' && process.memoryUsage
      ? process.memoryUsage()
      : { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 };
    const snapshots = this.memorySnapshots.get(queueName) || [];

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      queueName,
      activeTasks: queue.size,
      pendingTasks: queue.pending
    };

    snapshots.push(snapshot);

    // Keep only last 100 snapshots to prevent memory growth
    if (snapshots.length > 100) {
      snapshots.shift();
    }

    this.memorySnapshots.set(queueName, snapshots);
  }

  /**
   * Perform memory check and leak detection
   */
  private performMemoryCheck(): void {
    if (!this.leakDetectionConfig.enabled) return;

    // Check if we're in a Node.js environment
    const currentMemory = typeof process !== 'undefined' && process.memoryUsage
      ? process.memoryUsage()
      : { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 };
    const heapUsedMB = currentMemory.heapUsed / 1024 / 1024;

    // Check memory pressure
    if (heapUsedMB > this.leakDetectionConfig.memoryThreshold) {
      console.warn(`[QUEUE LEAK DETECTION] High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
      this.handleMemoryPressure();
    }

    // Check for queue buildup
    for (const [queueName, queue] of this.queues.entries()) {
      if (queue.size + queue.pending > this.leakDetectionConfig.taskThreshold) {
        console.warn(`[QUEUE LEAK DETECTION] Queue ${queueName} has ${queue.size + queue.pending} tasks, considering cleanup`);
        this.handleQueueBuildup(queueName);
      }
    }
  }

  /**
   * Handle memory pressure situation
   */
  private handleMemoryPressure(): void {
    console.log('[QUEUE LEAK DETECTION] Initiating memory pressure response...');

    // Pause non-critical queues
    for (const [queueName, queue] of this.queues.entries()) {
      if (!this.isCriticalQueue(queueName) && !queue.isPaused) {
        queue.pause();
        console.log(`[QUEUE LEAK DETECTION] Paused queue ${queueName} due to memory pressure`);
      }
    }

    // Force garbage collection if available (Node.js only)
    if (typeof global !== 'undefined' && typeof global.gc === 'function') {
      global.gc();
    }

    // Schedule cleanup
    setTimeout(() => {
      this.resumeQueuesAfterCleanup();
    }, 5000);
  }

  /**
   * Handle queue buildup
   */
  private handleQueueBuildup(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue || queue.isPaused) return;

    if (this.leakDetectionConfig.enableAutoCleanup) {
      console.log(`[QUEUE LEAK DETECTION] Clearing stale tasks from ${queueName}`);
      queue.clear();
      this.recordMemorySnapshot(queueName);
    }
  }

  /**
   * Handle queue errors with leak detection context
   */
  private handleQueueError(queueName: string, error: Error): void {
    const snapshots = this.memorySnapshots.get(queueName) || [];
    const recentSnapshots = snapshots.slice(-5); // Last 5 snapshots

    if (recentSnapshots.length > 0) {
      const memoryGrowth = recentSnapshots[recentSnapshots.length - 1].heapUsed - recentSnapshots[0].heapUsed;
      console.warn(`[QUEUE LEAK DETECTION] Error in ${queueName} with memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check if this might be a memory-related error
    if (error.message.includes('out of memory') || error.message.includes('heap')) {
      console.error(`[QUEUE LEAK DETECTION] Potential memory-related error in ${queueName}:`, error.message);
    }
  }

  /**
   * Resume queues after cleanup
   */
  private resumeQueuesAfterCleanup(): void {
    for (const [queueName, queue] of this.queues.entries()) {
      if (queue.isPaused && this.isCriticalQueue(queueName)) {
        queue.start();
        console.log(`[QUEUE LEAK DETECTION] Resumed critical queue ${queueName}`);
      }
    }
  }

  /**
   * Determine if a queue is critical (shouldn't be paused)
   */
  private isCriticalQueue(queueName: string): boolean {
    const criticalQueues = ['api-weather', 'api-geocode']; // Add critical queue names
    return criticalQueues.includes(queueName.toLowerCase());
  }

  /**
   * Add a task to the specified queue with leak prevention
   */
  async addTask<T>(
    queueName: string,
    taskId: string,
    taskFn: () => Promise<T>,
    options?: Partial<ConstructorParameters<typeof PQueue>[0]>
  ): Promise<T> {
    validateString(queueName, 'queueName');
    validateString(taskId, 'taskId');
    validateFunction(taskFn, 'taskFn');

    // Record memory before task execution
    const queue = this.getQueue(queueName, options);

    // Wrap task function with memory tracking
    const wrappedTaskFn = async (): Promise<T> => {
      try {
        const result = await taskFn();
        return result;
      } finally {
        // Record memory after task completion
        this.recordMemorySnapshot(queueName);
      }
    };

    const result = await queue.add(wrappedTaskFn, { id: taskId });
    return result as T;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(queueName: string): {
    size: number;
    pending: number;
    paused: boolean;
    concurrency: number;
  } | null {
    validateString(queueName, 'queueName');
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    return {
      size: queue.size,
      pending: queue.pending,
      paused: queue.isPaused,
      concurrency: queue.concurrency
    };
  }

  /**
   * Pause a specific queue
   */
  pauseQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.pause();
      console.log(`Queue ${queueName} paused`);
    }
  }

  /**
   * Resume a specific queue
   */
  resumeQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.start();
      console.log(`Queue ${queueName} resumed`);
    }
  }

  /**
   * Clear all tasks from a queue
   */
  clearQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.clear();
      console.log(`Queue ${queueName} cleared`);
    }
  }

  /**
   * Get all queue names
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Get memory statistics for a specific queue
   */
  getQueueMemoryStats(queueName: string): QueueMemoryStats | null {
    const snapshots = this.memorySnapshots.get(queueName);
    if (!snapshots || snapshots.length === 0) return null;

    const recentSnapshots = snapshots.slice(-10); // Last 10 snapshots
    const memoryGrowth = snapshots.length > 1
      ? snapshots[snapshots.length - 1].heapUsed - snapshots[0].heapUsed
      : 0;

    const averageTaskMemory = recentSnapshots.reduce((sum, snap) => {
      return sum + (snap.activeTasks + snap.pendingTasks);
    }, 0) / recentSnapshots.length;

    const leakSuspected = memoryGrowth > (this.leakDetectionConfig.memoryThreshold * 1024 * 1024);

    return {
      queueName,
      snapshots: recentSnapshots,
      memoryGrowth,
      averageTaskMemory,
      leakSuspected,
      lastCleanupTime: this.lastMemoryCheck
    };
  }

  /**
   * Get overall memory statistics for all queues
   */
  getAllMemoryStats(): {
    totalQueues: number;
    totalMemoryGrowth: number;
    suspectedLeaks: number;
    queuesWithPressure: string[];
  } {
    const allStats = Array.from(this.queues.keys()).map(name => this.getQueueMemoryStats(name)).filter(Boolean) as QueueMemoryStats[];

    const totalMemoryGrowth = allStats.reduce((sum, stats) => sum + stats.memoryGrowth, 0);
    const suspectedLeaks = allStats.filter(stats => stats.leakSuspected).length;
    const queuesWithPressure = allStats.filter(stats => stats.leakSuspected).map(stats => stats.queueName);

    return {
      totalQueues: this.queues.size,
      totalMemoryGrowth,
      suspectedLeaks,
      queuesWithPressure
    };
  }

  /**
   * Update leak detection configuration
   */
  updateLeakDetectionConfig(config: Partial<LeakDetectionConfig>): void {
    this.leakDetectionConfig = { ...this.leakDetectionConfig, ...config };

    if (this.leakDetectionConfig.enabled && !this.cleanupTimer) {
      this.startMemoryMonitoring();
    } else if (!this.leakDetectionConfig.enabled && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Manually trigger memory check
   */
  triggerMemoryCheck(): void {
    this.performMemoryCheck();
  }

  /**
   * Force cleanup of all queues
   */
  forceCleanup(): void {
    console.log('[QUEUE LEAK DETECTION] Forcing cleanup of all queues...');

    for (const [queueName, queue] of this.queues.entries()) {
      if (queue.size > 0 || queue.pending > 0) {
        console.log(`[QUEUE LEAK DETECTION] Clearing queue ${queueName} (${queue.size + queue.pending} tasks)`);
        queue.clear();
      }
    }

    // Force garbage collection if available (Node.js only)
    if (typeof global !== 'undefined' && typeof global.gc === 'function') {
      global.gc();
    }

    this.recordMemorySnapshot('cleanup-all');
  }

  /**
   * Get current leak detection configuration
   */
  getLeakDetectionConfig(): LeakDetectionConfig {
    return { ...this.leakDetectionConfig };
  }

  /**
   * Shutdown the queue manager and cleanup resources
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear all queues
    for (const queue of this.queues.values()) {
      queue.clear();
      queue.pause();
    }

    this.queues.clear();
    this.memorySnapshots.clear();
  }
}

// Default leak detection configuration
const DEFAULT_LEAK_CONFIG: Partial<LeakDetectionConfig> = {
  enabled: true,
  memoryThreshold: 100, // 100MB
  taskThreshold: 1000, // 1000 tasks
  cleanupInterval: 30000, // 30 seconds
  enableAutoCleanup: true
};

// Singleton instance with leak detection enabled by default
export const queueManager = new QueueManager(DEFAULT_LEAK_CONFIG);

/**
 * Integration function to connect queue leak detection with MemoryLeakTester
 * This allows the existing memory testing infrastructure to monitor queue health
 */
// /**
//  * Integration function to connect queue leak detection with MemoryLeakTester
//  * This allows the existing memory testing infrastructure to monitor queue health
//  */
// export async function integrateQueueWithMemoryTester(): Promise<void> {
//   try {
//     // Only execute in Node.js environment where memory-leak-tester is available
//     if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
//       // Use a dynamic import string to avoid webpack static analysis
//       const modulePath = '../memory-leak-tester';
//       const { MemoryLeakTester } = await import(modulePath);

//       const memoryTester = new MemoryLeakTester({
//         iterations: 100,
//         leakThreshold: 50, // 50MB for queue monitoring
//         snapshotInterval: 10,
//         verbose: true
//       });

//       // Set up event listeners for queue memory events
//       memoryTester.on('warning', (event) => {
//         console.warn(`[QUEUE-MEMORY INTEGRATION] Memory warning: ${event.message}`);
//         // Trigger queue memory check
//         queueManager.triggerMemoryCheck();
//       });

//       memoryTester.on('error', (event) => {
//         console.error(`[QUEUE-MEMORY INTEGRATION] Memory error: ${event.message}`);
//         // Force queue cleanup on critical memory errors
//         queueManager.forceCleanup();
//       });

//       console.log('[QUEUE-MEMORY INTEGRATION] Successfully integrated queue leak detection with MemoryLeakTester');
//     } else {
//       console.log('[QUEUE-MEMORY INTEGRATION] Skipping memory-leak-tester integration (not in Node.js environment)');
//     }
//   } catch (error) {
//     console.warn('[QUEUE-MEMORY INTEGRATION] Failed to integrate with MemoryLeakTester:', error);
//   }
// }

/**
 * Enhanced API task function with integrated memory monitoring
 * This provides a higher-level interface that combines queue management with memory testing
 */
export async function addApiTaskWithMemoryCheck<T>(
  taskName: string,
  taskFn: () => Promise<T>,
  queueType: keyof typeof QUEUES = 'API_WEATHER',
  enableMemoryCheck: boolean = true
): Promise<T> {
  const result = await addApiTask(taskName, taskFn, queueType);

  // Optionally trigger memory check after task completion
  if (enableMemoryCheck) {
    // Use setTimeout with 0 delay for next tick
    setTimeout(() => {
      queueManager.triggerMemoryCheck();
    }, 0);
  }

  return result;
}

// Predefined queues for common operations
export const QUEUES = {
  API_SEARCH: 'api-search',
  API_WEATHER: 'api-weather',
  API_GEOCODE: 'api-geocode',
  MEMORY_TEST: 'memory-test',
  LOAD_TEST: 'load-test'
} as const;

/**
 * Convenience function for adding API tasks with appropriate rate limiting
 */
export function addApiTask<T>(
  taskName: string,
  taskFn: () => Promise<T>,
  queueType: keyof typeof QUEUES = 'API_WEATHER'
): Promise<T> {
  const queueOptions = getQueueOptionsForType(queueType);
  return queueManager.addTask(queueType, taskName, taskFn, queueOptions);
}

/**
 * Get appropriate queue options for different operation types
 */
function getQueueOptionsForType(queueType: keyof typeof QUEUES): Partial<ConstructorParameters<typeof PQueue>[0]> {
  switch (queueType) {
    case 'API_SEARCH':
      return {
        concurrency: 2,     // Lower concurrency for search operations
        interval: 1500,     // 1.5 seconds between search requests
        intervalCap: 1
      };

    case 'API_WEATHER':
      return {
        concurrency: 3,     // Moderate concurrency for weather data
        interval: 1000,     // 1 second between weather requests
        intervalCap: 1
      };

    case 'API_GEOCODE':
      return {
        concurrency: 2,     // Lower concurrency for geocoding
        interval: 2000,     // 2 seconds between geocode requests
        intervalCap: 1
      };

    case 'MEMORY_TEST':
      return {
        concurrency: 1,     // Sequential memory tests
        interval: 500,      // 500ms between memory operations
        intervalCap: 1
      };

    case 'LOAD_TEST':
      return {
        concurrency: 5,     // Higher concurrency for load testing
        interval: 100,      // Fast intervals for load testing
        intervalCap: 2      // Allow burst of 2 operations
      };

    default:
      return {
        concurrency: 3,
        interval: 1000,
        intervalCap: 1,
        timeout: 30000,
        throwOnTimeout: true
      };
  }
}

/**
 * Enhanced error handling for queued operations
 */
export class QueueError extends Error {
  constructor(
    message: string,
    public readonly queueName: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'QueueError';
  }
}

/**
 * Retry configuration for failed operations
 */
export interface RetryConfig {
  retries?: number;
  backoff?: 'fixed' | 'exponential' | 'linear';
  delay?: number;
  maxDelay?: number;
}

/**
 * Execute a task with retry logic
 */
export async function executeWithRetry<T>(
  taskFn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    retries = 3,
    backoff = 'exponential',
    delay = 1000,
    maxDelay = 10000
  } = config;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await taskFn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === retries) {
        break; // Don't retry on last attempt
      }

      // Calculate delay based on backoff strategy
      let retryDelay = delay;
      if (backoff === 'exponential') {
        retryDelay = Math.min(delay * Math.pow(2, attempt), maxDelay);
      } else if (backoff === 'linear') {
        retryDelay = Math.min(delay * (attempt + 1), maxDelay);
      }

      console.warn(`Task failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${retryDelay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new QueueError(
    `Task failed after ${retries + 1} attempts`,
    'retry-wrapper',
    lastError
  );
}