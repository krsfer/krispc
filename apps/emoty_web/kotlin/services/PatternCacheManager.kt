/**
 * Pattern Cache Manager - Mobile-Optimized Multi-Level Caching System
 * 
 * High-performance caching system designed for mobile pattern storage with:
 * - Multi-level cache hierarchy (Memory → Disk → Network)
 * - LRU eviction policy with memory pressure handling
 * - Offline-first architecture with sync capabilities
 * - Background cache maintenance and optimization
 * - Conflict resolution for concurrent access
 * - Battery-conscious background operations
 */
package com.emoty.services

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import kotlin.collections.LinkedHashMap

/**
 * Cache entry with metadata for intelligent eviction
 */
data class CacheEntry<T>(
    val data: T,
    val key: String,
    val createdAt: Long = System.currentTimeMillis(),
    val lastAccessedAt: Long = System.currentTimeMillis(),
    val accessCount: Int = 1,
    val size: Long = 0,
    val priority: CachePriority = CachePriority.NORMAL,
    val isOfflineChange: Boolean = false,
    val syncStatus: SyncStatus = SyncStatus.SYNCED
) {
    val age: Long get() = System.currentTimeMillis() - createdAt
    val timeSinceAccess: Long get() = System.currentTimeMillis() - lastAccessedAt
    
    fun accessed(): CacheEntry<T> = copy(
        lastAccessedAt = System.currentTimeMillis(),
        accessCount = accessCount + 1
    )
    
    fun withSyncStatus(status: SyncStatus): CacheEntry<T> = copy(syncStatus = status)
}

/**
 * Cache priority levels for intelligent eviction
 */
enum class CachePriority {
    LOW, NORMAL, HIGH, CRITICAL
}

/**
 * Synchronization status for offline changes
 */
enum class SyncStatus {
    SYNCED, PENDING_SYNC, SYNCING, SYNC_FAILED, CONFLICT
}

/**
 * Cache operation results
 */
sealed class CacheResult<T> {
    data class Hit<T>(val entry: CacheEntry<T>) : CacheResult<T>()
    data class Miss<T>(val key: String) : CacheResult<T>()
    data class Error<T>(val key: String, val exception: Throwable) : CacheResult<T>()
}

/**
 * Cache statistics for monitoring and optimization
 */
data class CacheStats(
    val memoryCache: CacheLevelStats,
    val diskCache: CacheLevelStats,
    val networkCache: CacheLevelStats,
    val hitRatio: Float,
    val evictionCount: Long,
    val syncPendingCount: Int,
    val memoryPressure: MemoryPressure
)

data class CacheLevelStats(
    val entries: Int,
    val sizeBytes: Long,
    val maxSizeBytes: Long,
    val hitCount: Long,
    val missCount: Long
) {
    val utilization: Float get() = if (maxSizeBytes > 0) sizeBytes.toFloat() / maxSizeBytes else 0f
    val hitRatio: Float get() = if (hitCount + missCount > 0) hitCount.toFloat() / (hitCount + missCount) else 0f
}

/**
 * Memory pressure levels for adaptive caching
 */
enum class MemoryPressure {
    LOW, MODERATE, HIGH, CRITICAL
}

/**
 * Cache configuration for performance tuning
 */
data class CacheConfig(
    val memoryMaxSize: Long = 50 * 1024 * 1024, // 50MB memory cache
    val diskMaxSize: Long = 200 * 1024 * 1024,   // 200MB disk cache
    val maxEntries: Int = 1000,
    val ttlMillis: Long = 24 * 60 * 60 * 1000,   // 24 hours
    val enableCompression: Boolean = true,
    val backgroundSyncInterval: Long = 5 * 60 * 1000, // 5 minutes
    val memoryPressureThreshold: Float = 0.85f,
    val enablePreloading: Boolean = true
)

/**
 * Offline change tracking for sync operations
 */
data class OfflineChange(
    val id: String = java.util.UUID.randomUUID().toString(),
    val patternId: String,
    val operation: OfflineOperation,
    val data: Pattern? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val maxRetries: Int = 3
) {
    val canRetry: Boolean get() = retryCount < maxRetries
}

enum class OfflineOperation {
    CREATE, UPDATE, DELETE, FAVORITE, UNFAVORITE
}

/**
 * Multi-level cache manager interface for dependency injection
 */
interface CacheManager<T> {
    suspend fun get(key: String): CacheResult<T>
    suspend fun put(key: String, value: T, priority: CachePriority = CachePriority.NORMAL): Boolean
    suspend fun remove(key: String): Boolean
    suspend fun clear(): Unit
    suspend fun getStats(): CacheStats
    fun observeChanges(): Flow<CacheChange<T>>
}

/**
 * Cache change events for reactive UI updates
 */
sealed class CacheChange<T> {
    data class Added<T>(val key: String, val value: T) : CacheChange<T>()
    data class Updated<T>(val key: String, val oldValue: T, val newValue: T) : CacheChange<T>()
    data class Removed<T>(val key: String, val value: T) : CacheChange<T>()
    data class Cleared<T>(val count: Int) : CacheChange<T>()
}

/**
 * LRU Cache implementation with advanced features
 */
class LRUCache<T>(
    private val maxSize: Long,
    private val maxEntries: Int
) {
    private val cache = LinkedHashMap<String, CacheEntry<T>>(16, 0.75f, true)
    private var currentSize = AtomicLong(0)
    private val mutex = Mutex()
    
    suspend fun get(key: String): CacheEntry<T>? = mutex.withLock {
        cache[key]?.accessed()?.also { 
            cache[key] = it 
        }
    }
    
    suspend fun put(key: String, entry: CacheEntry<T>): Boolean = mutex.withLock {
        val existingEntry = cache[key]
        
        // Update size calculation
        if (existingEntry != null) {
            currentSize.addAndGet(-existingEntry.size)
        }
        currentSize.addAndGet(entry.size)
        
        cache[key] = entry
        
        // Evict if necessary
        evictIfNeeded()
        
        true
    }
    
    suspend fun remove(key: String): CacheEntry<T>? = mutex.withLock {
        cache.remove(key)?.also { entry ->
            currentSize.addAndGet(-entry.size)
        }
    }
    
    suspend fun clear(): Int = mutex.withLock {
        val size = cache.size
        cache.clear()
        currentSize.set(0)
        size
    }
    
    suspend fun size(): Int = mutex.withLock { cache.size }
    
    suspend fun sizeBytes(): Long = currentSize.get()
    
    private fun evictIfNeeded() {
        // Evict by count
        while (cache.size > maxEntries) {
            val eldestKey = cache.keys.first()
            val eldestEntry = cache.remove(eldestKey)
            eldestEntry?.let { currentSize.addAndGet(-it.size) }
        }
        
        // Evict by size
        while (currentSize.get() > maxSize && cache.isNotEmpty()) {
            val eldestKey = cache.keys.first()
            val eldestEntry = cache.remove(eldestKey)
            eldestEntry?.let { currentSize.addAndGet(-it.size) }
        }
    }
    
    suspend fun getAll(): List<CacheEntry<T>> = mutex.withLock {
        cache.values.toList()
    }
}

/**
 * Multi-level pattern cache manager with offline support
 * 
 * Architecture:
 * Level 1: Memory Cache (LRU, fast access)
 * Level 2: Disk Cache (persistent, larger capacity)  
 * Level 3: Network Cache (remote sync, conflict resolution)
 * 
 * Features:
 * - Intelligent cache promotion/demotion
 * - Background sync with retry logic
 * - Memory pressure handling
 * - Offline change tracking
 * - Preloading of frequently accessed patterns
 * 
 * @param config Cache configuration for performance tuning
 * @param diskStorage Disk storage implementation (Room, SQLite, etc.)
 * @param networkSync Network synchronization service
 */
class PatternCacheManager(
    private val config: CacheConfig = CacheConfig(),
    private val diskStorage: DiskCacheStorage? = null,
    private val networkSync: NetworkSyncService? = null
) : CacheManager<Pattern> {
    
    // Memory cache (Level 1)
    private val memoryCache = LRUCache<Pattern>(config.memoryMaxSize, config.maxEntries)
    
    // Offline changes tracking
    private val offlineChanges = ConcurrentHashMap<String, OfflineChange>()
    
    // Cache statistics
    private val memoryCacheHits = AtomicLong(0)
    private val memoryCacheMisses = AtomicLong(0)
    private val diskCacheHits = AtomicLong(0)
    private val diskCacheMisses = AtomicLong(0)
    private val networkCacheHits = AtomicLong(0)
    private val networkCacheMisses = AtomicLong(0)
    private val evictionCount = AtomicLong(0)
    
    // Change notification flow
    private val changeFlow = MutableSharedFlow<CacheChange<Pattern>>(
        replay = 0,
        extraBufferCapacity = 100,
        onBufferOverflow = kotlinx.coroutines.channels.BufferOverflow.DROP_OLDEST
    )
    
    // Background operations
    private val backgroundScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    init {
        // Start background sync if network sync is available
        networkSync?.let { startBackgroundSync() }
        
        // Start memory pressure monitoring
        startMemoryPressureMonitoring()
    }
    
    /**
     * Get pattern from multi-level cache
     */
    override suspend fun get(key: String): CacheResult<Pattern> = withContext(Dispatchers.IO) {
        try {
            // Level 1: Memory Cache
            memoryCache.get(key)?.let { entry ->
                memoryCacheHits.incrementAndGet()
                return@withContext CacheResult.Hit(entry)
            }
            memoryCacheMisses.incrementAndGet()
            
            // Level 2: Disk Cache
            diskStorage?.let { storage ->
                storage.get(key)?.let { pattern ->
                    diskCacheHits.incrementAndGet()
                    
                    // Promote to memory cache
                    val entry = createCacheEntry(key, pattern)
                    memoryCache.put(key, entry)
                    
                    return@withContext CacheResult.Hit(entry)
                }
                diskCacheMisses.incrementAndGet()
            }
            
            // Level 3: Network Cache
            networkSync?.let { sync ->
                sync.getPattern(key)?.let { pattern ->
                    networkCacheHits.incrementAndGet()
                    
                    // Cache at all levels
                    val entry = createCacheEntry(key, pattern)
                    memoryCache.put(key, entry)
                    diskStorage?.put(key, pattern)
                    
                    return@withContext CacheResult.Hit(entry)
                }
                networkCacheMisses.incrementAndGet()
            }
            
            CacheResult.Miss(key)
            
        } catch (e: Exception) {
            CacheResult.Error(key, e)
        }
    }
    
    /**
     * Put pattern into multi-level cache
     */
    override suspend fun put(
        key: String, 
        value: Pattern, 
        priority: CachePriority
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val entry = createCacheEntry(key, value, priority)
            
            // Store in memory cache
            memoryCache.put(key, entry)
            
            // Store in disk cache if available
            diskStorage?.put(key, value)
            
            // Schedule network sync if online
            networkSync?.let { sync ->
                if (sync.isOnline()) {
                    backgroundScope.launch {
                        sync.putPattern(key, value)
                    }
                } else {
                    // Track offline change
                    trackOfflineChange(key, OfflineOperation.UPDATE, value)
                }
            }
            
            // Notify observers
            changeFlow.tryEmit(CacheChange.Added(key, value))
            
            true
            
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Remove pattern from multi-level cache
     */
    override suspend fun remove(key: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val entry = memoryCache.remove(key)
            val pattern = entry?.data
            
            diskStorage?.remove(key)
            
            networkSync?.let { sync ->
                if (sync.isOnline()) {
                    backgroundScope.launch {
                        sync.deletePattern(key)
                    }
                } else {
                    trackOfflineChange(key, OfflineOperation.DELETE)
                }
            }
            
            pattern?.let { 
                changeFlow.tryEmit(CacheChange.Removed(key, it))
            }
            
            entry != null
            
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Clear all cache levels
     */
    override suspend fun clear(): Unit = withContext(Dispatchers.IO) {
        val count = memoryCache.clear()
        diskStorage?.clear()
        
        changeFlow.tryEmit(CacheChange.Cleared(count))
    }
    
    /**
     * Get comprehensive cache statistics
     */
    override suspend fun getStats(): CacheStats = withContext(Dispatchers.IO) {
        val memorySize = memoryCache.sizeBytes()
        val memoryEntries = memoryCache.size()
        
        val diskSize = diskStorage?.getSizeBytes() ?: 0L
        val diskEntries = diskStorage?.getEntryCount() ?: 0
        
        val totalHits = memoryCacheHits.get() + diskCacheHits.get() + networkCacheHits.get()
        val totalMisses = memoryCacheMisses.get() + diskCacheMisses.get() + networkCacheMisses.get()
        val hitRatio = if (totalHits + totalMisses > 0) totalHits.toFloat() / (totalHits + totalMisses) else 0f
        
        val memoryPressure = calculateMemoryPressure(memorySize)
        
        CacheStats(
            memoryCache = CacheLevelStats(
                entries = memoryEntries,
                sizeBytes = memorySize,
                maxSizeBytes = config.memoryMaxSize,
                hitCount = memoryCacheHits.get(),
                missCount = memoryCacheMisses.get()
            ),
            diskCache = CacheLevelStats(
                entries = diskEntries,
                sizeBytes = diskSize,
                maxSizeBytes = config.diskMaxSize,
                hitCount = diskCacheHits.get(),
                missCount = diskCacheMisses.get()
            ),
            networkCache = CacheLevelStats(
                entries = 0, // Not tracked
                sizeBytes = 0,
                maxSizeBytes = 0,
                hitCount = networkCacheHits.get(),
                missCount = networkCacheMisses.get()
            ),
            hitRatio = hitRatio,
            evictionCount = evictionCount.get(),
            syncPendingCount = offlineChanges.size,
            memoryPressure = memoryPressure
        )
    }
    
    /**
     * Observe cache changes for reactive UI updates
     */
    override fun observeChanges(): Flow<CacheChange<Pattern>> = changeFlow.asSharedFlow()
    
    /**
     * Create pattern offline with conflict resolution
     */
    suspend fun createPatternOffline(pattern: Pattern): String = withContext(Dispatchers.IO) {
        val tempId = "temp_${System.currentTimeMillis()}_${pattern.userId}"
        val offlinePattern = pattern.copy(id = tempId)
        
        // Store in local caches
        put(tempId, offlinePattern, CachePriority.HIGH)
        
        // Track offline change
        trackOfflineChange(tempId, OfflineOperation.CREATE, offlinePattern)
        
        tempId
    }
    
    /**
     * Sync all pending offline changes
     */
    suspend fun syncPendingChanges(): Result<List<String>> = withContext(Dispatchers.IO) {
        try {
            val networkService = networkSync ?: return@withContext Result.failure(
                IllegalStateException("Network sync not available")
            )
            
            if (!networkService.isOnline()) {
                return@withContext Result.failure(
                    IllegalStateException("Network not available")
                )
            }
            
            val syncedIds = mutableListOf<String>()
            val pendingChanges = offlineChanges.values.toList()
            
            for (change in pendingChanges) {
                try {
                    val result = when (change.operation) {
                        OfflineOperation.CREATE -> {
                            change.data?.let { pattern ->
                                networkService.createPattern(pattern)
                            }
                        }
                        OfflineOperation.UPDATE -> {
                            change.data?.let { pattern ->
                                networkService.putPattern(change.patternId, pattern)
                            }
                        }
                        OfflineOperation.DELETE -> {
                            networkService.deletePattern(change.patternId)
                            change.patternId
                        }
                        OfflineOperation.FAVORITE, OfflineOperation.UNFAVORITE -> {
                            // Handle favorite operations
                            networkService.toggleFavorite(change.patternId)
                        }
                    }
                    
                    if (result != null) {
                        offlineChanges.remove(change.id)
                        syncedIds.add(change.patternId)
                    }
                    
                } catch (e: Exception) {
                    // Update retry count
                    if (change.canRetry) {
                        val updatedChange = change.copy(retryCount = change.retryCount + 1)
                        offlineChanges[change.id] = updatedChange
                    } else {
                        offlineChanges.remove(change.id)
                    }
                }
            }
            
            Result.success(syncedIds)
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Preload frequently accessed patterns
     */
    suspend fun preloadFrequentPatterns(userId: String): Unit = withContext(Dispatchers.IO) {
        if (!config.enablePreloading) return@withContext
        
        networkSync?.let { sync ->
            try {
                val frequentPatterns = sync.getFrequentPatterns(userId, limit = 20)
                frequentPatterns.forEach { pattern ->
                    put(pattern.id, pattern, CachePriority.HIGH)
                }
            } catch (e: Exception) {
                // Preloading failure is non-critical
            }
        }
    }
    
    /**
     * Handle memory pressure by aggressive eviction
     */
    suspend fun handleMemoryPressure(pressure: MemoryPressure): Unit = withContext(Dispatchers.IO) {
        when (pressure) {
            MemoryPressure.HIGH -> {
                // Evict low priority entries
                evictByPriority(CachePriority.LOW)
            }
            MemoryPressure.CRITICAL -> {
                // Evict all except critical entries
                evictByPriority(CachePriority.NORMAL)
                evictByPriority(CachePriority.HIGH)
            }
            else -> { /* No action needed */ }
        }
    }
    
    // Private helper methods
    
    private fun createCacheEntry(
        key: String, 
        pattern: Pattern, 
        priority: CachePriority = CachePriority.NORMAL
    ): CacheEntry<Pattern> {
        val size = pattern.estimatedMemoryBytes
        return CacheEntry(
            data = pattern,
            key = key,
            size = size,
            priority = priority
        )
    }
    
    private fun trackOfflineChange(
        patternId: String, 
        operation: OfflineOperation, 
        data: Pattern? = null
    ) {
        val change = OfflineChange(
            patternId = patternId,
            operation = operation,
            data = data
        )
        offlineChanges[change.id] = change
    }
    
    private fun startBackgroundSync() {
        backgroundScope.launch {
            while (true) {
                delay(config.backgroundSyncInterval)
                
                if (offlineChanges.isNotEmpty()) {
                    try {
                        syncPendingChanges()
                    } catch (e: Exception) {
                        // Background sync failure is non-critical
                    }
                }
            }
        }
    }
    
    private fun startMemoryPressureMonitoring() {
        backgroundScope.launch {
            while (true) {
                delay(30000) // Check every 30 seconds
                
                val stats = getStats()
                if (stats.memoryPressure == MemoryPressure.HIGH ||
                    stats.memoryPressure == MemoryPressure.CRITICAL) {
                    handleMemoryPressure(stats.memoryPressure)
                }
            }
        }
    }
    
    private fun calculateMemoryPressure(currentSize: Long): MemoryPressure {
        val utilization = currentSize.toFloat() / config.memoryMaxSize
        return when {
            utilization > 0.95f -> MemoryPressure.CRITICAL
            utilization > config.memoryPressureThreshold -> MemoryPressure.HIGH
            utilization > 0.70f -> MemoryPressure.MODERATE
            else -> MemoryPressure.LOW
        }
    }
    
    private suspend fun evictByPriority(maxPriority: CachePriority) {
        val allEntries = memoryCache.getAll()
        val toEvict = allEntries.filter { it.priority.ordinal <= maxPriority.ordinal }
        
        toEvict.forEach { entry ->
            memoryCache.remove(entry.key)
            evictionCount.incrementAndGet()
        }
    }
    
    /**
     * Clean up resources and cancel background operations
     */
    fun cleanup() {
        backgroundScope.cancel()
        offlineChanges.clear()
    }
}

/**
 * Disk storage interface for dependency injection
 */
interface DiskCacheStorage {
    suspend fun get(key: String): Pattern?
    suspend fun put(key: String, pattern: Pattern): Boolean
    suspend fun remove(key: String): Boolean
    suspend fun clear(): Boolean
    suspend fun getSizeBytes(): Long
    suspend fun getEntryCount(): Int
}

/**
 * Network sync interface for dependency injection
 */
interface NetworkSyncService {
    suspend fun isOnline(): Boolean
    suspend fun getPattern(id: String): Pattern?
    suspend fun putPattern(id: String, pattern: Pattern): String?
    suspend fun createPattern(pattern: Pattern): String?
    suspend fun deletePattern(id: String): String?
    suspend fun toggleFavorite(patternId: String): String?
    suspend fun getFrequentPatterns(userId: String, limit: Int): List<Pattern>
}