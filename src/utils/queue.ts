/**
 * Queue utility using p-queue for reliable async operations
 * Provides rate limiting and concurrency control for API calls and other async operations
 */

import PQueue from 'p-queue';

/**
 * Queue manager for different types of operations
 */
export class QueueManager {
  private queues: Map<string, PQueue> = new Map();

  /**
   * Get or create a queue for a specific operation type
   */
  getQueue(queueName: string, options: Partial<ConstructorParameters<typeof PQueue>[0]> = {}): PQueue {
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

      // Add error handling
      queue.on('error', (error) => {
        console.error(`Queue error in ${queueName}:`, error);
      });

      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName)!;
  }

  /**
   * Add a task to the specified queue
   */
  async addTask<T>(
    queueName: string,
    taskId: string,
    taskFn: () => Promise<T>,
    options?: Partial<ConstructorParameters<typeof PQueue>[0]>
  ): Promise<T> {
    const queue = this.getQueue(queueName, options);
    const result = await queue.add(taskFn, { id: taskId });
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
}

// Singleton instance
export const queueManager = new QueueManager();

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