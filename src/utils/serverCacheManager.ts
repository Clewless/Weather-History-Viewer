/**
 * Server-side cache utility for caching API responses
 */

import { getCurrentTimestamp } from './dateUtils';

interface CacheItem<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
  createdAt: number;
}

export class ServerCacheManager<T> {
  private cache: Map<string, CacheItem<T>>;
  private defaultTTL: number; // in milliseconds
  private maxSize: number;
  private cleanupInterval: number; // in milliseconds
  private cleanupTimer: NodeJS.Timeout | null;
  private hitCount: number;
  private missCount: number;
  // Keep track of items to clean up to avoid iterating through all items
  private itemsToCleanup: Set<string>;

  constructor(defaultTTL: number = 5 * 60 * 1000, maxSize: number = 1000, cleanupInterval: number = 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this.cleanupInterval = cleanupInterval;
    this.cleanupTimer = null;
    this.hitCount = 0;
    this.missCount = 0;
    this.itemsToCleanup = new Set();
    
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
      this.itemsToCleanup.delete(key);
      this.missCount++;
      return null;
    }
    
    // Update last accessed time for LRU tracking
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
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      expiry,
      lastAccessed: now,
      createdAt: now
    });
    
    // Add to cleanup tracking if it's not already there
    if (getCurrentTimestamp() > expiry) {
      this.itemsToCleanup.add(key);
    }
  }

  /**
   * Delete an item from the cache
   * @param key - Cache key
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.itemsToCleanup.delete(key);
    return result;
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
      this.itemsToCleanup.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
    this.itemsToCleanup.clear();
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
  getStats(): { 
    size: number; 
    maxSize: number; 
    defaultTTL: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  } {
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
    
    // If we have items to cleanup, only check those
    if (this.itemsToCleanup.size > 0) {
      for (const key of this.itemsToCleanup) {
        const item = this.cache.get(key);
        if (item && now > item.expiry) {
          this.cache.delete(key);
          this.itemsToCleanup.delete(key);
          count++;
        } else {
          // Remove from cleanup list if not expired
          this.itemsToCleanup.delete(key);
        }
      }
    } else {
      // Fallback to checking all items if cleanup list is empty
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key);
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Start automatic cleanup process
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop automatic cleanup process
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Evict the least recently used item
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.itemsToCleanup.delete(lruKey);
    }
  }
}