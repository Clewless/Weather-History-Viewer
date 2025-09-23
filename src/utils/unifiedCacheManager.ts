/**
 * Unified Cache Manager
 * A single, comprehensive cache solution that works in both frontend and server environments
 * Combines the best features from all existing cache implementations
 */

import { CacheStats } from '../types';

import { getCurrentTimestamp } from './dateUtils';

export interface CacheItem<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
  createdAt: number;
}


export class UnifiedCacheManager<T> {
  #cache: Map<string, CacheItem<T>>;
  #defaultTTL: number; // in milliseconds
  #maxSize: number;
  #cleanupInterval: number; // in milliseconds
  #cleanupTimer: NodeJS.Timeout | null;
  #hitCount: number;
  #missCount: number;
  #accessOrder: string[]; // Track access order for efficient LRU eviction
  #itemsToCleanup: Set<string>;

  /**
   * Creates a new cache manager instance
   * @param defaultTTL Default time-to-live for cache items in milliseconds
   * @param maxSize Maximum number of items to store in the cache
   * @param cleanupInterval Interval for automatic cleanup of expired items in milliseconds
   */
  constructor(defaultTTL: number = 5 * 60 * 1_000, maxSize: number = 1_000, cleanupInterval: number = 60 * 1_000) {
    this.#cache = new Map();
    this.#defaultTTL = defaultTTL;
    this.#maxSize = maxSize;
    this.#cleanupInterval = cleanupInterval;
    this.#cleanupTimer = null;
    this.#hitCount = 0;
    this.#missCount = 0;
    this.#accessOrder = [];
    this.#itemsToCleanup = new Set();

    // Start automatic cleanup
    this.#startCleanup();
  }

  /**
   * Gets an item from the cache
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  get(key: string): T | null {
    const item = this.#cache.get(key);

    if (!item) {
      this.#missCount++;
      return null;
    }

    // Check if expired
    if (getCurrentTimestamp() > item.expiry) {
      this.#cache.delete(key);
      this.#removeFromAccessOrder(key);
      this.#itemsToCleanup.delete(key);
      this.#missCount++;
      return null;
    }

    // Update last accessed time and move to end of access order
    item.lastAccessed = getCurrentTimestamp();
    this.#moveToEndOfAccessOrder(key);
    this.#hitCount++;
    return item.data;
  }

  /**
   * Sets an item in the cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key: string, data: T, ttl?: number): void {
    const now = getCurrentTimestamp();
    
    // Validate and normalize TTL
    const normalizedTtl = ttl ?? this.#defaultTTL;
    if (normalizedTtl <= 0) {
      throw new Error('TTL must be greater than 0');
    }
    
    const expiry = now + normalizedTtl;

    // Check if we need to evict items to stay within size limit
    if (this.#cache.size >= this.#maxSize) {
      this.#evictOldest();
    }

    // If item already exists, update it and move to end of access order
    if (this.#cache.has(key)) {
      this.#moveToEndOfAccessOrder(key);
    } else {
      // New item - add to end of access order
      this.#accessOrder.push(key);
    }

    this.#cache.set(key, {
      data,
      expiry,
      lastAccessed: now,
      createdAt: now
    });
    if (expiry - now <= this.#cleanupInterval) {
      this.#itemsToCleanup.add(key);
    }
  }

  /**
   * Deletes an item from the cache
   * @param key Cache key
   * @returns True if the item was deleted, false if it didn't exist
   */
  delete(key: string): boolean {
    const deleted = this.#cache.delete(key);
    if (deleted) {
      this.#removeFromAccessOrder(key);
      this.#itemsToCleanup.delete(key);
    }
    return deleted;
  }

  /**
   * Checks if an item exists in the cache and is not expired
   * @param key Cache key
   * @returns True if item exists and is not expired
   */
  has(key: string): boolean {
    const item = this.#cache.get(key);
    if (!item) {
      return false;
    }

    if (getCurrentTimestamp() > item.expiry) {
      this.#cache.delete(key);
      this.#removeFromAccessOrder(key);
      this.#itemsToCleanup.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clears all items from the cache
   */
  clear(): void {
    this.#cache.clear();
    this.#accessOrder = [];
    this.#itemsToCleanup.clear();
    this.#hitCount = 0;
    this.#missCount = 0;
  }

  /**
   * Gets the number of items in the cache
   * @returns Number of items in the cache
   */
  size(): number {
    return this.#cache.size;
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics object
   */
  getStats(): CacheStats {
    const totalRequests = this.#hitCount + this.#missCount;
    const hitRate = totalRequests > 0 ? (this.#hitCount / totalRequests) * 100 : 0;

    return {
      hits: this.#hitCount,
      misses: this.#missCount,
      size: this.#cache.size,
      maxSize: this.#maxSize,
      ttl: this.#defaultTTL,
      cleanupInterval: this.#cleanupInterval,
      hitRate
    };
  }

  /**
   * Manually triggers cleanup of expired items
   * @returns Number of items removed
   */
  cleanup(): number {
    let count = 0;
    const now = getCurrentTimestamp();

    // If we have items to cleanup, only check those
    if (this.#itemsToCleanup.size > 0) {
      for (const key of this.#itemsToCleanup) {
        const item = this.#cache.get(key);
        if (item && now > item.expiry) {
          this.#cache.delete(key);
          this.#removeFromAccessOrder(key);
          this.#itemsToCleanup.delete(key);
          count++;
        } else if (item) {
          // Remove from cleanup list if not expired
          this.#itemsToCleanup.delete(key);
        }
      }
    } else {
      // Fallback to checking all items if cleanup list is empty
      for (const [key, item] of this.#cache.entries()) {
        if (now > item.expiry) {
          this.#cache.delete(key);
          this.#removeFromAccessOrder(key);
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Starts the automatic cleanup process
   */
  #startCleanup(): void {
    // Clear any existing timer
    if (this.#cleanupTimer) {
      clearInterval(this.#cleanupTimer);
    }

    // Start new cleanup interval using logical assignment for clarity
    this.#cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.#cleanupInterval);
  }

  /**
   * Stops the automatic cleanup process
   */
  stopCleanup(): void {
    if (this.#cleanupTimer) {
      clearInterval(this.#cleanupTimer);
      this.#cleanupTimer = null;
    }
  }

  /**
   * Helper method to remove a key from access order array
   * @param key Key to remove
   */
  #removeFromAccessOrder(key: string): void {
    const index = this.#accessOrder.indexOf(key);
    if (index > -1) {
      this.#accessOrder.splice(index, 1);
    }
  }

  /**
   * Helper method to move a key to the end of access order (most recently used)
   * @param key Key to move
   */
  #moveToEndOfAccessOrder(key: string): void {
    this.#removeFromAccessOrder(key);
    this.#accessOrder.push(key);
  }

  /**
   * Evicts the oldest item based on last accessed time - O(1) operation
   */
  #evictOldest(): void {
    if (this.#accessOrder.length === 0) {
      return;
    }

    // Remove the oldest item (first in access order)
    const oldestKey = this.#accessOrder.shift();
    if (oldestKey) {
      this.#cache.delete(oldestKey);
      this.#itemsToCleanup.delete(oldestKey);
    }
  }
}

/**
 * Namespace-based cache manager that uses a single UnifiedCacheManager instance
 */
export class NamespaceCacheManager<T> {
  private cache: UnifiedCacheManager<T>;

  constructor(ttl: number, max: number, cleanupInterval: number) {
    this.cache = new UnifiedCacheManager<T>(ttl, max, cleanupInterval);
  }

  /**
   * Gets a value from the cache
   * @param namespace The namespace for the cache
   * @param key The key for the cache entry
   * @returns The cached value, or undefined if it doesn't exist
   */
  get(namespace: string, key: string): T | undefined {
    return this.cache.get(`${namespace}:${key}`) ?? undefined;
  }

  /**
   * Sets a value in the cache
   * @param namespace The namespace for the cache
   * @param key The key for the cache entry
   * @param value The value to cache
   */
  set(namespace: string, key: string, value: T): void {
    this.cache.set(`${namespace}:${key}`, value);
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the cache statistics
   * @returns The cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Stops the cache cleanup interval
   */
  stopCleanup(): void {
    this.cache.stopCleanup();
  }
}
