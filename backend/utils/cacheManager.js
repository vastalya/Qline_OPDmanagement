/**
 * Cache Manager — In-Memory Only (Redis removed)
 * Uses node-cache for per-process memory caching.
 * No Redis dependency. All persistent data lives in MongoDB.
 */
const NodeCache = require('node-cache');
const logger = require('./logger');

const memoryCache = new NodeCache({
    stdTTL: 300,      // 5 minutes default
    checkperiod: 60,  // Cleanup every minute
    maxKeys: parseInt(process.env.MEMORY_CACHE_MAX_SIZE) || 1000
});

class CacheManager {
    constructor() {
        this.stats = { hits: 0, misses: 0 };
    }

    async get(key) {
        const value = memoryCache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            logger.debug(`Cache HIT: ${key}`);
            return value;
        }
        this.stats.misses++;
        logger.debug(`Cache MISS: ${key}`);
        return null;
    }

    async set(key, value, options = {}) {
        const { ttl = 300 } = options;
        memoryCache.set(key, value, ttl);
    }

    async delete(key) {
        memoryCache.del(key);
    }

    async invalidateByTag(tag) {
        // Simple pattern-based invalidation from memory keys
        const keys = memoryCache.keys().filter(k => k.includes(tag));
        keys.forEach(k => memoryCache.del(k));
        logger.debug(`Invalidated ${keys.length} keys for tag: ${tag}`);
    }

    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;
        return {
            ...this.stats,
            total,
            hitRate: `${hitRate}%`,
            memoryKeys: memoryCache.keys().length
        };
    }
}

module.exports = new CacheManager();
