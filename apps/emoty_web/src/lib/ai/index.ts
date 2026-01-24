/**
 * AI System Index
 * Exports all AI-related services and components for the Emoty Web application
 */

// Core Services
export { ClaudeService, claudeService } from './claude-service';
export { LocalAIService, localAIService } from './local-ai-service';
export { AIServiceManager, aiServiceManager } from './ai-service-manager';

// Safety & Privacy
export { AISafety, aiSafety } from './ai-safety';
export type {
  SafetyConfig,
  ContentFilterResult,
  UserConsentRecord,
  AuditLogEntry,
} from './ai-safety';

// Type definitions for all AI services
export interface AISystemConfig {
  enableClaude: boolean;
  enableLocal: boolean;
  enableSafety: boolean;
  anthropicApiKey?: string;
  claudeModel?: string;
  rateLimits?: {
    beginner: { requestsPerHour: number; tokensPerHour: number };
    intermediate: { requestsPerHour: number; tokensPerHour: number };
    advanced: { requestsPerHour: number; tokensPerHour: number };
    expert: { requestsPerHour: number; tokensPerHour: number };
  };
  costLimits?: {
    dailyBudgetUSD: number;
    monthlyBudgetUSD: number;
    userDailyLimitUSD: number;
  };
}

export interface AIFeatureStatus {
  patternGeneration: boolean;
  patternNaming: boolean;
  emotyBot: boolean;
  voiceCommands: boolean;
  safetyFiltering: boolean;
  coppaCompliance: boolean;
}

/**
 * Initialize AI system with configuration
 */
export function initializeAISystem(config: Partial<AISystemConfig> = {}): AIFeatureStatus {
  const features: AIFeatureStatus = {
    patternGeneration: false,
    patternNaming: false,
    emotyBot: false,
    voiceCommands: false,
    safetyFiltering: false,
    coppaCompliance: false,
  };

  try {
    // Test Claude service
    if (config.enableClaude !== false) {
      try {
        // Claude service is initialized on demand
        features.patternGeneration = true;
        features.patternNaming = true;
      } catch (error) {
        console.warn('Claude service initialization failed:', error);
      }
    }

    // Test local AI service
    if (config.enableLocal !== false) {
      try {
        // Local service is always available
        features.patternGeneration = true;
        features.patternNaming = true;
        features.emotyBot = true;
      } catch (error) {
        console.warn('Local AI service initialization failed:', error);
      }
    }

    // Test safety system
    if (config.enableSafety !== false) {
      try {
        const safetyHealth = aiSafety.healthCheck();
        features.safetyFiltering = safetyHealth.contentFiltering;
        features.coppaCompliance = safetyHealth.consentManagement && safetyHealth.auditLogging;
      } catch (error) {
        console.warn('Safety system initialization failed:', error);
      }
    }

    // Voice commands depend on browser APIs
    features.voiceCommands = typeof window !== 'undefined' && 
                             'speechSynthesis' in window && 
                             'webkitSpeechRecognition' in window;

    return features;

  } catch (error) {
    console.error('AI system initialization error:', error);
    return features;
  }
}

/**
 * Get AI system health status
 */
export async function getAISystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'critical';
  services: Record<string, boolean>;
  issues: string[];
}> {
  try {
    const [aiHealth, safetyHealth] = await Promise.all([
      aiServiceManager.healthCheck(),
      Promise.resolve(aiSafety.healthCheck()),
    ]);

    const services = {
      claude: aiHealth.claude.available,
      local: aiHealth.local.available,
      safety: safetyHealth.contentFiltering,
      consent: safetyHealth.consentManagement,
      audit: safetyHealth.auditLogging,
    };

    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    // Check for critical issues
    if (!services.local && !services.claude) {
      status = 'critical';
      issues.push('All AI services are unavailable');
    }

    if (!services.safety) {
      status = 'critical';
      issues.push('Content filtering is not working');
    }

    // Check for degraded performance
    if (!services.claude && services.local) {
      status = 'degraded';
      issues.push('Claude AI unavailable, using local fallback');
    }

    if (!services.audit) {
      if (status !== 'critical') status = 'degraded';
      issues.push('Audit logging has issues');
    }

    return { status, services, issues };

  } catch (error) {
    console.error('AI health check error:', error);
    return {
      status: 'critical',
      services: {},
      issues: ['Health check system failure'],
    };
  }
}

/**
 * Default AI system configuration
 */
export const DEFAULT_AI_CONFIG: AISystemConfig = {
  enableClaude: true,
  enableLocal: true,
  enableSafety: true,
  claudeModel: 'claude-3-haiku-20240307',
  rateLimits: {
    beginner: { requestsPerHour: 0, tokensPerHour: 0 },
    intermediate: { requestsPerHour: 10, tokensPerHour: 5000 },
    advanced: { requestsPerHour: 25, tokensPerHour: 15000 },
    expert: { requestsPerHour: 50, tokensPerHour: 30000 },
  },
  costLimits: {
    dailyBudgetUSD: 50.0,
    monthlyBudgetUSD: 1000.0,
    userDailyLimitUSD: 1.0,
  },
};