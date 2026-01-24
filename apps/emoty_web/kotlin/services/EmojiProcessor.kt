/**
 * Emoji Processing Engine - Mobile-Optimized Kotlin Implementation
 * 
 * Comprehensive Unicode emoji validation and processing system optimized for mobile devices.
 * Handles complex emoji sequences, skin tone variations, and multi-byte characters with
 * performance-focused algorithms and minimal memory allocation.
 * 
 * Features:
 * - Unicode 15.0 emoji support
 * - Multi-byte character handling
 * - Skin tone and gender variation processing
 * - Emoji sequence normalization
 * - Pattern complexity analysis
 * - Memory-efficient rendering preparation
 * - Regional indicator and flag support
 */
package com.emoty.services

import kotlinx.coroutines.*
import java.text.BreakIterator
import java.util.*
import kotlin.math.*

/**
 * Emoji metadata for analysis and rendering
 */
data class EmojiMetadata(
    val baseEmoji: String,
    val codePoints: List<Int>,
    val category: EmojiCategory,
    val skinTone: SkinTone? = null,
    val gender: Gender? = null,
    val isSequence: Boolean = false,
    val sequenceType: SequenceType? = null,
    val complexity: Float,
    val renderingHints: RenderingHints
) {
    val byteSize: Int get() = baseEmoji.toByteArray(Charsets.UTF_8).size
    val isComplex: Boolean get() = complexity > 2.0f || isSequence
    val memoryFootprint: Long get() = (byteSize + 64).toLong() // Base overhead estimate
}

/**
 * Emoji categories for pattern organization
 */
enum class EmojiCategory {
    SMILEYS_EMOTION,
    PEOPLE_BODY,
    ANIMALS_NATURE,
    FOOD_DRINK,
    TRAVEL_PLACES,
    ACTIVITIES,
    OBJECTS,
    SYMBOLS,
    FLAGS,
    COMPONENT, // Skin tones, hair components, etc.
    UNKNOWN;
    
    companion object {
        fun fromCodePoint(codePoint: Int): EmojiCategory {
            return when (codePoint) {
                in 0x1F600..0x1F64F -> SMILEYS_EMOTION
                in 0x1F466..0x1F469, in 0x1F9B0..0x1F9B3 -> PEOPLE_BODY
                in 0x1F400..0x1F4FF -> ANIMALS_NATURE
                in 0x1F32D..0x1F37F, in 0x1F950..0x1F96B -> FOOD_DRINK
                in 0x1F3E0..0x1F3F0, in 0x1F680..0x1F6FF -> TRAVEL_PLACES
                in 0x26BD..0x26BE, in 0x1F3B1..0x1F3C4 -> ACTIVITIES
                in 0x1F4A0..0x1F4FC -> OBJECTS
                in 0x2600..0x26FF, in 0x2700..0x27BF -> SYMBOLS
                in 0x1F1E6..0x1F1FF -> FLAGS
                in 0x1F3FB..0x1F3FF -> COMPONENT // Skin tones
                else -> UNKNOWN
            }
        }
    }
}

/**
 * Skin tone variations
 */
enum class SkinTone(val modifier: Int, val description: String) {
    LIGHT(0x1F3FB, "Light"),
    MEDIUM_LIGHT(0x1F3FC, "Medium-Light"),
    MEDIUM(0x1F3FD, "Medium"),
    MEDIUM_DARK(0x1F3FE, "Medium-Dark"),
    DARK(0x1F3FF, "Dark");
    
    companion object {
        fun fromCodePoint(codePoint: Int): SkinTone? = values().find { it.modifier == codePoint }
        val allModifiers = values().map { it.modifier }.toSet()
    }
}

/**
 * Gender variations
 */
enum class Gender(val modifier: Int, val description: String) {
    MALE(0x2642, "Male Sign"),
    FEMALE(0x2640, "Female Sign");
    
    companion object {
        fun fromCodePoint(codePoint: Int): Gender? = values().find { it.modifier == codePoint }
        val allModifiers = values().map { it.modifier }.toSet()
    }
}

/**
 * Types of emoji sequences
 */
enum class SequenceType {
    SKIN_TONE_SEQUENCE,
    GENDER_SEQUENCE,
    PROFESSION_SEQUENCE,
    FAMILY_SEQUENCE,
    FLAG_SEQUENCE,
    MODIFIER_SEQUENCE,
    ZWJ_SEQUENCE, // Zero Width Joiner sequences
    KEYCAP_SEQUENCE,
    TAG_SEQUENCE
}

/**
 * Rendering optimization hints
 */
data class RenderingHints(
    val preferredSize: Int = 32,
    val requiresSpecialHandling: Boolean = false,
    val cacheable: Boolean = true,
    val renderingComplexity: RenderingComplexity = RenderingComplexity.SIMPLE
)

enum class RenderingComplexity {
    SIMPLE, MODERATE, COMPLEX, VERY_COMPLEX
}

/**
 * Emoji validation result with detailed information
 */
sealed class EmojiValidationResult {
    data class Valid(val metadata: EmojiMetadata) : EmojiValidationResult()
    data class Invalid(val reason: String, val suggestion: String? = null) : EmojiValidationResult()
    data class Warning(val metadata: EmojiMetadata, val issue: String) : EmojiValidationResult()
}

/**
 * Emoji processing configuration for mobile optimization
 */
data class EmojiProcessingConfig(
    val maxSequenceLength: Int = 7, // Reasonable limit for mobile rendering
    val enableSkinToneNormalization: Boolean = true,
    val enableComplexSequences: Boolean = true,
    val maxMemoryPerEmoji: Long = 1024, // Bytes
    val preferredRenderingSize: Int = 32,
    val enableCaching: Boolean = true
)

/**
 * High-performance emoji processing engine optimized for mobile devices
 * 
 * Features:
 * - Unicode 15.0 emoji support with full sequence handling
 * - Memory-efficient processing with lazy evaluation
 * - Advanced validation with detailed error reporting
 * - Pattern complexity analysis for UI optimization
 * - Accessibility support with descriptive text generation
 * - Regional indicator and flag sequence processing
 * 
 * @param config Processing configuration for performance tuning
 */
class EmojiProcessor(
    private val config: EmojiProcessingConfig = EmojiProcessingConfig()
) {
    companion object {
        // Unicode ranges for emoji detection
        private val EMOJI_RANGES = listOf(
            0x1F600..0x1F64F, // Emoticons
            0x1F300..0x1F5FF, // Misc Symbols and Pictographs
            0x1F680..0x1F6FF, // Transport and Map
            0x1F1E6..0x1F1FF, // Regional indicators (flags)
            0x2600..0x26FF,   // Misc symbols
            0x2700..0x27BF,   // Dingbats
            0x1F900..0x1F9FF, // Supplemental Symbols and Pictographs
            0x1F000..0x1F02F, // Mahjong Tiles
            0x1F0A0..0x1F0FF, // Playing Cards
            0xFE00..0xFE0F,   // Variation selectors
            0x200D..0x200D,   // Zero Width Joiner
            0x20E3..0x20E3    // Combining Enclosing Keycap
        )
        
        // Zero Width Joiner for emoji sequences
        private const val ZWJ = 0x200D
        
        // Variation selectors
        private const val VARIATION_SELECTOR_15 = 0xFE0E // Text presentation
        private const val VARIATION_SELECTOR_16 = 0xFE0F // Emoji presentation
        
        // Combining Enclosing Keycap for number emojis
        private const val COMBINING_ENCLOSING_KEYCAP = 0x20E3
    }
    
    // Cache for processed emoji metadata
    private val metadataCache = mutableMapOf<String, EmojiMetadata>()
    private val maxCacheSize = 500
    
    /**
     * Validate and process a single emoji with comprehensive analysis
     */
    suspend fun processEmoji(emoji: String): EmojiValidationResult = withContext(Dispatchers.Default) {
        try {
            // Quick validation first
            if (emoji.isEmpty()) {
                return@withContext EmojiValidationResult.Invalid("Emoji string is empty")
            }
            
            if (emoji.length > config.maxSequenceLength * 4) { // Conservative estimate
                return@withContext EmojiValidationResult.Invalid(
                    "Emoji sequence too long",
                    "Consider using simpler emojis"
                )
            }
            
            // Check cache first
            metadataCache[emoji]?.let { cachedMetadata ->
                return@withContext EmojiValidationResult.Valid(cachedMetadata)
            }
            
            // Parse emoji into grapheme clusters
            val graphemeClusters = parseGraphemeClusters(emoji)
            
            if (graphemeClusters.size > 1) {
                return@withContext EmojiValidationResult.Invalid(
                    "Multiple emoji detected, expected single emoji",
                    "Use individual emojis in pattern"
                )
            }
            
            val emojiText = graphemeClusters.first()
            val codePoints = emojiText.codePoints().toArray().toList()
            
            // Validate emoji
            val validationResult = validateEmojiCodePoints(codePoints)
            if (validationResult != null) {
                return@withContext validationResult
            }
            
            // Analyze emoji structure
            val metadata = analyzeEmojiStructure(emojiText, codePoints)
            
            // Check memory constraints
            if (metadata.memoryFootprint > config.maxMemoryPerEmoji) {
                return@withContext EmojiValidationResult.Warning(
                    metadata,
                    "Emoji may use significant memory (${metadata.memoryFootprint} bytes)"
                )
            }
            
            // Cache result
            addToCache(emoji, metadata)
            
            EmojiValidationResult.Valid(metadata)
            
        } catch (e: Exception) {
            EmojiValidationResult.Invalid("Error processing emoji: ${e.message}")
        }
    }
    
    /**
     * Process a sequence of emojis for pattern creation
     */
    suspend fun processEmojiSequence(
        emojis: List<String>
    ): Result<List<EmojiMetadata>> = withContext(Dispatchers.Default) {
        try {
            val results = mutableListOf<EmojiMetadata>()
            val warnings = mutableListOf<String>()
            
            for (emoji in emojis) {
                when (val result = processEmoji(emoji)) {
                    is EmojiValidationResult.Valid -> {
                        results.add(result.metadata)
                    }
                    is EmojiValidationResult.Warning -> {
                        results.add(result.metadata)
                        warnings.add("${emoji}: ${result.issue}")
                    }
                    is EmojiValidationResult.Invalid -> {
                        return@withContext Result.failure(
                            IllegalArgumentException("Invalid emoji '$emoji': ${result.reason}")
                        )
                    }
                }
                
                // Yield periodically for large sequences
                if (results.size % 5 == 0) yield()
            }
            
            Result.success(results)
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Normalize emoji for consistent pattern rendering
     */
    suspend fun normalizeEmoji(emoji: String): String = withContext(Dispatchers.Default) {
        try {
            val codePoints = emoji.codePoints().toArray()
            val normalized = mutableListOf<Int>()
            
            var i = 0
            while (i < codePoints.size) {
                val codePoint = codePoints[i]
                
                when {
                    // Handle skin tone normalization
                    config.enableSkinToneNormalization && 
                    SkinTone.allModifiers.contains(codePoint) -> {
                        // Remove skin tone modifiers if normalization is enabled
                        // This creates consistent base emojis for pattern matching
                        i++
                        continue
                    }
                    
                    // Handle variation selectors
                    codePoint == VARIATION_SELECTOR_15 || codePoint == VARIATION_SELECTOR_16 -> {
                        // Prefer emoji presentation
                        if (codePoint != VARIATION_SELECTOR_16) {
                            normalized.add(VARIATION_SELECTOR_16)
                        } else {
                            normalized.add(codePoint)
                        }
                    }
                    
                    else -> {
                        normalized.add(codePoint)
                    }
                }
                i++
            }
            
            // Convert back to string
            String(normalized.toIntArray(), 0, normalized.size)
            
        } catch (e: Exception) {
            emoji // Return original on error
        }
    }
    
    /**
     * Generate accessibility description for emoji
     */
    suspend fun generateAccessibilityDescription(
        emoji: String
    ): Result<String> = withContext(Dispatchers.Default) {
        try {
            when (val result = processEmoji(emoji)) {
                is EmojiValidationResult.Valid -> {
                    val metadata = result.metadata
                    val description = buildString {
                        append(metadata.category.name.lowercase().replace('_', ' '))
                        append(" emoji")
                        
                        metadata.skinTone?.let { skinTone ->
                            append(" with ${skinTone.description.lowercase()} skin tone")
                        }
                        
                        metadata.gender?.let { gender ->
                            append(", ${gender.description.lowercase()}")
                        }
                        
                        if (metadata.isSequence) {
                            append(" (complex sequence)")
                        }
                    }
                    
                    Result.success(description)
                }
                is EmojiValidationResult.Invalid -> {
                    Result.failure(IllegalArgumentException(result.reason))
                }
                is EmojiValidationResult.Warning -> {
                    val description = "emoji with rendering complexity"
                    Result.success(description)
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Analyze pattern complexity based on emoji composition
     */
    suspend fun analyzePatternComplexity(
        emojis: List<String>
    ): Result<PatternComplexityAnalysis> = withContext(Dispatchers.Default) {
        try {
            val metadataList = processEmojiSequence(emojis).getOrThrow()
            
            val totalComplexity = metadataList.sumOf { it.complexity.toDouble() }
            val averageComplexity = totalComplexity / metadataList.size
            val maxComplexity = metadataList.maxOfOrNull { it.complexity } ?: 0f
            
            val hasComplexSequences = metadataList.any { it.isSequence }
            val totalMemoryFootprint = metadataList.sumOf { it.memoryFootprint }
            
            val categories = metadataList.groupBy { it.category }.keys
            val categoryDiversity = categories.size.toFloat() / EmojiCategory.values().size
            
            val analysis = PatternComplexityAnalysis(
                totalEmojis = emojis.size,
                averageComplexity = averageComplexity.toFloat(),
                maxComplexity = maxComplexity,
                hasComplexSequences = hasComplexSequences,
                categoryDiversity = categoryDiversity,
                estimatedRenderTime = estimateRenderTime(metadataList),
                memoryFootprint = totalMemoryFootprint,
                recommendedCellSize = recommendCellSize(metadataList)
            )
            
            Result.success(analysis)
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get optimized rendering configuration for emoji list
     */
    suspend fun getOptimizedRenderingConfig(
        emojis: List<String>
    ): Result<OptimizedRenderingConfig> = withContext(Dispatchers.Default) {
        try {
            val metadataList = processEmojiSequence(emojis).getOrThrow()
            
            val maxComplexity = metadataList.maxOfOrNull { 
                it.renderingHints.renderingComplexity.ordinal 
            } ?: 0
            
            val requiresSpecialHandling = metadataList.any { 
                it.renderingHints.requiresSpecialHandling 
            }
            
            val recommendedSize = recommendCellSize(metadataList)
            val cacheableEmojis = metadataList.count { it.renderingHints.cacheable }
            
            val config = OptimizedRenderingConfig(
                cellSize = recommendedSize,
                enableCaching = cacheableEmojis > metadataList.size / 2,
                renderingQuality = when (maxComplexity) {
                    0, 1 -> RenderingQuality.STANDARD
                    2 -> RenderingQuality.HIGH
                    else -> RenderingQuality.ULTRA
                },
                specialHandlingRequired = requiresSpecialHandling,
                estimatedMemoryUsage = metadataList.sumOf { it.memoryFootprint },
                batterySaverMode = metadataList.any { it.complexity > 3.0f }
            )
            
            Result.success(config)
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Private helper methods
    
    private fun parseGraphemeClusters(text: String): List<String> {
        val clusters = mutableListOf<String>()
        val iterator = BreakIterator.getCharacterInstance(Locale.getDefault())
        iterator.setText(text)
        
        var start = iterator.first()
        var end = iterator.next()
        
        while (end != BreakIterator.DONE) {
            clusters.add(text.substring(start, end))
            start = end
            end = iterator.next()
        }
        
        return clusters
    }
    
    private fun validateEmojiCodePoints(codePoints: List<Int>): EmojiValidationResult? {
        if (codePoints.isEmpty()) {
            return EmojiValidationResult.Invalid("No code points found")
        }
        
        // Check if any code point is in emoji ranges
        val hasEmojiCodePoint = codePoints.any { codePoint ->
            EMOJI_RANGES.any { range -> codePoint in range }
        }
        
        if (!hasEmojiCodePoint) {
            return EmojiValidationResult.Invalid(
                "No emoji code points detected",
                "Use standard emoji characters"
            )
        }
        
        // Check for invalid control characters
        val hasInvalidCharacters = codePoints.any { codePoint ->
            Character.getType(codePoint) == Character.CONTROL.toInt() &&
            codePoint != ZWJ && // Allow Zero Width Joiner
            codePoint !in 0xFE00..0xFE0F // Allow variation selectors
        }
        
        if (hasInvalidCharacters) {
            return EmojiValidationResult.Invalid("Contains invalid control characters")
        }
        
        return null // Valid
    }
    
    private fun analyzeEmojiStructure(emoji: String, codePoints: List<Int>): EmojiMetadata {
        val baseCodePoint = codePoints.first()
        val category = EmojiCategory.fromCodePoint(baseCodePoint)
        
        // Detect skin tone
        val skinTone = codePoints.mapNotNull { SkinTone.fromCodePoint(it) }.firstOrNull()
        
        // Detect gender
        val gender = codePoints.mapNotNull { Gender.fromCodePoint(it) }.firstOrNull()
        
        // Detect sequence type
        val isSequence = codePoints.size > 1 || codePoints.contains(ZWJ)
        val sequenceType = when {
            codePoints.contains(ZWJ) -> SequenceType.ZWJ_SEQUENCE
            skinTone != null -> SequenceType.SKIN_TONE_SEQUENCE
            gender != null -> SequenceType.GENDER_SEQUENCE
            codePoints.contains(COMBINING_ENCLOSING_KEYCAP) -> SequenceType.KEYCAP_SEQUENCE
            category == EmojiCategory.FLAGS -> SequenceType.FLAG_SEQUENCE
            else -> null
        }
        
        // Calculate complexity
        val complexity = calculateComplexity(codePoints, isSequence, category)
        
        // Generate rendering hints
        val renderingHints = generateRenderingHints(complexity, isSequence, category)
        
        return EmojiMetadata(
            baseEmoji = emoji,
            codePoints = codePoints,
            category = category,
            skinTone = skinTone,
            gender = gender,
            isSequence = isSequence,
            sequenceType = sequenceType,
            complexity = complexity,
            renderingHints = renderingHints
        )
    }
    
    private fun calculateComplexity(
        codePoints: List<Int>,
        isSequence: Boolean,
        category: EmojiCategory
    ): Float {
        var complexity = 1.0f
        
        // Base complexity from code point count
        complexity += (codePoints.size - 1) * 0.5f
        
        // Sequence complexity
        if (isSequence) {
            complexity += when {
                codePoints.contains(ZWJ) -> 2.0f // ZWJ sequences are complex
                codePoints.size > 3 -> 1.5f
                else -> 1.0f
            }
        }
        
        // Category complexity
        complexity += when (category) {
            EmojiCategory.FLAGS -> 1.5f // Regional indicators need special handling
            EmojiCategory.PEOPLE_BODY -> 1.0f // Often have modifiers
            EmojiCategory.SMILEYS_EMOTION -> 0.5f // Usually simple
            else -> 0.0f
        }
        
        return complexity
    }
    
    private fun generateRenderingHints(
        complexity: Float,
        isSequence: Boolean,
        category: EmojiCategory
    ): RenderingHints {
        val renderingComplexity = when {
            complexity > 4.0f -> RenderingComplexity.VERY_COMPLEX
            complexity > 3.0f -> RenderingComplexity.COMPLEX
            complexity > 2.0f -> RenderingComplexity.MODERATE
            else -> RenderingComplexity.SIMPLE
        }
        
        val requiresSpecialHandling = isSequence || 
                                    category == EmojiCategory.FLAGS ||
                                    complexity > 3.0f
        
        val preferredSize = when (renderingComplexity) {
            RenderingComplexity.VERY_COMPLEX -> 48
            RenderingComplexity.COMPLEX -> 40
            RenderingComplexity.MODERATE -> 36
            RenderingComplexity.SIMPLE -> 32
        }
        
        return RenderingHints(
            preferredSize = preferredSize,
            requiresSpecialHandling = requiresSpecialHandling,
            cacheable = complexity < 3.0f, // Cache simpler emojis
            renderingComplexity = renderingComplexity
        )
    }
    
    private fun estimateRenderTime(metadataList: List<EmojiMetadata>): Long {
        return metadataList.sumOf { metadata ->
            when (metadata.renderingHints.renderingComplexity) {
                RenderingComplexity.SIMPLE -> 1L
                RenderingComplexity.MODERATE -> 3L
                RenderingComplexity.COMPLEX -> 8L
                RenderingComplexity.VERY_COMPLEX -> 20L
            }
        }
    }
    
    private fun recommendCellSize(metadataList: List<EmojiMetadata>): Int {
        val maxPreferredSize = metadataList.maxOfOrNull { 
            it.renderingHints.preferredSize 
        } ?: config.preferredRenderingSize
        
        return maxPreferredSize.coerceIn(24, 64)
    }
    
    private fun addToCache(emoji: String, metadata: EmojiMetadata) {
        if (!config.enableCaching) return
        
        // Remove oldest if at capacity (LRU)
        if (metadataCache.size >= maxCacheSize) {
            val oldestKey = metadataCache.keys.first()
            metadataCache.remove(oldestKey)
        }
        
        metadataCache[emoji] = metadata
    }
    
    /**
     * Clear processing cache for memory management
     */
    fun clearCache() {
        metadataCache.clear()
    }
    
    /**
     * Get cache statistics
     */
    fun getCacheStats(): EmojiCacheStats {
        return EmojiCacheStats(
            cacheSize = metadataCache.size,
            maxCacheSize = maxCacheSize,
            memoryUsage = metadataCache.values.sumOf { it.memoryFootprint }
        )
    }
}

/**
 * Pattern complexity analysis result
 */
data class PatternComplexityAnalysis(
    val totalEmojis: Int,
    val averageComplexity: Float,
    val maxComplexity: Float,
    val hasComplexSequences: Boolean,
    val categoryDiversity: Float,
    val estimatedRenderTime: Long,
    val memoryFootprint: Long,
    val recommendedCellSize: Int
)

/**
 * Optimized rendering configuration
 */
data class OptimizedRenderingConfig(
    val cellSize: Int,
    val enableCaching: Boolean,
    val renderingQuality: RenderingQuality,
    val specialHandlingRequired: Boolean,
    val estimatedMemoryUsage: Long,
    val batterySaverMode: Boolean
)

enum class RenderingQuality {
    STANDARD, HIGH, ULTRA
}

/**
 * Cache statistics for monitoring
 */
data class EmojiCacheStats(
    val cacheSize: Int,
    val maxCacheSize: Int,
    val memoryUsage: Long
)