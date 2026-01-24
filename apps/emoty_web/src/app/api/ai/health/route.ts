import { NextRequest, NextResponse } from 'next/server';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { aiSafety } from '@/lib/ai/ai-safety';

export async function GET(request: NextRequest) {
  try {
    // Get health status from AI service manager
    const aiHealth = await aiServiceManager.healthCheck();
    
    // Get health status from safety system
    const safetyHealth = aiSafety.healthCheck();

    // Overall health assessment
    const overallHealth = {
      status: 'healthy',
      issues: [] as string[],
    };

    // Check AI services
    if (!aiHealth.claude.available && !aiHealth.local.available) {
      overallHealth.status = 'critical';
      overallHealth.issues.push('All AI services are unavailable');
    } else if (!aiHealth.claude.available) {
      overallHealth.status = 'degraded';
      overallHealth.issues.push('Claude AI service is unavailable, using local fallback');
    }

    // Check safety systems
    if (!safetyHealth.contentFiltering) {
      overallHealth.status = 'critical';
      overallHealth.issues.push('Content filtering system is not working');
    }

    if (!safetyHealth.auditLogging) {
      overallHealth.status = 'degraded';
      overallHealth.issues.push('Audit logging system has issues');
    }

    // Response
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: overallHealth.status,
      issues: overallHealth.issues,
      services: {
        claude: {
          available: aiHealth.claude.available,
          latency: aiHealth.claude.latencyMs,
          status: aiHealth.claude.available ? 'healthy' : 'unavailable',
        },
        localAI: {
          available: aiHealth.local.available,
          latency: aiHealth.local.latencyMs,
          status: aiHealth.local.available ? 'healthy' : 'unavailable',
        },
        safety: {
          contentFiltering: safetyHealth.contentFiltering,
          auditLogging: safetyHealth.auditLogging,
          consentManagement: safetyHealth.consentManagement,
          dataMinimization: safetyHealth.dataMinimization,
          status: Object.values(safetyHealth).every(Boolean) ? 'healthy' : 'degraded',
        },
      },
      metrics: {
        activeUsers: aiHealth.rateLimits.activeUsers,
        globalBudgetUsed: aiHealth.rateLimits.globalBudgetUsed,
        dailyBudgetLimit: 50.0, // $50/day
        budgetUtilization: (aiHealth.rateLimits.globalBudgetUsed / 50.0) * 100,
      },
      features: {
        aiGeneration: aiHealth.claude.available || aiHealth.local.available,
        patternNaming: aiHealth.claude.available || aiHealth.local.available,
        emotyBot: aiHealth.local.available, // EmotyBot uses local service
        safetyFiltering: safetyHealth.contentFiltering,
        coppaCompliance: safetyHealth.consentManagement && safetyHealth.auditLogging,
      },
    };

    // Set appropriate HTTP status based on health
    let httpStatus = 200;
    if (overallHealth.status === 'critical') {
      httpStatus = 503; // Service Unavailable
    } else if (overallHealth.status === 'degraded') {
      httpStatus = 206; // Partial Content
    }

    return NextResponse.json(healthCheck, { status: httpStatus });

  } catch (error) {
    console.error('Health check API error:', error);
    
    return NextResponse.json(
      { 
        timestamp: new Date().toISOString(),
        status: 'error',
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        services: {
          claude: { available: false, status: 'unknown' },
          localAI: { available: false, status: 'unknown' },
          safety: { status: 'unknown' },
        },
      },
      { status: 500 }
    );
  }
}