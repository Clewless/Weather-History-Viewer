/**
 * Simple Cache Manager - A lightweight replacement for the overly complex unifiedCacheManager
 * This provides basic caching functionality suitable for a weather application
 */

export interface CacheItem<T> {
  data: T;
  expiry: number;
}

export class SimpleCacheManager<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private defaultTTL: number; // in milliseconds

  /**
   * Creates a new simple cache manager instance
   * @param defaultTTL Default time-to-live for cache items in milliseconds
   */
  constructor(defaultTTL: number = 5 * 60 * 1_000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Gets an item from the cache
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Sets an item in the cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key: string, data: T, ttl?: number): void {
    const ttlToUse = ttl ?? this.defaultTTL;
    const expiry = Date.now() + ttlToUse;

    this.cache.set(key, {
      data,
      expiry
    });
  }

  /**
   * Deletes an item from the cache
   * @param key Cache key
   * @returns True if the item was deleted, false if it didn't exist
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Checks if an item exists in the cache and is not expired
   * @param key Cache key
   * @returns True if item exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clears all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the number of items in the cache
   * @returns Number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }
}