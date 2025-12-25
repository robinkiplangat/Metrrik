/**
 * LLM Cache Service
 * Provides caching for LLM responses and embeddings
 * Uses in-memory cache with optional Redis backend
 */

import type { LLMResponse, CacheConfig } from '../../../shared/llm/types';

interface CacheEntry {
  response: LLMResponse;
  timestamp: number;
  ttl: number;
}

export class LLMCache {
  private static instance: LLMCache;
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private redisClient: any = null; // Optional Redis client

  private constructor() {
    this.config = {
      enabled: process.env.LLM_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.LLM_CACHE_TTL || '3600'),
      keyPrefix: 'llm:',
      maxSize: parseInt(process.env.LLM_CACHE_MAX_SIZE || '100') // MB
    };

    // Try to initialize Redis if available
    this.initializeRedis();
  }

  public static getInstance(): LLMCache {
    if (!LLMCache.instance) {
      LLMCache.instance = new LLMCache();
    }
    return LLMCache.instance;
  }

  /**
   * Initialize Redis client if available
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Check if Redis is configured
      if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        // Redis would be imported here if available
        // For now, we'll use in-memory cache
        // const Redis = require('ioredis');
        // this.redisClient = new Redis(process.env.REDIS_URL);
      }
    } catch (error) {
      // Redis not available, use in-memory cache
      console.log('Redis not available, using in-memory cache');
    }
  }

  /**
   * Get a cached response
   */
  public async get(key: string): Promise<LLMResponse | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      if (this.redisClient) {
        return await this.getFromRedis(key);
      } else {
        return this.getFromMemory(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set a cached response
   */
  public async set(
    key: string,
    response: LLMResponse,
    ttl?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const cacheTTL = ttl || this.config.ttl;

    try {
      if (this.redisClient) {
        await this.setInRedis(key, response, cacheTTL);
      } else {
        this.setInMemory(key, response, cacheTTL);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete a cached entry
   */
  public async delete(key: string): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.cache.delete(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    try {
      if (this.redisClient) {
        const keys = await this.redisClient.keys(`${this.config.keyPrefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } else {
        this.cache.clear();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    hitRate: number;
    enabled: boolean;
  } {
    // This would track hits/misses in a real implementation
    return {
      size: this.cache.size,
      hitRate: 0, // Would be calculated from hit/miss tracking
      enabled: this.config.enabled
    };
  }

  /**
   * Get from memory cache
   */
  private getFromMemory(key: string): LLMResponse | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  /**
   * Set in memory cache
   */
  private setInMemory(
    key: string,
    response: LLMResponse,
    ttl: number
  ): void {
    // Check cache size limit
    if (this.config.maxSize) {
      const currentSize = this.estimateCacheSize();
      const entrySize = this.estimateEntrySize(response);
      
      if (currentSize + entrySize > this.config.maxSize * 1024 * 1024) {
        // Evict oldest entries
        this.evictOldest();
      }
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get from Redis (placeholder)
   */
  private async getFromRedis(key: string): Promise<LLMResponse | null> {
    // Would implement Redis get here
    // const data = await this.redisClient.get(key);
    // return data ? JSON.parse(data) : null;
    return null;
  }

  /**
   * Set in Redis (placeholder)
   */
  private async setInRedis(
    key: string,
    response: LLMResponse,
    ttl: number
  ): Promise<void> {
    // Would implement Redis set here
    // await this.redisClient.setex(key, ttl, JSON.stringify(response));
  }

  /**
   * Estimate cache size in bytes
   */
  private estimateCacheSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += this.estimateEntrySize(entry.response);
    }
    return size;
  }

  /**
   * Estimate entry size in bytes
   */
  private estimateEntrySize(response: LLMResponse): number {
    // Rough estimation: 2 bytes per character
    return (
      response.text.length * 2 +
      JSON.stringify(response.metadata || {}).length * 2 +
      200 // Overhead
    );
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    // Remove 10% of oldest entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Clean up expired entries
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const llmCache = LLMCache.getInstance();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    llmCache.cleanup();
  }, 5 * 60 * 1000);
}

