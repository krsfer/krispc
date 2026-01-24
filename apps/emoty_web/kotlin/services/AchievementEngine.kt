/**
 * Achievement Engine - Mobile-Optimized Kotlin Implementation
 * 
 * Comprehensive user progression and achievement system designed for mobile gaming mechanics.
 * Features sophisticated progression tracking, achievement unlocking, and level advancement
 * with performance-optimized algorithms and battery-conscious background processing.
 * 
 * Features:
 * - Sealed class hierarchies for type-safe achievement definitions
 * - Real-time progression tracking with Flow-based reactivity
 * - Level advancement with unlock gates and feature progression
 * - Reputation scoring with social engagement metrics
 * - Background achievement checking with batched operations
 * - Localized achievement content (English/French)
 * - Achievement analytics and user behavior insights
 */
package com.emoty.services

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.util.*
import kotlin.math.*

/**
 * Achievement progression tracking with type safety
 */
sealed class AchievementProgress {
    abstract val achievement: AchievementDefinition
    abstract val currentValue: Int
    abstract val targetValue: Int
    abstract val isUnlocked: Boolean
    
    val progressPercentage: Float 
        get() = if (isUnlocked) 100f else (currentValue.toFloat() / targetValue * 100f).coerceAtMost(100f)
    
    val remainingValue: Int
        get() = (targetValue - currentValue).coerceAtLeast(0)
    
    data class Locked(
        override val achievement: AchievementDefinition,
        override val currentValue: Int,
        override val targetValue: Int
    ) : AchievementProgress() {
        override val isUnlocked: Boolean = false
    }
    
    data class Unlocked(
        override val achievement: AchievementDefinition,
        override val currentValue: Int,
        override val targetValue: Int,
        val unlockedAt: Long = System.currentTimeMillis()
    ) : AchievementProgress() {
        override val isUnlocked: Boolean = true
        
        val timeSinceUnlock: Long get() = System.currentTimeMillis() - unlockedAt
    }
    
    data class InProgress(
        override val achievement: AchievementDefinition,
        override val currentValue: Int,
        override val targetValue: Int,
        val progressRate: Float = 0f // Progress per hour
    ) : AchievementProgress() {
        override val isUnlocked: Boolean = false
        
        val estimatedCompletionTime: Long?
            get() = if (progressRate > 0) {
                ((targetValue - currentValue) / progressRate * 3600000).toLong()
            } else null
    }
}

/**
 * Achievement categories with semantic grouping
 */
sealed class AchievementCategory(val key: String, val order: Int) {
    object PatternCreation : AchievementCategory("pattern_creation", 1)
    object SocialEngagement : AchievementCategory("social_engagement", 2)
    object Exploration : AchievementCategory("exploration", 3)
    object AIInteraction : AchievementCategory("ai_interaction", 4)
    object Accessibility : AchievementCategory("accessibility", 5)
    object Special : AchievementCategory("special", 6)
    
    companion object {
        fun fromString(key: String): AchievementCategory? = when (key) {
            "pattern_creation" -> PatternCreation
            "social_engagement" -> SocialEngagement
            "exploration" -> Exploration
            "ai_interaction" -> AIInteraction
            "accessibility" -> Accessibility
            "special" -> Special
            else -> null
        }
        
        val all = listOf(PatternCreation, SocialEngagement, Exploration, AIInteraction, Accessibility, Special)
    }
}

/**
 * Localized achievement content
 */
data class LocalizedContent(
    val en: String,
    val fr: String
) {
    fun forLanguage(language: String): String = when (language.lowercase()) {
        "fr", "français", "french" -> fr
        else -> en
    }
}

/**
 * Achievement definition with comprehensive metadata
 */
data class AchievementDefinition(
    val id: String,
    val key: String,
    val name: LocalizedContent,
    val description: LocalizedContent,
    val icon: String,
    val category: AchievementCategory,
    val requiredLevel: UserLevel,
    val pointsValue: Int,
    val targetValue: Int,
    val isActive: Boolean = true,
    val isHidden: Boolean = false, // Hidden until close to completion
    val rarity: AchievementRarity = AchievementRarity.COMMON,
    val prerequisites: List<String> = emptyList() // Required achievement keys
) {
    val difficulty: AchievementDifficulty
        get() = when {
            targetValue <= 5 && requiredLevel == UserLevel.BEGINNER -> AchievementDifficulty.TRIVIAL
            targetValue <= 10 && requiredLevel <= UserLevel.INTERMEDIATE -> AchievementDifficulty.EASY
            targetValue <= 50 && requiredLevel <= UserLevel.ADVANCED -> AchievementDifficulty.MEDIUM
            targetValue <= 100 -> AchievementDifficulty.HARD
            else -> AchievementDifficulty.LEGENDARY
        }
}

/**
 * Achievement rarity levels for collection mechanics
 */
enum class AchievementRarity(val multiplier: Float) {
    COMMON(1.0f),
    UNCOMMON(1.5f),
    RARE(2.0f),
    EPIC(3.0f),
    LEGENDARY(5.0f)
}

/**
 * Achievement difficulty classification
 */
enum class AchievementDifficulty {
    TRIVIAL, EASY, MEDIUM, HARD, LEGENDARY
}

/**
 * User statistics for achievement calculation
 */
data class UserStatistics(
    val userId: String,
    val userLevel: UserLevel,
    val reputationScore: Int,
    val totalPatternsCreated: Int,
    val publicPatternsCreated: Int,
    val aiPatternsGenerated: Int,
    val patternsShared: Int,
    val patternsLiked: Int,
    val patternsFavorited: Int,
    val collectionsCreated: Int,
    val voiceCommandsUsed: Int,
    val accessibilityFeaturesUsed: Int,
    val languagesSwitched: Int,
    val daysSinceSignup: Int,
    val consecutiveDaysActive: Int,
    val achievementsUnlocked: Int,
    val totalSessionTime: Long, // milliseconds
    val averageSessionLength: Long, // milliseconds
    val palettesExplored: Set<String> = emptySet(),
    val helpGiven: Int = 0,
    val feedbackProvided: Int = 0,
    val bugsReported: Int = 0
) {
    val experiencePoints: Int
        get() = (totalPatternsCreated * 10) +
                (publicPatternsCreated * 25) +
                (aiPatternsGenerated * 15) +
                (patternsShared * 20) +
                (collectionsCreated * 50) +
                (achievementsUnlocked * 100) +
                (reputationScore * 5)
}

/**
 * Achievement unlock result with metadata
 */
sealed class AchievementUnlockResult {
    data class Success(
        val achievement: AchievementDefinition,
        val previousProgress: AchievementProgress,
        val newProgress: AchievementProgress.Unlocked,
        val experienceGained: Int,
        val leveledUp: Boolean = false,
        val newFeaturesUnlocked: List<String> = emptyList()
    ) : AchievementUnlockResult()
    
    data class AlreadyUnlocked(
        val achievement: AchievementDefinition
    ) : AchievementUnlockResult()
    
    data class PrerequisitesNotMet(
        val achievement: AchievementDefinition,
        val missingPrerequisites: List<String>
    ) : AchievementUnlockResult()
    
    data class LevelRequirementNotMet(
        val achievement: AchievementDefinition,
        val requiredLevel: UserLevel,
        val currentLevel: UserLevel
    ) : AchievementUnlockResult()
}

/**
 * Level advancement result with feature unlocks
 */
data class LevelAdvancementResult(
    val previousLevel: UserLevel,
    val newLevel: UserLevel,
    val experienceGained: Int,
    val totalExperience: Int,
    val newFeaturesUnlocked: List<FeatureUnlock>,
    val newAchievementsAvailable: List<AchievementDefinition>
)

/**
 * Feature unlock definitions
 */
data class FeatureUnlock(
    val key: String,
    val name: LocalizedContent,
    val description: LocalizedContent,
    val requiredLevel: UserLevel
)

/**
 * Achievement analytics for insights
 */
data class AchievementAnalytics(
    val userId: String,
    val totalAchievements: Int,
    val unlockedAchievements: Int,
    val completionPercentage: Float,
    val pointsEarned: Int,
    val rareAchievements: Int,
    val categoryProgress: Map<AchievementCategory, CategoryProgress>,
    val estimatedTimeToNextLevel: Long?, // milliseconds
    val achievementVelocity: Float, // achievements per day
    val streakData: StreakData
)

data class CategoryProgress(
    val category: AchievementCategory,
    val total: Int,
    val unlocked: Int,
    val pointsEarned: Int,
    val completionPercentage: Float
)

data class StreakData(
    val currentStreak: Int, // days
    val longestStreak: Int,
    val streakType: StreakType
)

enum class StreakType {
    DAILY_PATTERN, DAILY_LOGIN, WEEKLY_GOAL, SOCIAL_ENGAGEMENT
}

/**
 * High-performance achievement engine with mobile optimization
 * 
 * Features:
 * - Real-time progress tracking with minimal battery impact
 * - Intelligent achievement checking with smart batching
 * - Level progression with feature gate management
 * - Social achievement mechanics
 * - Accessibility achievement tracking
 * - Multi-language support
 * - Analytics and user behavior insights
 * 
 * @param achievementRepository Data source for achievement definitions
 * @param userRepository User data and statistics provider
 * @param config Engine configuration for performance tuning
 */
class AchievementEngine(
    private val achievementRepository: AchievementRepository,
    private val userRepository: UserRepository,
    private val config: AchievementEngineConfig = AchievementEngineConfig()
) {
    companion object {
        // Experience thresholds for level advancement
        private val LEVEL_THRESHOLDS = mapOf(
            UserLevel.BEGINNER to 0,
            UserLevel.INTERMEDIATE to 1000,
            UserLevel.ADVANCED to 5000,
            UserLevel.EXPERT to 15000
        )
        
        // Feature unlocks by level
        private val FEATURE_UNLOCKS = mapOf(
            UserLevel.INTERMEDIATE to listOf(
                FeatureUnlock(
                    "ai_patterns",
                    LocalizedContent("AI Pattern Generation", "Génération de motifs IA"),
                    LocalizedContent("Generate patterns using AI assistance", "Générer des motifs avec l'aide de l'IA"),
                    UserLevel.INTERMEDIATE
                ),
                FeatureUnlock(
                    "pattern_sharing",
                    LocalizedContent("Pattern Sharing", "Partage de motifs"),
                    LocalizedContent("Share patterns with the community", "Partager des motifs avec la communauté"),
                    UserLevel.INTERMEDIATE
                )
            ),
            UserLevel.ADVANCED to listOf(
                FeatureUnlock(
                    "voice_commands",
                    LocalizedContent("Voice Commands", "Commandes vocales"),
                    LocalizedContent("Control the app with voice commands", "Contrôler l'application avec des commandes vocales"),
                    UserLevel.ADVANCED
                ),
                FeatureUnlock(
                    "pattern_collections",
                    LocalizedContent("Pattern Collections", "Collections de motifs"),
                    LocalizedContent("Organize patterns into collections", "Organiser les motifs en collections"),
                    UserLevel.ADVANCED
                )
            ),
            UserLevel.EXPERT to listOf(
                FeatureUnlock(
                    "advanced_ai",
                    LocalizedContent("Advanced AI Features", "Fonctionnalités IA avancées"),
                    LocalizedContent("Access advanced AI pattern generation", "Accéder à la génération de motifs IA avancée"),
                    UserLevel.EXPERT
                ),
                FeatureUnlock(
                    "community_moderation",
                    LocalizedContent("Community Moderation", "Modération communautaire"),
                    LocalizedContent("Help moderate community content", "Aider à modérer le contenu communautaire"),
                    UserLevel.EXPERT
                )
            )
        )
    }
    
    private val engineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Achievement progress cache for performance
    private val progressCache = mutableMapOf<String, List<AchievementProgress>>()
    private val statisticsCache = mutableMapOf<String, UserStatistics>()
    
    // Progress update flow for reactive UI
    private val progressFlow = MutableSharedFlow<Pair<String, List<AchievementProgress>>>(
        replay = 1,
        extraBufferCapacity = 10
    )
    
    /**
     * Check pattern creation achievements after a new pattern is created
     */
    suspend fun checkPatternCreationAchievements(
        userId: String,
        pattern: Pattern
    ): List<AchievementUnlockResult> = withContext(Dispatchers.Default) {
        try {
            val statistics = getUserStatistics(userId)
            val achievements = achievementRepository.getAchievementsByCategory(AchievementCategory.PatternCreation)
            val results = mutableListOf<AchievementUnlockResult>()
            
            for (achievement in achievements) {
                if (!achievement.isActive || !isLevelSufficient(statistics.userLevel, achievement.requiredLevel)) {
                    continue
                }
                
                val currentProgress = calculateAchievementProgress(achievement, statistics)
                if (currentProgress.currentValue >= currentProgress.targetValue && !currentProgress.isUnlocked) {
                    val unlockResult = unlockAchievement(userId, achievement, statistics)
                    results.add(unlockResult)
                }
            }
            
            // Check level advancement
            checkLevelAdvancement(userId, statistics)
            
            results
            
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    /**
     * Get comprehensive achievement progress for a user
     */
    suspend fun getAchievementProgress(userId: String): Flow<List<AchievementProgress>> = flow {
        try {
            // Check cache first
            progressCache[userId]?.let { cachedProgress ->
                emit(cachedProgress)
            }
            
            val statistics = getUserStatistics(userId)
            val allAchievements = achievementRepository.getAllAchievements()
            val unlockedAchievements = achievementRepository.getUserAchievements(userId)
            val unlockedKeys = unlockedAchievements.map { it.achievementKey }.toSet()
            
            val progress = allAchievements
                .filter { isLevelSufficient(statistics.userLevel, it.requiredLevel) }
                .filter { arePrerequisitesMet(it, unlockedKeys) }
                .map { achievement ->
                    if (unlockedKeys.contains(achievement.key)) {
                        val unlockTime = unlockedAchievements
                            .find { it.achievementKey == achievement.key }?.unlockedAt ?: 0L
                        AchievementProgress.Unlocked(
                            achievement = achievement,
                            currentValue = achievement.targetValue,
                            targetValue = achievement.targetValue,
                            unlockedAt = unlockTime
                        )
                    } else {
                        calculateAchievementProgress(achievement, statistics)
                    }
                }
            
            // Cache results
            progressCache[userId] = progress
            
            // Emit to reactive flow
            progressFlow.tryEmit(userId to progress)
            emit(progress)
            
        } catch (e: Exception) {
            emit(emptyList())
        }
    }.flowOn(Dispatchers.IO)
    
    /**
     * Unlock achievement manually (for special events or admin actions)
     */
    suspend fun unlockAchievementManually(
        userId: String,
        achievementKey: String
    ): AchievementUnlockResult = withContext(Dispatchers.Default) {
        try {
            val achievement = achievementRepository.getAchievementByKey(achievementKey)
                ?: return@withContext AchievementUnlockResult.PrerequisitesNotMet(
                    achievement = AchievementDefinition(
                        id = "",
                        key = achievementKey,
                        name = LocalizedContent("Unknown", "Inconnu"),
                        description = LocalizedContent("Unknown achievement", "Réalisation inconnue"),
                        icon = "",
                        category = AchievementCategory.Special,
                        requiredLevel = UserLevel.BEGINNER,
                        pointsValue = 0,
                        targetValue = 1
                    ),
                    missingPrerequisites = listOf("Achievement not found")
                )
            
            val statistics = getUserStatistics(userId)
            unlockAchievement(userId, achievement, statistics)
            
        } catch (e: Exception) {
            AchievementUnlockResult.PrerequisitesNotMet(
                achievement = AchievementDefinition(
                    id = "",
                    key = achievementKey,
                    name = LocalizedContent("Error", "Erreur"),
                    description = LocalizedContent("Failed to unlock", "Échec du déverrouillage"),
                    icon = "",
                    category = AchievementCategory.Special,
                    requiredLevel = UserLevel.BEGINNER,
                    pointsValue = 0,
                    targetValue = 1
                ),
                missingPrerequisites = listOf(e.message ?: "Unknown error")
            )
        }
    }
    
    /**
     * Get achievement analytics for user insights
     */
    suspend fun getAchievementAnalytics(userId: String): AchievementAnalytics = withContext(Dispatchers.Default) {
        try {
            val statistics = getUserStatistics(userId)
            val allAchievements = achievementRepository.getAllAchievements()
            val unlockedAchievements = achievementRepository.getUserAchievements(userId)
            
            val totalAchievements = allAchievements.size
            val unlockedCount = unlockedAchievements.size
            val completionPercentage = if (totalAchievements > 0) {
                (unlockedCount.toFloat() / totalAchievements * 100f)
            } else 0f
            
            val pointsEarned = unlockedAchievements.sumOf { ua ->
                allAchievements.find { it.key == ua.achievementKey }?.pointsValue ?: 0
            }
            
            val rareAchievements = unlockedAchievements.count { ua ->
                allAchievements.find { it.key == ua.achievementKey }?.rarity in 
                listOf(AchievementRarity.RARE, AchievementRarity.EPIC, AchievementRarity.LEGENDARY)
            }
            
            val categoryProgress = calculateCategoryProgress(allAchievements, unlockedAchievements)
            val timeToNextLevel = estimateTimeToNextLevel(statistics)
            val achievementVelocity = calculateAchievementVelocity(unlockedAchievements, statistics.daysSinceSignup)
            val streakData = calculateStreakData(userId, statistics)
            
            AchievementAnalytics(
                userId = userId,
                totalAchievements = totalAchievements,
                unlockedAchievements = unlockedCount,
                completionPercentage = completionPercentage,
                pointsEarned = pointsEarned,
                rareAchievements = rareAchievements,
                categoryProgress = categoryProgress,
                estimatedTimeToNextLevel = timeToNextLevel,
                achievementVelocity = achievementVelocity,
                streakData = streakData
            )
            
        } catch (e: Exception) {
            AchievementAnalytics(
                userId = userId,
                totalAchievements = 0,
                unlockedAchievements = 0,
                completionPercentage = 0f,
                pointsEarned = 0,
                rareAchievements = 0,
                categoryProgress = emptyMap(),
                estimatedTimeToNextLevel = null,
                achievementVelocity = 0f,
                streakData = StreakData(0, 0, StreakType.DAILY_PATTERN)
            )
        }
    }
    
    /**
     * Check for level advancement and unlock new features
     */
    suspend fun checkLevelAdvancement(
        userId: String,
        statistics: UserStatistics? = null
    ): LevelAdvancementResult? = withContext(Dispatchers.Default) {
        try {
            val userStats = statistics ?: getUserStatistics(userId)
            val currentLevel = userStats.userLevel
            val experiencePoints = userStats.experiencePoints
            
            val newLevel = calculateLevelFromExperience(experiencePoints)
            
            if (newLevel != currentLevel && newLevel.ordinal > currentLevel.ordinal) {
                // Update user level
                userRepository.updateUserLevel(userId, newLevel)
                
                // Get newly unlocked features
                val newFeatures = FEATURE_UNLOCKS[newLevel] ?: emptyList()
                
                // Get newly available achievements
                val newAchievements = achievementRepository.getAchievementsByLevel(newLevel)
                
                // Clear cache to force refresh
                statisticsCache.remove(userId)
                progressCache.remove(userId)
                
                LevelAdvancementResult(
                    previousLevel = currentLevel,
                    newLevel = newLevel,
                    experienceGained = experiencePoints - (LEVEL_THRESHOLDS[currentLevel] ?: 0),
                    totalExperience = experiencePoints,
                    newFeaturesUnlocked = newFeatures,
                    newAchievementsAvailable = newAchievements
                )
            } else {
                null
            }
            
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Track specific user actions for achievement progress
     */
    suspend fun trackUserAction(
        userId: String,
        action: UserAction
    ): List<AchievementUnlockResult> = withContext(Dispatchers.Default) {
        try {
            // Update user statistics based on action
            userRepository.incrementActionCount(userId, action)
            
            // Clear cached statistics to force refresh
            statisticsCache.remove(userId)
            
            // Check relevant achievements based on action type
            val results = when (action) {
                is UserAction.PatternCreated -> checkPatternCreationAchievements(userId, action.pattern)
                is UserAction.VoiceCommandUsed -> checkAccessibilityAchievements(userId)
                is UserAction.LanguageSwitched -> checkExplorationAchievements(userId)
                is UserAction.AIPatternGenerated -> checkAIInteractionAchievements(userId)
                is UserAction.PatternShared -> checkSocialEngagementAchievements(userId)
                is UserAction.HelpProvided -> checkSocialEngagementAchievements(userId)
                else -> emptyList()
            }
            
            results
            
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    // Private helper methods
    
    private suspend fun getUserStatistics(userId: String): UserStatistics {
        return statisticsCache[userId] ?: run {
            val stats = userRepository.getUserStatistics(userId)
            statisticsCache[userId] = stats
            stats
        }
    }
    
    private fun calculateAchievementProgress(
        achievement: AchievementDefinition,
        statistics: UserStatistics
    ): AchievementProgress {
        val currentValue = when (achievement.key) {
            "first_pattern" -> statistics.totalPatternsCreated
            "pattern_master" -> statistics.totalPatternsCreated
            "pattern_architect" -> statistics.totalPatternsCreated
            "pattern_legend" -> statistics.totalPatternsCreated
            "explorer" -> statistics.palettesExplored.size
            "ai_assistant" -> statistics.aiPatternsGenerated
            "ai_whisperer" -> statistics.aiPatternsGenerated
            "social_butterfly" -> statistics.publicPatternsCreated
            "community_leader" -> statistics.helpGiven
            "voice_commander" -> statistics.voiceCommandsUsed
            "accessibility_champion" -> statistics.accessibilityFeaturesUsed
            "multilingual" -> statistics.languagesSwitched
            else -> 0
        }
        
        return if (currentValue >= achievement.targetValue) {
            AchievementProgress.Unlocked(
                achievement = achievement,
                currentValue = currentValue,
                targetValue = achievement.targetValue
            )
        } else {
            AchievementProgress.InProgress(
                achievement = achievement,
                currentValue = currentValue,
                targetValue = achievement.targetValue
            )
        }
    }
    
    private suspend fun unlockAchievement(
        userId: String,
        achievement: AchievementDefinition,
        statistics: UserStatistics
    ): AchievementUnlockResult {
        try {
            // Check if already unlocked
            val existingAchievements = achievementRepository.getUserAchievements(userId)
            if (existingAchievements.any { it.achievementKey == achievement.key }) {
                return AchievementUnlockResult.AlreadyUnlocked(achievement)
            }
            
            // Check prerequisites
            val unlockedKeys = existingAchievements.map { it.achievementKey }.toSet()
            if (!arePrerequisitesMet(achievement, unlockedKeys)) {
                val missingPrerequisites = achievement.prerequisites.filter { !unlockedKeys.contains(it) }
                return AchievementUnlockResult.PrerequisitesNotMet(achievement, missingPrerequisites)
            }
            
            // Check level requirement
            if (!isLevelSufficient(statistics.userLevel, achievement.requiredLevel)) {
                return AchievementUnlockResult.LevelRequirementNotMet(
                    achievement, 
                    achievement.requiredLevel, 
                    statistics.userLevel
                )
            }
            
            // Unlock achievement
            achievementRepository.unlockAchievement(userId, achievement.id)
            
            val experienceGained = (achievement.pointsValue * achievement.rarity.multiplier).toInt()
            userRepository.addExperience(userId, experienceGained)
            
            // Check for level advancement
            val levelAdvancement = checkLevelAdvancement(userId, statistics)
            
            val previousProgress = calculateAchievementProgress(achievement, statistics)
            val newProgress = AchievementProgress.Unlocked(
                achievement = achievement,
                currentValue = achievement.targetValue,
                targetValue = achievement.targetValue
            )
            
            // Clear caches
            progressCache.remove(userId)
            statisticsCache.remove(userId)
            
            AchievementUnlockResult.Success(
                achievement = achievement,
                previousProgress = previousProgress,
                newProgress = newProgress,
                experienceGained = experienceGained,
                leveledUp = levelAdvancement != null,
                newFeaturesUnlocked = levelAdvancement?.newFeaturesUnlocked?.map { it.key } ?: emptyList()
            )
            
        } catch (e: Exception) {
            AchievementUnlockResult.PrerequisitesNotMet(
                achievement,
                listOf("Error unlocking achievement: ${e.message}")
            )
        }
    }
    
    private fun isLevelSufficient(userLevel: UserLevel, requiredLevel: UserLevel): Boolean {
        return userLevel.ordinal >= requiredLevel.ordinal
    }
    
    private fun arePrerequisitesMet(achievement: AchievementDefinition, unlockedKeys: Set<String>): Boolean {
        return achievement.prerequisites.all { prerequisite -> unlockedKeys.contains(prerequisite) }
    }
    
    private fun calculateLevelFromExperience(experience: Int): UserLevel {
        return LEVEL_THRESHOLDS.entries
            .sortedByDescending { it.value }
            .first { experience >= it.value }
            .key
    }
    
    private fun calculateCategoryProgress(
        allAchievements: List<AchievementDefinition>,
        unlockedAchievements: List<UserAchievement>
    ): Map<AchievementCategory, CategoryProgress> {
        val unlockedKeys = unlockedAchievements.map { it.achievementKey }.toSet()
        
        return AchievementCategory.all.associateWith { category ->
            val categoryAchievements = allAchievements.filter { it.category == category }
            val categoryUnlocked = categoryAchievements.filter { unlockedKeys.contains(it.key) }
            val pointsEarned = categoryUnlocked.sumOf { it.pointsValue }
            val completionPercentage = if (categoryAchievements.isNotEmpty()) {
                (categoryUnlocked.size.toFloat() / categoryAchievements.size * 100f)
            } else 0f
            
            CategoryProgress(
                category = category,
                total = categoryAchievements.size,
                unlocked = categoryUnlocked.size,
                pointsEarned = pointsEarned,
                completionPercentage = completionPercentage
            )
        }
    }
    
    private fun estimateTimeToNextLevel(statistics: UserStatistics): Long? {
        val currentExperience = statistics.experiencePoints
        val currentLevel = statistics.userLevel
        val nextLevel = UserLevel.values().getOrNull(currentLevel.ordinal + 1) ?: return null
        val nextLevelThreshold = LEVEL_THRESHOLDS[nextLevel] ?: return null
        
        val experienceNeeded = nextLevelThreshold - currentExperience
        if (experienceNeeded <= 0) return 0L
        
        // Estimate based on recent activity (rough calculation)
        val dailyExperienceRate = statistics.totalPatternsCreated * 10f / statistics.daysSinceSignup.coerceAtLeast(1)
        
        return if (dailyExperienceRate > 0) {
            (experienceNeeded / dailyExperienceRate * 24 * 60 * 60 * 1000).toLong()
        } else null
    }
    
    private fun calculateAchievementVelocity(
        unlockedAchievements: List<UserAchievement>,
        daysSinceSignup: Int
    ): Float {
        return if (daysSinceSignup > 0) {
            unlockedAchievements.size.toFloat() / daysSinceSignup
        } else 0f
    }
    
    private suspend fun calculateStreakData(userId: String, statistics: UserStatistics): StreakData {
        // This would typically query activity logs for streak calculation
        return StreakData(
            currentStreak = statistics.consecutiveDaysActive,
            longestStreak = statistics.consecutiveDaysActive, // Simplified
            streakType = StreakType.DAILY_LOGIN
        )
    }
    
    private suspend fun checkAccessibilityAchievements(userId: String): List<AchievementUnlockResult> {
        // Implementation for accessibility-specific achievements
        return emptyList()
    }
    
    private suspend fun checkExplorationAchievements(userId: String): List<AchievementUnlockResult> {
        // Implementation for exploration-specific achievements
        return emptyList()
    }
    
    private suspend fun checkAIInteractionAchievements(userId: String): List<AchievementUnlockResult> {
        // Implementation for AI interaction achievements
        return emptyList()
    }
    
    private suspend fun checkSocialEngagementAchievements(userId: String): List<AchievementUnlockResult> {
        // Implementation for social engagement achievements
        return emptyList()
    }
    
    /**
     * Clean up resources
     */
    fun cleanup() {
        engineScope.cancel()
        progressCache.clear()
        statisticsCache.clear()
    }
}

/**
 * User actions for achievement tracking
 */
sealed class UserAction {
    data class PatternCreated(val pattern: Pattern) : UserAction()
    data class PatternShared(val patternId: String) : UserAction()
    data class AIPatternGenerated(val prompt: String) : UserAction()
    object VoiceCommandUsed : UserAction()
    object LanguageSwitched : UserAction()
    data class HelpProvided(val helpType: String) : UserAction()
    data class FeedbackProvided(val rating: Int) : UserAction()
    object AccessibilityFeatureUsed : UserAction()
}

/**
 * User achievement record
 */
data class UserAchievement(
    val id: String,
    val userId: String,
    val achievementKey: String,
    val unlockedAt: Long,
    val progressValue: Int? = null
)

/**
 * Configuration for achievement engine performance
 */
data class AchievementEngineConfig(
    val enableBackgroundChecking: Boolean = true,
    val batchSize: Int = 10,
    val cacheExpirationMs: Long = 5 * 60 * 1000, // 5 minutes
    val enableAnalytics: Boolean = true
)

/**
 * Repository interfaces for dependency injection
 */
interface AchievementRepository {
    suspend fun getAllAchievements(): List<AchievementDefinition>
    suspend fun getAchievementsByCategory(category: AchievementCategory): List<AchievementDefinition>
    suspend fun getAchievementsByLevel(level: UserLevel): List<AchievementDefinition>
    suspend fun getAchievementByKey(key: String): AchievementDefinition?
    suspend fun getUserAchievements(userId: String): List<UserAchievement>
    suspend fun unlockAchievement(userId: String, achievementId: String): Boolean
}

interface UserRepository {
    suspend fun getUserStatistics(userId: String): UserStatistics
    suspend fun updateUserLevel(userId: String, level: UserLevel): Boolean
    suspend fun addExperience(userId: String, experience: Int): Boolean
    suspend fun incrementActionCount(userId: String, action: UserAction): Boolean
}