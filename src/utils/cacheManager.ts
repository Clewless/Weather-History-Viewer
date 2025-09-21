/**
 * Cache utility with automatic cleanup for frontend applications
 */

import { getCurrentTimestamp } from './dateUtils';

export interface CacheItem<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
}

export class CacheManager<T> {
  private cache: Map<string, CacheItem<T>>;
  private defaultTTL: number; // in milliseconds
  private maxSize: number;
  private cleanupInterval: number; // in milliseconds
  private cleanupTimer: number | null;

  constructor(defaultTTL: number = 5 * 60 * 1000, maxSize: number = 100, cleanupInterval: number = 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this.cleanupInterval = cleanupInterval;
    this.cleanupTimer = null;
    
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
      return null;
    }
    
    // Check if expired
    if (getCurrentTimestamp() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Update last accessed time
    item.lastAccessed = getCurrentTimestamp();
    return item.data;
  }

  /**
   * Set an item in the cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key: string, data: T, ttl?: number): void {
    const expiry = getCurrentTimestamp() + (ttl ?? this.defaultTTL);
    
    // Check if we need to evict items to stay within size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      expiry,
      lastAccessed: getCurrentTimestamp()
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
  getStats(): { size: number; maxSize: number; defaultTTL: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
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
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop automatic cleanup process
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      window.clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Evict the oldest item based on last accessed time
   */
  private evictOldest(): void {
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
}