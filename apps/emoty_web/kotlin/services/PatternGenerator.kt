/**
 * Pattern Generation Engine - Mobile-Optimized Kotlin Implementation
 * 
 * High-performance pattern generation for emoji concentric square patterns
 * optimized for mobile memory constraints and battery efficiency.
 * 
 * Based on TypeScript implementation with mobile-first optimizations:
 * - Memory-efficient grid allocation
 * - Lazy evaluation for large patterns
 * - Battery-conscious algorithms
 * - Coroutine-based async processing
 */
package com.emoty.services

import kotlinx.coroutines.*
import kotlin.math.*

/**
 * Represents a cell in the pattern grid with spatial and metadata information
 */
data class GridCell(
    val emoji: String,
    val row: Int,
    val col: Int,
    val layer: Int,
    val isCenter: Boolean = false,
    val metadata: CellMetadata? = null
) {
    /**
     * Memory-efficient equality check for pattern comparison
     */
    fun contentEquals(other: GridCell): Boolean =
        emoji == other.emoji && row == other.row && col == other.col && layer == other.layer
}

/**
 * Additional metadata for pattern cells
 */
data class CellMetadata(
    val addedAt: Long = System.currentTimeMillis(),
    val source: CellSource = CellSource.USER,
    val complexity: Float = 1.0f
)

/**
 * Source of the emoji cell for tracking and analytics
 */
enum class CellSource {
    USER, AI, PRESET, TEMPLATE
}

/**
 * Pattern generation modes
 */
enum class PatternMode {
    CONCENTRIC, SEQUENTIAL, SPIRAL
}

/**
 * Pattern complexity levels for performance optimization
 */
enum class PatternComplexity {
    SIMPLE, MODERATE, COMPLEX;
    
    companion object {
        fun fromSequenceLength(length: Int): PatternComplexity = when {
            length <= 2 -> SIMPLE
            length <= 5 -> MODERATE
            else -> COMPLEX
        }
    }
}

/**
 * Pattern generation result with performance metrics
 */
data class PatternResult(
    val grid: Array<Array<GridCell?>>,
    val dimensions: PatternDimensions,
    val complexity: PatternComplexity,
    val generationTimeMs: Long,
    val memoryUsageBytes: Long = 0L
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as PatternResult
        return grid.contentDeepEquals(other.grid) && 
               dimensions == other.dimensions && 
               complexity == other.complexity
    }

    override fun hashCode(): Int {
        var result = grid.contentDeepHashCode()
        result = 31 * result + dimensions.hashCode()
        result = 31 * result + complexity.hashCode()
        return result
    }
}

/**
 * Pattern dimensions with cell size optimization
 */
data class PatternDimensions(
    val size: Int,
    val cellSize: Int
) {
    val totalCells: Int get() = size * size
    val estimatedMemoryBytes: Long get() = totalCells * ESTIMATED_CELL_SIZE_BYTES
    
    companion object {
        private const val ESTIMATED_CELL_SIZE_BYTES = 128L // Rough estimate for GridCell
    }
}

/**
 * Mobile-optimized pattern generation engine
 * 
 * Features:
 * - Memory-efficient lazy evaluation
 * - Coroutine-based async processing  
 * - Battery-conscious algorithms
 * - Performance monitoring
 * - Unicode emoji validation
 * 
 * @param maxPatternSize Maximum allowed pattern size for memory safety
 * @param enablePerformanceMetrics Whether to collect detailed performance data
 */
class PatternGenerator(
    private val maxPatternSize: Int = 21, // Reasonable limit for mobile
    private val enablePerformanceMetrics: Boolean = true
) {
    companion object {
        private const val MAX_SEQUENCE_LENGTH = 10
        private const val MIN_CELL_SIZE = 16
        private const val MAX_CELL_SIZE = 64
        private const val BASE_CELL_SIZE = 40
        
        /**
         * Calculate optimal dimensions for a pattern sequence
         */
        fun calculateDimensions(sequenceLength: Int): PatternDimensions {
            val size = (sequenceLength * 2) - 1
            val cellSize = when {
                size > 15 -> 20
                size > 11 -> 24  
                size > 7 -> 32
                else -> BASE_CELL_SIZE
            }.coerceIn(MIN_CELL_SIZE, MAX_CELL_SIZE)
            
            return PatternDimensions(size, cellSize)
        }
        
        /**
         * Validate emoji sequence for mobile constraints
         */
        fun validateSequence(sequence: List<String>): ValidationResult {
            return when {
                sequence.isEmpty() -> ValidationResult.Error("Sequence cannot be empty")
                sequence.size > MAX_SEQUENCE_LENGTH -> 
                    ValidationResult.Error("Sequence too long (max $MAX_SEQUENCE_LENGTH)")
                sequence.any { !isValidEmoji(it) } -> 
                    ValidationResult.Error("Invalid emoji detected")
                else -> ValidationResult.Success
            }
        }
        
        /**
         * Enhanced emoji validation supporting complex Unicode sequences
         */
        private fun isValidEmoji(emoji: String): Boolean {
            if (emoji.isEmpty() || emoji.length > 8) return false
            
            // Check for valid emoji using Unicode properties
            return emoji.codePoints().anyMatch { codePoint ->
                Character.getType(codePoint) == Character.OTHER_SYMBOL.toInt() ||
                // Check emoji ranges
                codePoint in 0x1F600..0x1F64F || // Emoticons
                codePoint in 0x1F300..0x1F5FF || // Misc Symbols and Pictographs
                codePoint in 0x1F680..0x1F6FF || // Transport and Map
                codePoint in 0x1F1E6..0x1F1FF || // Regional indicators
                codePoint in 0x2600..0x26FF ||   // Misc symbols
                codePoint in 0x2700..0x27BF ||   // Dingbats
                codePoint in 0xFE00..0xFE0F ||   // Variation selectors
                codePoint in 0x1F900..0x1F9FF    // Supplemental Symbols and Pictographs
            }
        }
    }
    
    /**
     * Generate concentric square pattern asynchronously
     * 
     * @param sequence List of emojis from center to outer layers
     * @param mode Pattern generation mode
     * @return PatternResult with grid and performance metrics
     */
    suspend fun generateConcentricPattern(
        sequence: List<String>,
        mode: PatternMode = PatternMode.CONCENTRIC
    ): Result<PatternResult> = withContext(Dispatchers.Default) {
        val startTime = System.currentTimeMillis()
        
        try {
            // Validate input
            when (val validation = validateSequence(sequence)) {
                is ValidationResult.Error -> return@withContext Result.failure(
                    IllegalArgumentException(validation.message)
                )
                ValidationResult.Success -> Unit
            }
            
            val dimensions = calculateDimensions(sequence.size)
            
            // Memory safety check
            if (dimensions.size > maxPatternSize) {
                return@withContext Result.failure(
                    IllegalArgumentException("Pattern size ${dimensions.size} exceeds maximum $maxPatternSize")
                )
            }
            
            // Generate pattern grid
            val grid = createEmptyGrid(dimensions.size)
            val center = dimensions.size / 2
            
            // Fill layers from center outward (concentric mode)
            sequence.forEachIndexed { index, emoji ->
                val distance = index // Direct mapping: index 0 = center, index 1 = layer 1, etc.
                fillSquareLayer(grid, center, distance, emoji, index)
                
                // Yield to prevent blocking on large patterns
                if (index % 2 == 0) yield()
            }
            
            val endTime = System.currentTimeMillis()
            val complexity = PatternComplexity.fromSequenceLength(sequence.size)
            
            val result = PatternResult(
                grid = grid,
                dimensions = dimensions,
                complexity = complexity,
                generationTimeMs = endTime - startTime,
                memoryUsageBytes = if (enablePerformanceMetrics) dimensions.estimatedMemoryBytes else 0L
            )
            
            Result.success(result)
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Create empty grid with optimized memory allocation
     */
    private fun createEmptyGrid(size: Int): Array<Array<GridCell?>> {
        return Array(size) { Array<GridCell?>(size) { null } }
    }
    
    /**
     * Fill a square layer in the pattern with mobile-optimized algorithm
     */
    private fun fillSquareLayer(
        grid: Array<Array<GridCell?>>,
        center: Int,
        distance: Int,
        emoji: String,
        layer: Int
    ) {
        val startRow = center - distance
        val endRow = center + distance
        val startCol = center - distance
        val endCol = center + distance
        
        for (row in startRow..endRow) {
            for (col in startCol..endCol) {
                // Only fill perimeter of current layer
                if (row == startRow || row == endRow || col == startCol || col == endCol) {
                    grid[row][col] = GridCell(
                        emoji = emoji,
                        row = row,
                        col = col,
                        layer = layer,
                        isCenter = row == center && col == center,
                        metadata = CellMetadata(source = CellSource.USER)
                    )
                }
            }
        }
    }
    
    /**
     * Extract sequence from existing pattern for analysis
     */
    suspend fun extractSequenceFromPattern(
        grid: Array<Array<GridCell?>>
    ): List<String> = withContext(Dispatchers.Default) {
        val layerMap = mutableMapOf<Int, String>()
        
        grid.forEach { row ->
            row.forEach { cell ->
                cell?.let { 
                    if (!layerMap.containsKey(it.layer)) {
                        layerMap[it.layer] = it.emoji
                    }
                }
            }
        }
        
        // Sort by layer index (center to outer)
        layerMap.toSortedMap().values.toList()
    }
    
    /**
     * Generate accessibility description for pattern
     */
    suspend fun generateAccessibilityInfo(
        grid: Array<Array<GridCell?>>
    ): PatternAccessibilityInfo = withContext(Dispatchers.Default) {
        val sequence = extractSequenceFromPattern(grid)
        val size = grid.size
        
        if (sequence.isEmpty()) {
            return@withContext PatternAccessibilityInfo(
                altText = "Empty pattern canvas",
                description = "An empty pattern canvas ready for emoji placement",
                sequenceDescription = "No emojis in sequence",
                spatialDescription = "Empty grid layout"
            )
        }
        
        PatternAccessibilityInfo(
            altText = "Emoji pattern: ${sequence.joinToString(" ")} arranged in ${size}×${size} concentric squares",
            description = "A $size by $size grid pattern with emojis arranged in concentric squares. " +
                         "The center contains ${sequence.first()}, working outward to ${sequence.last()}.",
            sequenceDescription = "Emoji sequence from center to edge: ${
                sequence.mapIndexed { i, emoji -> "${i + 1}. $emoji" }.joinToString(", ")
            }",
            spatialDescription = "Grid layout: $size rows by $size columns, symmetrical pattern radiating from center"
        )
    }
    
    /**
     * Optimize pattern for mobile rendering
     */
    suspend fun optimizeForMobile(
        result: PatternResult,
        targetCellSize: Int = 32
    ): PatternResult = withContext(Dispatchers.Default) {
        val optimizedDimensions = result.dimensions.copy(cellSize = targetCellSize)
        
        result.copy(dimensions = optimizedDimensions)
    }
}

/**
 * Validation result for input checking
 */
sealed class ValidationResult {
    object Success : ValidationResult()
    data class Error(val message: String) : ValidationResult()
}

/**
 * Accessibility information for screen readers and assistive technology
 */
data class PatternAccessibilityInfo(
    val altText: String,
    val description: String,
    val sequenceDescription: String,
    val spatialDescription: String
)