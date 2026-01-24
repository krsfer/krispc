/**
 * Unit Tests for PatternGenerator - Mobile-Optimized Kotlin Implementation
 * 
 * Comprehensive test suite covering:
 * - Pattern generation algorithms
 * - Memory optimization validation
 * - Performance benchmarking
 * - Edge case handling
 * - Accessibility features
 * - Error conditions
 */
package com.emoty.services.test

import com.emoty.services.*
import kotlinx.coroutines.*
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*
import kotlin.test.*
import kotlin.system.measureTimeMillis

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PatternGeneratorTest {
    
    private lateinit var patternGenerator: PatternGenerator
    
    @BeforeEach
    fun setUp() {
        patternGenerator = PatternGenerator(
            maxPatternSize = 21,
            enablePerformanceMetrics = true
        )
    }
    
    @Test
    fun `test basic concentric pattern generation`() = runTest {
        // Given
        val sequence = listOf("😀", "❤️", "🌟")
        
        // When
        val result = patternGenerator.generateConcentricPattern(sequence)
        
        // Then
        assertTrue(result.isSuccess)
        val patternResult = result.getOrThrow()
        
        assertEquals(5, patternResult.dimensions.size) // (3*2)-1 = 5
        assertEquals(PatternComplexity.MODERATE, patternResult.complexity)
        assertNotNull(patternResult.grid)
        assertTrue(patternResult.generationTimeMs >= 0)
    }
    
    @Test
    fun `test empty sequence validation`() = runTest {
        // Given
        val emptySequence = emptyList<String>()
        
        // When
        val result = patternGenerator.generateConcentricPattern(emptySequence)
        
        // Then
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }
    
    @Test
    fun `test pattern dimensions calculation`() {
        // Test various sequence lengths
        val testCases = mapOf(
            1 to 1,  // (1*2)-1 = 1
            2 to 3,  // (2*2)-1 = 3  
            3 to 5,  // (3*2)-1 = 5
            4 to 7,  // (4*2)-1 = 7
            10 to 19 // (10*2)-1 = 19
        )
        
        testCases.forEach { (sequenceLength, expectedSize) ->
            val dimensions = PatternGenerator.calculateDimensions(sequenceLength)
            assertEquals(expectedSize, dimensions.size, "Failed for sequence length $sequenceLength")
            assertTrue(dimensions.cellSize in 20..40, "Cell size out of expected range")
        }
    }
    
    @Test
    fun `test emoji validation`() {
        val validEmojis = listOf("😀", "❤️", "🌟", "👨‍👩‍👧‍👦", "🏳️‍🌈")
        val invalidInputs = listOf("", "abc", "123", " ", "\n")
        
        validEmojis.forEach { emoji ->
            val result = PatternGenerator.validateSequence(listOf(emoji))
            assertEquals(ValidationResult.Success, result, "Failed validation for: $emoji")
        }
        
        invalidInputs.forEach { invalid ->
            val result = PatternGenerator.validateSequence(listOf(invalid))
            assertTrue(result is ValidationResult.Error, "Should have failed for: $invalid")
        }
    }
    
    @Test
    fun `test pattern grid structure`() = runTest {
        // Given
        val sequence = listOf("😀", "❤️")
        
        // When
        val result = patternGenerator.generateConcentricPattern(sequence)
        val patternResult = result.getOrThrow()
        val grid = patternResult.grid
        
        // Then
        assertEquals(3, grid.size) // 3x3 grid
        assertEquals(3, grid[0].size)
        
        // Check center cell
        val center = grid[1][1]
        assertNotNull(center)
        assertEquals("😀", center!!.emoji)
        assertEquals(1, center.row)
        assertEquals(1, center.col)
        assertEquals(0, center.layer)
        assertTrue(center.isCenter)
        
        // Check outer layer
        val corner = grid[0][0]
        assertNotNull(corner)
        assertEquals("❤️", corner!!.emoji)
        assertEquals(0, corner.row)
        assertEquals(0, corner.col)
        assertEquals(1, corner.layer)
        assertFalse(corner.isCenter)
    }
    
    @Test
    fun `test sequence extraction from pattern`() = runTest {
        // Given
        val originalSequence = listOf("😀", "❤️", "🌟")
        val patternResult = patternGenerator.generateConcentricPattern(originalSequence).getOrThrow()
        
        // When
        val extractedSequence = patternGenerator.extractSequenceFromPattern(patternResult.grid)
        
        // Then
        assertEquals(originalSequence, extractedSequence)
    }
    
    @Test
    fun `test accessibility info generation`() = runTest {
        // Given
        val sequence = listOf("😀", "❤️")
        val patternResult = patternGenerator.generateConcentricPattern(sequence).getOrThrow()
        
        // When
        val accessibilityInfo = patternGenerator.generateAccessibilityInfo(patternResult.grid)
        
        // Then
        assertNotNull(accessibilityInfo.altText)
        assertNotNull(accessibilityInfo.description)
        assertNotNull(accessibilityInfo.sequenceDescription)
        assertNotNull(accessibilityInfo.spatialDescription)
        
        assertTrue(accessibilityInfo.altText.contains("😀"))
        assertTrue(accessibilityInfo.altText.contains("❤️"))
        assertTrue(accessibilityInfo.description.contains("3 by 3"))
    }
    
    @Test
    fun `test empty pattern accessibility`() = runTest {
        // Given
        val emptyGrid = arrayOf<Array<GridCell?>>()
        
        // When
        val accessibilityInfo = patternGenerator.generateAccessibilityInfo(emptyGrid)
        
        // Then
        assertEquals("Empty pattern canvas", accessibilityInfo.altText)
        assertEquals("No emojis in sequence", accessibilityInfo.sequenceDescription)
    }
    
    @Test
    fun `test complexity calculation`() {
        val testCases = mapOf(
            listOf("😀") to PatternComplexity.SIMPLE,
            listOf("😀", "❤️") to PatternComplexity.SIMPLE,
            listOf("😀", "❤️", "🌟") to PatternComplexity.MODERATE,
            listOf("😀", "❤️", "🌟", "🎉", "🔥") to PatternComplexity.MODERATE,
            listOf("😀", "❤️", "🌟", "🎉", "🔥", "⭐") to PatternComplexity.COMPLEX
        )
        
        testCases.forEach { (sequence, expectedComplexity) ->
            val complexity = PatternGenerator.calculateComplexity(sequence)
            assertEquals(expectedComplexity, complexity, "Failed for sequence: $sequence")
        }
    }
    
    @Test
    fun `test mobile optimization`() = runTest {
        // Given
        val sequence = listOf("😀", "❤️", "🌟", "🎉")
        val originalResult = patternGenerator.generateConcentricPattern(sequence).getOrThrow()
        
        // When
        val optimizedResult = patternGenerator.optimizeForMobile(originalResult, targetCellSize = 24)
        
        // Then
        assertEquals(24, optimizedResult.dimensions.cellSize)
        assertEquals(originalResult.dimensions.size, optimizedResult.dimensions.size)
        assertEquals(originalResult.complexity, optimizedResult.complexity)
    }
    
    @Test
    fun `test performance with large patterns`() = runTest {
        // Given
        val largeSequence = (1..8).map { "😀" } // 8 emojis = 15x15 grid
        
        // When
        val executionTime = measureTimeMillis {
            val result = patternGenerator.generateConcentricPattern(largeSequence)
            assertTrue(result.isSuccess)
        }
        
        // Then
        assertTrue(executionTime < 1000, "Pattern generation took too long: ${executionTime}ms")
    }
    
    @Test
    fun `test memory constraints`() = runTest {
        // Given - sequence that would exceed max pattern size
        val patternGeneratorWithSmallLimit = PatternGenerator(maxPatternSize = 5)
        val largeSequence = (1..5).map { "😀" } // Would create 9x9 grid
        
        // When
        val result = patternGeneratorWithSmallLimit.generateConcentricPattern(largeSequence)
        
        // Then
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }
    
    @Test
    fun `test concurrent pattern generation`() = runTest {
        // Given
        val sequences = listOf(
            listOf("😀", "❤️"),
            listOf("🌟", "🎉"),
            listOf("🔥", "⭐"),
            listOf("🎨", "🎭")
        )
        
        // When
        val results = sequences.map { sequence ->
            async {
                patternGenerator.generateConcentricPattern(sequence)
            }
        }.awaitAll()
        
        // Then
        results.forEach { result ->
            assertTrue(result.isSuccess)
        }
    }
    
    @Test
    fun `test pattern state creation`() {
        // Given
        val sequence = listOf("😀", "❤️", "🌟")
        
        // When
        val patternState = PatternGenerator.createPatternState(sequence, PatternMode.CONCENTRIC)
        
        // Then
        assertEquals(sequence, patternState.sequence)
        assertEquals(sequence.size, patternState.insertionIndex)
        assertEquals(5, patternState.patternSize) // (3*2)-1
        assertEquals(PatternMode.CONCENTRIC, patternState.patternMode)
        assertEquals(PatternMode.CONCENTRIC, patternState.activeInsertionMode)
        assertFalse(patternState.isFavorite ?: true)
        assertNotNull(patternState.createdAt)
        assertEquals(PatternComplexity.MODERATE.name.lowercase(), patternState.metadata?.complexity)
    }
    
    @Test
    fun `test unicode emoji support`() = runTest {
        // Given - various complex emoji sequences
        val complexEmojis = listOf(
            "👨‍👩‍👧‍👦", // Family sequence with ZWJ
            "🏳️‍🌈",      // Flag sequence
            "👋🏽",        // Emoji with skin tone
            "🇺🇸",        // Country flag
            "🤷‍♀️"        // Person shrugging with gender
        )
        
        // When & Then
        complexEmojis.forEach { emoji ->
            val result = patternGenerator.generateConcentricPattern(listOf(emoji))
            assertTrue(result.isSuccess, "Failed for complex emoji: $emoji")
            
            val patternResult = result.getOrThrow()
            val grid = patternResult.grid
            assertNotNull(grid[0][0])
            assertEquals(emoji, grid[0][0]!!.emoji)
        }
    }
    
    @Test
    fun `test error handling for malformed input`() = runTest {
        val malformedInputs = listOf(
            listOf(""), // Empty string
            (1..15).map { "😀" }, // Too many emojis
            listOf("not_an_emoji")
        )
        
        malformedInputs.forEach { input ->
            val result = patternGenerator.generateConcentricPattern(input)
            assertTrue(result.isFailure, "Should have failed for input: $input")
        }
    }
    
    @Test 
    fun `test cell metadata creation`() = runTest {
        // Given
        val sequence = listOf("😀")
        
        // When
        val result = patternGenerator.generateConcentricPattern(sequence).getOrThrow()
        val grid = result.grid
        val centerCell = grid[0][0]!!
        
        // Then
        assertNotNull(centerCell.metadata)
        assertEquals(CellSource.USER, centerCell.metadata!!.source)
        assertTrue(centerCell.metadata.addedAt > 0)
    }
    
    @Test
    fun `test pattern validation edge cases`() {
        // Test boundary conditions
        val edgeCases = mapOf(
            // Maximum allowed sequence
            (1..PatternGenerator.validateSequence(emptyList())).map { "😀" } to true,
            // Single emoji
            listOf("😀") to true,
            // Mixed emoji types
            listOf("😀", "🌟", "🎉", "❤️") to true
        )
        
        edgeCases.forEach { (sequence, shouldBeValid) ->
            if (sequence.isNotEmpty()) {
                val result = PatternGenerator.validateSequence(sequence)
                if (shouldBeValid) {
                    assertEquals(ValidationResult.Success, result)
                } else {
                    assertTrue(result is ValidationResult.Error)
                }
            }
        }
    }
}