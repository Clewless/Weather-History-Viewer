/**
 * Server-side cache utility for caching API responses
 */

export interface CacheItem<T> {
  data: T;
  expiry: number;
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

  constructor(defaultTTL: number = 5 * 60 * 1000, maxSize: number = 1000, cleanupInterval: number = 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this.cleanupInterval = cleanupInterval;
    this.cleanupTimer = null;
    this.hitCount = 0;
    this.missCount = 0;
    
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
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
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
    const now = Date.now();
    const expiry = now + (ttl ?? this.defaultTTL);
    
    // Check if we need to evict items to stay within size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      expiry,
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
    
    if (Date.now() > item.expiry) {
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
    const now = Date.now();
    
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
   * Evict the least recently used item (oldest created item)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}