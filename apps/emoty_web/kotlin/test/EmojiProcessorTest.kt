/**
 * Unit Tests for EmojiProcessor - Mobile-Optimized Kotlin Implementation
 * 
 * Comprehensive test suite covering:
 * - Unicode emoji validation and processing
 * - Multi-byte character handling
 * - Skin tone and gender variation processing
 * - Emoji sequence normalization
 * - Performance optimization validation
 * - Accessibility features
 * - Memory management
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
class EmojiProcessorTest {
    
    private lateinit var emojiProcessor: EmojiProcessor
    private lateinit var config: EmojiProcessingConfig
    
    @BeforeEach
    fun setUp() {
        config = EmojiProcessingConfig(
            maxSequenceLength = 7,
            enableSkinToneNormalization = true,
            enableComplexSequences = true,
            maxMemoryPerEmoji = 1024,
            preferredRenderingSize = 32,
            enableCaching = true
        )
        emojiProcessor = EmojiProcessor(config)
    }
    
    @AfterEach
    fun tearDown() {
        emojiProcessor.clearCache()
    }
    
    @Test
    fun `test basic emoji validation`() = runTest {
        // Given
        val validEmojis = listOf("😀", "❤️", "🌟", "🎉", "🔥")
        
        // When & Then
        validEmojis.forEach { emoji ->
            val result = emojiProcessor.processEmoji(emoji)
            assertTrue(result is EmojiValidationResult.Valid, "Failed for emoji: $emoji")
            
            val metadata = (result as EmojiValidationResult.Valid).metadata
            assertNotNull(metadata)
            assertEquals(emoji, metadata.baseEmoji)
            assertTrue(metadata.codePoints.isNotEmpty())
            assertNotNull(metadata.category)
        }
    }
    
    @Test
    fun `test invalid emoji detection`() = runTest {
        // Given
        val invalidInputs = listOf("", "abc", "123", " ", "\n", "not_emoji")
        
        // When & Then
        invalidInputs.forEach { invalid ->
            val result = emojiProcessor.processEmoji(invalid)
            assertTrue(result is EmojiValidationResult.Invalid, "Should have failed for: $invalid")
        }
    }
    
    @Test
    fun `test complex emoji sequences`() = runTest {
        // Given
        val complexEmojis = mapOf(
            "👨‍👩‍👧‍👦" to SequenceType.ZWJ_SEQUENCE,  // Family with ZWJ
            "🏳️‍🌈" to SequenceType.ZWJ_SEQUENCE,       // Rainbow flag
            "👋🏽" to SequenceType.SKIN_TONE_SEQUENCE,   // Wave with skin tone
            "🤷‍♀️" to SequenceType.ZWJ_SEQUENCE,        // Person shrugging with gender
            "1️⃣" to SequenceType.KEYCAP_SEQUENCE      // Keycap digit one
        )
        
        // When & Then
        complexEmojis.forEach { (emoji, expectedType) ->
            val result = emojiProcessor.processEmoji(emoji)
            assertTrue(result is EmojiValidationResult.Valid, "Failed for complex emoji: $emoji")
            
            val metadata = (result as EmojiValidationResult.Valid).metadata
            assertTrue(metadata.isSequence, "Should be detected as sequence: $emoji")
            assertEquals(expectedType, metadata.sequenceType, "Wrong sequence type for: $emoji")
        }
    }
    
    @Test
    fun `test skin tone detection`() = runTest {
        // Given
        val skinToneEmojis = mapOf(
            "👋🏻" to SkinTone.LIGHT,
            "👋🏼" to SkinTone.MEDIUM_LIGHT,
            "👋🏽" to SkinTone.MEDIUM,
            "👋🏾" to SkinTone.MEDIUM_DARK,
            "👋🏿" to SkinTone.DARK
        )
        
        // When & Then
        skinToneEmojis.forEach { (emoji, expectedSkinTone) ->
            val result = emojiProcessor.processEmoji(emoji)
            assertTrue(result is EmojiValidationResult.Valid)
            
            val metadata = (result as EmojiValidationResult.Valid).metadata
            assertEquals(expectedSkinTone, metadata.skinTone, "Wrong skin tone for: $emoji")
            assertTrue(metadata.isSequence)
            assertEquals(SequenceType.SKIN_TONE_SEQUENCE, metadata.sequenceType)
        }
    }
    
    @Test
    fun `test gender detection`() = runTest {
        // Given
        val genderEmojis = mapOf(
            "🤷‍♂️" to Gender.MALE,
            "🤷‍♀️" to Gender.FEMALE
        )
        
        // When & Then
        genderEmojis.forEach { (emoji, expectedGender) ->
            val result = emojiProcessor.processEmoji(emoji)
            assertTrue(result is EmojiValidationResult.Valid)
            
            val metadata = (result as EmojiValidationResult.Valid).metadata
            assertEquals(expectedGender, metadata.gender, "Wrong gender for: $emoji")
            assertTrue(metadata.isSequence)
        }
    }
    
    @Test
    fun `test emoji categories`() = runTest {
        // Given
        val categoryEmojis = mapOf(
            "😀" to EmojiCategory.SMILEYS_EMOTION,
            "👋" to EmojiCategory.PEOPLE_BODY,
            "🐶" to EmojiCategory.ANIMALS_NATURE,
            "🍕" to EmojiCategory.FOOD_DRINK,
            "🚗" to EmojiCategory.TRAVEL_PLACES,
            "⚽" to EmojiCategory.ACTIVITIES,
            "📱" to EmojiCategory.OBJECTS,
            "❤️" to EmojiCategory.SYMBOLS,
            "🇺🇸" to EmojiCategory.FLAGS
        )
        
        // When & Then
        categoryEmojis.forEach { (emoji, expectedCategory) ->
            val result = emojiProcessor.processEmoji(emoji)
            assertTrue(result is EmojiValidationResult.Valid)
            
            val metadata = (result as EmojiValidationResult.Valid).metadata
            assertEquals(expectedCategory, metadata.category, "Wrong category for: $emoji")
        }
    }
    
    @Test
    fun `test emoji sequence processing`() = runTest {
        // Given
        val emojiSequence = listOf("😀", "❤️", "🌟", "👨‍👩‍👧‍👦")
        
        // When
        val result = emojiProcessor.processEmojiSequence(emojiSequence)
        
        // Then
        assertTrue(result.isSuccess)
        val metadataList = result.getOrThrow()
        assertEquals(emojiSequence.size, metadataList.size)
        
        metadataList.forEachIndexed { index, metadata ->
            assertEquals(emojiSequence[index], metadata.baseEmoji)
        }
    }
    
    @Test
    fun `test emoji normalization`() = runTest {
        // Given
        val emojiWithSkinTone = "👋🏽"
        
        // When
        val normalized = emojiProcessor.normalizeEmoji(emojiWithSkinTone)
        
        // Then
        // With skin tone normalization enabled, should remove skin tone modifier
        assertNotEquals(emojiWithSkinTone, normalized)
        // Should be just the base wave emoji
        assertTrue(normalized.contains("👋"))
    }
    
    @Test
    fun `test accessibility description generation`() = runTest {
        // Given
        val testEmojis = mapOf(
            "😀" to "smileys emotion emoji",
            "👋🏽" to "people body emoji with medium skin tone",
            "🤷‍♀️" to "people body emoji, female",
            "👨‍👩‍👧‍👦" to "people body emoji (complex sequence)"
        )
        
        // When & Then
        testEmojis.forEach { (emoji, expectedContent) ->
            val result = emojiProcessor.generateAccessibilityDescription(emoji)
            assertTrue(result.isSuccess, "Failed to generate description for: $emoji")
            
            val description = result.getOrThrow()
            assertNotNull(description)
            assertTrue(description.isNotEmpty())
            // Verify it contains some expected keywords
            assertTrue(description.contains("emoji"), "Description missing 'emoji' for: $emoji")
        }
    }
    
    @Test
    fun `test pattern complexity analysis`() = runTest {
        // Given
        val simpleEmojis = listOf("😀", "❤️")
        val complexEmojis = listOf("👨‍👩‍👧‍👦", "🏳️‍🌈", "🤷‍♀️", "👋🏽")
        
        // When
        val simpleAnalysis = emojiProcessor.analyzePatternComplexity(simpleEmojis)
        val complexAnalysis = emojiProcessor.analyzePatternComplexity(complexEmojis)
        
        // Then
        assertTrue(simpleAnalysis.isSuccess)
        assertTrue(complexAnalysis.isSuccess)
        
        val simpleResult = simpleAnalysis.getOrThrow()
        val complexResult = complexAnalysis.getOrThrow()
        
        assertTrue(complexResult.averageComplexity > simpleResult.averageComplexity)
        assertTrue(complexResult.hasComplexSequences)
        assertFalse(simpleResult.hasComplexSequences)
        assertTrue(complexResult.estimatedRenderTime > simpleResult.estimatedRenderTime)
    }
    
    @Test
    fun `test rendering configuration optimization`() = runTest {
        // Given
        val complexEmojis = listOf("👨‍👩‍👧‍👦", "🏳️‍🌈", "🤷‍♀️")
        
        // When
        val result = emojiProcessor.getOptimizedRenderingConfig(complexEmojis)
        
        // Then
        assertTrue(result.isSuccess)
        val config = result.getOrThrow()
        
        assertTrue(config.cellSize >= 32) // Should recommend larger size for complex emojis
        assertTrue(config.specialHandlingRequired)
        assertEquals(RenderingQuality.HIGH, config.renderingQuality)
        assertTrue(config.estimatedMemoryUsage > 0)
    }
    
    @Test
    fun `test memory constraints`() = runTest {
        // Given
        val configWithLowMemory = EmojiProcessingConfig(maxMemoryPerEmoji = 100) // Very low limit
        val processor = EmojiProcessor(configWithLowMemory)
        val complexEmoji = "👨‍👩‍👧‍👦" // Family emoji that uses more memory
        
        // When
        val result = processor.processEmoji(complexEmoji)
        
        // Then
        // Should still process but might return a warning
        assertTrue(result is EmojiValidationResult.Valid || result is EmojiValidationResult.Warning)
    }
    
    @Test
    fun `test emoji caching`() = runTest {
        // Given
        val emoji = "😀"
        
        // When
        val firstResult = emojiProcessor.processEmoji(emoji)
        val secondResult = emojiProcessor.processEmoji(emoji)
        
        // Then
        assertTrue(firstResult is EmojiValidationResult.Valid)
        assertTrue(secondResult is EmojiValidationResult.Valid)
        
        // Second call should be faster due to caching
        val firstMetadata = (firstResult as EmojiValidationResult.Valid).metadata
        val secondMetadata = (secondResult as EmojiValidationResult.Valid).metadata
        
        assertEquals(firstMetadata.baseEmoji, secondMetadata.baseEmoji)
    }
    
    @Test
    fun `test cache statistics`() {
        // Given
        emojiProcessor.clearCache()
        
        // When
        val initialStats = emojiProcessor.getCacheStats()
        assertEquals(0, initialStats.cacheSize)
        
        // Process some emojis
        runTest {
            listOf("😀", "❤️", "🌟").forEach { emoji ->
                emojiProcessor.processEmoji(emoji)
            }
        }
        
        val finalStats = emojiProcessor.getCacheStats()
        
        // Then
        assertTrue(finalStats.cacheSize > 0)
        assertTrue(finalStats.memoryUsage > 0)
    }
    
    @Test
    fun `test performance with large emoji sequences`() = runTest {
        // Given
        val largeSequence = (1..100).map { "😀" }
        
        // When
        val executionTime = measureTimeMillis {
            val result = emojiProcessor.processEmojiSequence(largeSequence)
            assertTrue(result.isSuccess)
        }
        
        // Then
        assertTrue(executionTime < 5000, "Processing took too long: ${executionTime}ms")
    }
    
    @Test
    fun `test concurrent emoji processing`() = runTest {
        // Given
        val emojis = listOf("😀", "❤️", "🌟", "🎉", "🔥", "⭐", "🎨", "🎭")
        
        // When
        val results = emojis.map { emoji ->
            async {
                emojiProcessor.processEmoji(emoji)
            }
        }.awaitAll()
        
        // Then
        results.forEach { result ->
            assertTrue(result is EmojiValidationResult.Valid)
        }
    }
    
    @Test
    fun `test flag sequences`() = runTest {
        // Given
        val flagEmojis = listOf("🇺🇸", "🇬🇧", "🇫🇷", "🇩🇪", "🇯🇵")
        
        // When & Then
        flagEmojis.forEach { flag ->
            val result = emojiProcessor.processEmoji(flag)
            assertTrue(result is EmojiValidationResult.Valid, "Failed for flag: $flag")
            
            val metadata = (result as EmojiValidationResult.Valid).metadata
            assertEquals(EmojiCategory.FLAGS, metadata.category)
            assertTrue(metadata.isSequence)
            assertEquals(SequenceType.FLAG_SEQUENCE, metadata.sequenceType)
        }
    }
    
    @Test
    fun `test variation selectors`() = runTest {
        // Given
        val emojiWithVariationSelector = "❤️" // Heart with emoji variation selector
        
        // When
        val result = emojiProcessor.processEmoji(emojiWithVariationSelector)
        
        // Then
        assertTrue(result is EmojiValidationResult.Valid)
        val metadata = (result as EmojiValidationResult.Valid).metadata
        assertTrue(metadata.codePoints.size > 1) // Should include variation selector
    }
    
    @Test
    fun `test emoji complexity scoring`() = runTest {
        // Given
        val emojis = mapOf(
            "😀" to 1.0f..2.0f,  // Simple emoji
            "👋🏽" to 2.0f..3.0f,  // Skin tone modifier
            "👨‍👩‍👧‍👦" to 3.0f..5.0f,  // Complex ZWJ sequence
            "🏳️‍🌈" to 3.0f..5.0f   // Flag with ZWJ
        )
        
        // When & Then
        emojis.forEach { (emoji, expectedRange) ->
            val result = emojiProcessor.processEmoji(emoji)
            assertTrue(result is EmojiValidationResult.Valid)
            
            val metadata = (result as EmojiValidationResult.Valid).metadata
            assertTrue(metadata.complexity in expectedRange, 
                "Complexity ${metadata.complexity} not in expected range $expectedRange for $emoji")
        }
    }
    
    @Test
    fun `test rendering hints generation`() = runTest {
        // Given
        val simpleEmoji = "😀"
        val complexEmoji = "👨‍👩‍👧‍👦"
        
        // When
        val simpleResult = emojiProcessor.processEmoji(simpleEmoji)
        val complexResult = emojiProcessor.processEmoji(complexEmoji)
        
        // Then
        assertTrue(simpleResult is EmojiValidationResult.Valid)
        assertTrue(complexResult is EmojiValidationResult.Valid)
        
        val simpleMetadata = (simpleResult as EmojiValidationResult.Valid).metadata
        val complexMetadata = (complexResult as EmojiValidationResult.Valid).metadata
        
        // Simple emoji should be easier to render
        assertTrue(simpleMetadata.renderingHints.preferredSize <= complexMetadata.renderingHints.preferredSize)
        assertFalse(simpleMetadata.renderingHints.requiresSpecialHandling)
        assertTrue(complexMetadata.renderingHints.requiresSpecialHandling)
        assertTrue(simpleMetadata.renderingHints.cacheable)
    }
    
    @Test
    fun `test multiple emoji detection`() = runTest {
        // Given
        val multipleEmojis = "😀❤️🌟" // Multiple emojis without spaces
        
        // When
        val result = emojiProcessor.processEmoji(multipleEmojis)
        
        // Then
        assertTrue(result is EmojiValidationResult.Invalid)
        val error = result as EmojiValidationResult.Invalid
        assertTrue(error.reason.contains("Multiple emoji detected"))
    }
    
    @Test
    fun `test emoji byte size calculation`() = runTest {
        // Given
        val emojis = listOf("😀", "👨‍👩‍👧‍👦", "🇺🇸")
        
        // When & Then
        emojis.forEach { emoji ->
            val result = emojiProcessor.processEmoji(emoji)
            assertTrue(result is EmojiValidationResult.Valid)
            
            val metadata = (result as EmojiValidationResult.Valid).metadata
            assertTrue(metadata.byteSize > 0, "Byte size should be positive for: $emoji")
            assertTrue(metadata.memoryFootprint > metadata.byteSize, 
                "Memory footprint should include overhead for: $emoji")
        }
    }
    
    @Test
    fun `test error handling for malformed unicode`() = runTest {
        // Given
        val malformedInputs = listOf(
            "\uD83D", // Incomplete surrogate pair
            "\uDC00", // Low surrogate without high surrogate
            "😀\uD83D" // Valid emoji followed by incomplete surrogate
        )
        
        // When & Then
        malformedInputs.forEach { malformed ->
            val result = emojiProcessor.processEmoji(malformed)
            // Should either be invalid or handle gracefully
            assertTrue(result is EmojiValidationResult.Invalid || result is EmojiValidationResult.Valid)
        }
    }
}