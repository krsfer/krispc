/**
 * Pattern Service Layer - Mobile-Optimized Kotlin Implementation
 * 
 * High-performance pattern persistence service with advanced features:
 * - Coroutine-based async operations
 * - Flow-based reactive data streams
 * - Offline-first architecture with Room database
 * - Efficient caching with memory management
 * - Pattern search and filtering
 * - User progression tracking
 */
package com.emoty.services

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.util.*
import kotlin.collections.HashMap

/**
 * Core pattern data model
 */
data class Pattern(
    val id: String = UUID.randomUUID().toString(),
    val userId: String,
    val name: String,
    val sequence: List<String>,
    val paletteId: String,
    val size: Int,
    val isPublic: Boolean = false,
    val isAiGenerated: Boolean = false,
    val generationPrompt: String? = null,
    val tags: List<String> = emptyList(),
    val difficultyRating: Int? = null,
    val viewCount: Int = 0,
    val likeCount: Int = 0,
    val complexityScore: Float? = null,
    val estimatedTimeMinutes: Int? = null,
    val version: Int = 1,
    val parentPatternId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val deletedAt: Long? = null,
    val deletedBy: String? = null
) {
    val isDeleted: Boolean get() = deletedAt != null
    
    /**
     * Calculate memory footprint for caching decisions
     */
    val estimatedMemoryBytes: Long
        get() = (name.length + sequence.sumOf { it.length } + 
                tags.sumOf { it.length } + 200).toLong() // Base overhead
}

/**
 * User data model for pattern ownership
 */
data class User(
    val id: String,
    val email: String,
    val username: String?,
    val fullName: String?,
    val avatarUrl: String?,
    val userLevel: UserLevel = UserLevel.BEGINNER,
    val reputationScore: Int = 0,
    val totalPatternsCreated: Int = 0,
    val favoritePalettes: List<String> = emptyList(),
    val accessibilityPreferences: AccessibilityPreferences? = null,
    val languagePreference: String = "en",
    val createdAt: Long = System.currentTimeMillis(),
    val lastLoginAt: Long? = null,
    val isActive: Boolean = true
)

/**
 * User skill levels for progressive UI
 */
enum class UserLevel {
    BEGINNER, INTERMEDIATE, ADVANCED, EXPERT;
    
    val maxPatternComplexity: PatternComplexity
        get() = when (this) {
            BEGINNER -> PatternComplexity.SIMPLE
            INTERMEDIATE -> PatternComplexity.MODERATE
            ADVANCED, EXPERT -> PatternComplexity.COMPLEX
        }
}

/**
 * Accessibility preferences for inclusive design
 */
data class AccessibilityPreferences(
    val highContrast: Boolean = false,
    val largeText: Boolean = false,
    val reducedMotion: Boolean = false,
    val screenReaderMode: Boolean = false,
    val voiceCommandsEnabled: Boolean = false,
    val preferredInputMethod: InputMethod = InputMethod.TOUCH,
    val colorBlindAssistance: Boolean = false
)

enum class InputMethod {
    TOUCH, VOICE, KEYBOARD, GESTURE
}

/**
 * Achievement data model
 */
data class Achievement(
    val id: String,
    val achievementKey: String,
    val nameEn: String,
    val nameFr: String,
    val descriptionEn: String,
    val descriptionFr: String,
    val icon: String,
    val requiredLevel: UserLevel,
    val category: AchievementCategory,
    val pointsValue: Int,
    val isActive: Boolean = true
)

enum class AchievementCategory {
    PATTERN_CREATION, SOCIAL_ENGAGEMENT, EXPLORATION, AI_INTERACTION, ACCESSIBILITY, SPECIAL
}

/**
 * Search and filtering options
 */
data class PatternSearchFilters(
    val query: String? = null,
    val tags: List<String> = emptyList(),
    val userId: String? = null,
    val paletteId: String? = null,
    val isPublic: Boolean? = null,
    val isAiGenerated: Boolean? = null,
    val difficultyMin: Int? = null,
    val difficultyMax: Int? = null,
    val complexityMin: Float? = null,
    val complexityMax: Float? = null,
    val createdAfter: Long? = null,
    val createdBefore: Long? = null
)

/**
 * Sort options for pattern queries
 */
data class PatternSortOptions(
    val field: SortField = SortField.CREATED_AT,
    val direction: SortDirection = SortDirection.DESC
)

enum class SortField {
    NAME, CREATED_AT, UPDATED_AT, VIEW_COUNT, LIKE_COUNT, DIFFICULTY_RATING
}

enum class SortDirection {
    ASC, DESC
}

/**
 * Pagination for large result sets
 */
data class PaginationOptions(
    val limit: Int = 20,
    val offset: Int = 0
) {
    val page: Int get() = (offset / limit) + 1
}

/**
 * Pattern search results with metadata
 */
data class PatternSearchResult(
    val patterns: List<Pattern>,
    val totalCount: Int,
    val pagination: PaginationInfo,
    val facets: SearchFacets? = null
)

data class PaginationInfo(
    val total: Int,
    val page: Int,
    val limit: Int,
    val hasNext: Boolean,
    val hasPrev: Boolean
)

/**
 * Search facets for filter UI
 */
data class SearchFacets(
    val tags: List<TagFacet>,
    val difficultyRatings: List<DifficultyFacet>,
    val palettes: List<PaletteFacet>,
    val userLevels: List<UserLevelFacet>
)

data class TagFacet(val tag: String, val count: Int)
data class DifficultyFacet(val rating: Int, val count: Int)
data class PaletteFacet(val paletteId: String, val count: Int)
data class UserLevelFacet(val level: UserLevel, val count: Int)

/**
 * Repository interface for dependency injection and testing
 */
interface PatternRepository {
    suspend fun createPattern(pattern: Pattern): Result<Pattern>
    suspend fun getPatternById(id: String): Result<Pattern?>
    suspend fun updatePattern(pattern: Pattern): Result<Pattern>
    suspend fun deletePattern(id: String, userId: String): Result<Unit>
    suspend fun searchPatterns(
        filters: PatternSearchFilters,
        sort: PatternSortOptions,
        pagination: PaginationOptions
    ): Result<PatternSearchResult>
    fun observeUserPatterns(userId: String): Flow<List<Pattern>>
    suspend fun toggleFavorite(patternId: String, userId: String): Result<Boolean>
    suspend fun getUserFavorites(userId: String, pagination: PaginationOptions): Result<List<Pattern>>
}

/**
 * Cache repository for offline-first architecture
 */
interface PatternCacheRepository {
    suspend fun cachePattern(pattern: Pattern): Result<Unit>
    suspend fun getCachedPattern(id: String): Pattern?
    suspend fun getCachedPatterns(userId: String, limit: Int = 50): List<Pattern>
    suspend fun clearCache(): Result<Unit>
    suspend fun syncPendingChanges(): Result<List<Pattern>>
}

/**
 * High-level pattern service with business logic
 * 
 * Features:
 * - Reactive data streams with Flow
 * - Offline-first with automatic sync
 * - Performance monitoring
 * - User progression tracking
 * - Achievement integration
 * 
 * @param repository Primary data source (Room database)
 * @param cacheRepository Local cache for offline support
 * @param patternGenerator Pattern creation engine
 * @param achievementEngine Achievement tracking system
 */
class PatternService(
    private val repository: PatternRepository,
    private val cacheRepository: PatternCacheRepository,
    private val patternGenerator: PatternGenerator,
    private val achievementEngine: AchievementEngine
) {
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // In-memory cache for frequently accessed patterns
    private val memoryCache = mutableMapOf<String, Pattern>()
    private val maxMemoryCacheSize = 100
    
    /**
     * Create a new pattern with validation and achievement tracking
     */
    suspend fun createPattern(
        userId: String,
        name: String,
        sequence: List<String>,
        paletteId: String,
        isPublic: Boolean = false,
        tags: List<String> = emptyList()
    ): Result<Pattern> = withContext(Dispatchers.IO) {
        try {
            // Validate sequence
            when (val validation = PatternGenerator.validateSequence(sequence)) {
                is ValidationResult.Error -> return@withContext Result.failure(
                    IllegalArgumentException(validation.message)
                )
                ValidationResult.Success -> Unit
            }
            
            // Generate pattern to calculate complexity
            val patternResult = patternGenerator.generateConcentricPattern(sequence)
                .getOrElse { return@withContext Result.failure(it) }
            
            val pattern = Pattern(
                userId = userId,
                name = name,
                sequence = sequence,
                paletteId = paletteId,
                size = patternResult.dimensions.size,
                isPublic = isPublic,
                tags = tags,
                complexityScore = when (patternResult.complexity) {
                    PatternComplexity.SIMPLE -> 1.0f
                    PatternComplexity.MODERATE -> 2.0f
                    PatternComplexity.COMPLEX -> 3.0f
                },
                estimatedTimeMinutes = estimateCompletionTime(patternResult.complexity)
            )
            
            // Save to primary repository
            val result = repository.createPattern(pattern)
            
            result.onSuccess { savedPattern ->
                // Cache for offline access
                cacheRepository.cachePattern(savedPattern)
                
                // Add to memory cache
                addToMemoryCache(savedPattern)
                
                // Trigger achievement check
                serviceScope.launch {
                    achievementEngine.checkPatternCreationAchievements(userId, savedPattern)
                }
            }
            
            result
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get pattern by ID with cache fallback
     */
    suspend fun getPattern(id: String): Result<Pattern?> = withContext(Dispatchers.IO) {
        try {
            // Check memory cache first
            memoryCache[id]?.let { return@withContext Result.success(it) }
            
            // Try primary repository
            val result = repository.getPatternById(id)
            
            result.onSuccess { pattern ->
                pattern?.let { addToMemoryCache(it) }
            }
            
            // Fallback to cache for offline support
            if (result.isFailure) {
                val cachedPattern = cacheRepository.getCachedPattern(id)
                if (cachedPattern != null) {
                    return@withContext Result.success(cachedPattern)
                }
            }
            
            result
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Search patterns with reactive Flow
     */
    fun searchPatterns(
        filters: PatternSearchFilters,
        sort: PatternSortOptions = PatternSortOptions(),
        pagination: PaginationOptions = PaginationOptions()
    ): Flow<Result<PatternSearchResult>> = flow {
        try {
            // Emit cached results first for immediate UI response
            val cachedPatterns = if (filters.userId != null) {
                cacheRepository.getCachedPatterns(filters.userId, pagination.limit)
                    .let { patterns -> applyFiltersLocally(patterns, filters, sort, pagination) }
            } else {
                emptyList()
            }
            
            if (cachedPatterns.isNotEmpty()) {
                emit(Result.success(PatternSearchResult(
                    patterns = cachedPatterns,
                    totalCount = cachedPatterns.size,
                    pagination = PaginationInfo(
                        total = cachedPatterns.size,
                        page = pagination.page,
                        limit = pagination.limit,
                        hasNext = false,
                        hasPrev = pagination.offset > 0
                    )
                )))
            }
            
            // Then emit server results
            val serverResult = repository.searchPatterns(filters, sort, pagination)
            serverResult.onSuccess { result ->
                // Cache results for offline access
                serviceScope.launch {
                    result.patterns.forEach { pattern ->
                        cacheRepository.cachePattern(pattern)
                        addToMemoryCache(pattern)
                    }
                }
            }
            
            emit(serverResult)
            
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }.flowOn(Dispatchers.IO)
    
    /**
     * Observe user's patterns with real-time updates
     */
    fun observeUserPatterns(userId: String): Flow<List<Pattern>> {
        return repository.observeUserPatterns(userId)
            .onEach { patterns ->
                // Update memory cache
                patterns.forEach { addToMemoryCache(it) }
            }
            .flowOn(Dispatchers.IO)
    }
    
    /**
     * Update pattern with optimistic updates and conflict resolution
     */
    suspend fun updatePattern(
        pattern: Pattern,
        currentUserId: String
    ): Result<Pattern> = withContext(Dispatchers.IO) {
        try {
            // Ownership check
            if (pattern.userId != currentUserId) {
                return@withContext Result.failure(
                    SecurityException("User $currentUserId cannot modify pattern owned by ${pattern.userId}")
                )
            }
            
            val updatedPattern = pattern.copy(
                updatedAt = System.currentTimeMillis(),
                version = pattern.version + 1
            )
            
            val result = repository.updatePattern(updatedPattern)
            
            result.onSuccess { savedPattern ->
                // Update caches
                cacheRepository.cachePattern(savedPattern)
                addToMemoryCache(savedPattern)
            }
            
            result
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Soft delete pattern
     */
    suspend fun deletePattern(
        patternId: String,
        currentUserId: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val result = repository.deletePattern(patternId, currentUserId)
            
            result.onSuccess {
                // Remove from caches
                memoryCache.remove(patternId)
            }
            
            result
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Toggle pattern favorite status
     */
    suspend fun toggleFavorite(
        patternId: String,
        userId: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        repository.toggleFavorite(patternId, userId)
    }
    
    /**
     * Get user's favorite patterns
     */
    suspend fun getUserFavorites(
        userId: String,
        pagination: PaginationOptions = PaginationOptions()
    ): Result<List<Pattern>> = withContext(Dispatchers.IO) {
        val result = repository.getUserFavorites(userId, pagination)
        
        result.onSuccess { patterns ->
            patterns.forEach { addToMemoryCache(it) }
        }
        
        result
    }
    
    /**
     * Sync offline changes when connectivity is restored
     */
    suspend fun syncOfflineChanges(): Result<List<Pattern>> = withContext(Dispatchers.IO) {
        try {
            val result = cacheRepository.syncPendingChanges()
            
            result.onSuccess { syncedPatterns ->
                syncedPatterns.forEach { addToMemoryCache(it) }
            }
            
            result
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Clear all caches for memory management
     */
    suspend fun clearCaches(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            memoryCache.clear()
            cacheRepository.clearCache()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get cache statistics for monitoring
     */
    suspend fun getCacheStats(): CacheStats = withContext(Dispatchers.IO) {
        CacheStats(
            memoryCacheSize = memoryCache.size,
            memoryCacheMaxSize = maxMemoryCacheSize,
            memoryUsageBytes = memoryCache.values.sumOf { it.estimatedMemoryBytes }
        )
    }
    
    // Private helper methods
    
    private fun addToMemoryCache(pattern: Pattern) {
        // Remove if already exists to update position
        memoryCache.remove(pattern.id)
        
        // Add to end (most recently used)
        memoryCache[pattern.id] = pattern
        
        // Evict oldest if over limit (LRU)
        if (memoryCache.size > maxMemoryCacheSize) {
            val oldestKey = memoryCache.keys.first()
            memoryCache.remove(oldestKey)
        }
    }
    
    private fun applyFiltersLocally(
        patterns: List<Pattern>,
        filters: PatternSearchFilters,
        sort: PatternSortOptions,
        pagination: PaginationOptions
    ): List<Pattern> {
        var filtered = patterns.asSequence()
        
        // Apply filters
        filters.query?.let { query ->
            filtered = filtered.filter { 
                it.name.contains(query, ignoreCase = true) ||
                it.tags.any { tag -> tag.contains(query, ignoreCase = true) }
            }
        }
        
        filters.tags.takeIf { it.isNotEmpty() }?.let { tags ->
            filtered = filtered.filter { pattern ->
                tags.any { tag -> pattern.tags.contains(tag) }
            }
        }
        
        filters.isPublic?.let { isPublic ->
            filtered = filtered.filter { it.isPublic == isPublic }
        }
        
        // Apply sorting
        filtered = when (sort.field) {
            SortField.NAME -> filtered.sortedBy { it.name }
            SortField.CREATED_AT -> filtered.sortedBy { it.createdAt }
            SortField.UPDATED_AT -> filtered.sortedBy { it.updatedAt }
            SortField.VIEW_COUNT -> filtered.sortedBy { it.viewCount }
            SortField.LIKE_COUNT -> filtered.sortedBy { it.likeCount }
            SortField.DIFFICULTY_RATING -> filtered.sortedBy { it.difficultyRating ?: 0 }
        }
        
        if (sort.direction == SortDirection.DESC) {
            filtered = filtered.reversed()
        }
        
        // Apply pagination
        return filtered.drop(pagination.offset).take(pagination.limit).toList()
    }
    
    private fun estimateCompletionTime(complexity: PatternComplexity): Int {
        return when (complexity) {
            PatternComplexity.SIMPLE -> 2
            PatternComplexity.MODERATE -> 5
            PatternComplexity.COMPLEX -> 10
        }
    }
    
    /**
     * Clean up resources
     */
    fun cleanup() {
        serviceScope.cancel()
        memoryCache.clear()
    }
}

/**
 * Cache statistics for monitoring and optimization
 */
data class CacheStats(
    val memoryCacheSize: Int,
    val memoryCacheMaxSize: Int,
    val memoryUsageBytes: Long
)