/**
 * Unified cache manager that works in both frontend and server environments
 * with configurable eviction strategies and enhanced statistics
 */

import { getCurrentTimestamp } from './dateUtils';

export interface CacheItem<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
  createdAt: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  defaultTTL: number;
  hitCount?: number;
  missCount?: number;
  hitRate?: number;
}

export interface CacheOptions {
  defaultTTL?: number;
  maxSize?: number;
  cleanupInterval?: number;
  evictionStrategy?: 'LRU' | 'LFU';
}

export class UnifiedCacheManager<T> {
  private cache: Map<string, CacheItem<T>>;
  private defaultTTL: number;
  private maxSize: number;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | number | null;
  private hitCount: number;
  private missCount: number;
  private evictionStrategy: 'LRU' | 'LFU';

  constructor({
    defaultTTL = 5 * 60 * 1000,
    maxSize = 100,
    cleanupInterval = 60 * 1000,
    evictionStrategy = 'LRU'
  }: CacheOptions = {}) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this.cleanupInterval = cleanupInterval;
    this.cleanupTimer = null;
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionStrategy = evictionStrategy;

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Get an item from the cache
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (getCurrentTimestamp() > item.expiry) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update last accessed time
    item.lastAccessed = getCurrentTimestamp();
    this.hitCount++;
    return item.data;
  }

  /**
   * Set an item in the cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key: string, data: T, ttl?: number): void {
    const now = getCurrentTimestamp();
    const expiry = now + (ttl ?? this.defaultTTL);

    // Check if we need to evict items to stay within size limit
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      data,
      expiry,
      lastAccessed: now,
      createdAt: now
    });
  }

  /**
   * Delete an item from the cache
   * @param key - Cache key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Check if an item exists in the cache and is not expired
   * @param key - Cache key
   * @returns True if item exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (getCurrentTimestamp() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate
    };
  }

  /**
   * Manually trigger cleanup of expired items
   */
  cleanup(): number {
    let count = 0;
    const now = getCurrentTimestamp();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Start automatic cleanup process
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      if (typeof this.cleanupTimer === 'number') {
        window.clearInterval(this.cleanupTimer);
      } else {
        clearInterval(this.cleanupTimer);
      }
    }

    // Use window.setInterval in browser, setInterval in Node.js
    if (typeof window !== 'undefined') {
      this.cleanupTimer = window.setInterval(() => {
        this.cleanup();
      }, this.cleanupInterval);
    } else {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.cleanupInterval);
    }
  }

  /**
   * Stop automatic cleanup process
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      if (typeof this.cleanupTimer === 'number') {
        window.clearInterval(this.cleanupTimer);
      } else {
        clearInterval(this.cleanupTimer);
      }
      this.cleanupTimer = null;
    }
  }

  /**
   * Evict items based on configured strategy
   */
  private evict(): void {
    if (this.evictionStrategy === 'LRU') {
      this.evictLRU();
    } else {
      this.evictLFU();
    }
  }

  /**
   * Evict the least recently used item
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Evict the least frequently used item
   */
  private evictLFU(): void {
    let leastUsedKey: string | null = null;
    let leastAccessCount = Infinity;
    const accessCounts = new Map<string, number>();

    // Count accesses for each item
    for (const [key] of this.cache.entries()) {
      const count = accessCounts.get(key) || 0;
      accessCounts.set(key, count + 1);
    }

    // Find least accessed item
    for (const [key, count] of accessCounts.entries()) {
      if (count < leastAccessCount) {
        leastAccessCount = count;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }
}