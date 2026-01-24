import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { UserLevel } from '@/db/types';

interface UsageStatsResponse {
  requestsToday: number;
  tokensToday: number;
  costToday: number;
  requestsThisHour: number;
  tokensThisHour: number;
  requestsRemaining: number;
  tokensRemaining: number;
  rateLimits: {
    requests: number;
    tokens: number;
  };
  dailyLimitUSD: number;
  features: {
    aiGeneration: boolean;
    emotyBot: boolean;
    voiceCommands: boolean;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get session and verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user ID matches session
    if (params.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to user data' },
        { status: 403 }
      );
    }

    // Get user level for rate limit calculation
    const userLevel: UserLevel = session.user.userLevel || 'beginner';

    // Get usage statistics from AI service manager
    const usageStats = await aiServiceManager.getUserUsageStats(params.userId);

    // Get user progression to determine feature access
    const availableFeatures = ProgressionEngine.getAvailableFeatures(userLevel);

    // Calculate remaining limits based on user level
    const rateLimits = {
      beginner: { requestsPerHour: 0, tokensPerHour: 0 },
      intermediate: { requestsPerHour: 10, tokensPerHour: 5000 },
      advanced: { requestsPerHour: 25, tokensPerHour: 15000 },
      expert: { requestsPerHour: 50, tokensPerHour: 30000 },
    };

    const userLimits = rateLimits[userLevel];
    const requestsRemaining = Math.max(0, userLimits.requestsPerHour - usageStats.requestsThisHour);
    const tokensRemaining = Math.max(0, userLimits.tokensPerHour - usageStats.tokensThisHour);

    // Prepare response
    const response: UsageStatsResponse = {
      requestsToday: usageStats.requestsToday,
      tokensToday: usageStats.tokensToday,
      costToday: usageStats.costToday,
      requestsThisHour: usageStats.requestsThisHour,
      tokensThisHour: usageStats.tokensThisHour,
      requestsRemaining,
      tokensRemaining,
      rateLimits: {
        requests: userLimits.requestsPerHour,
        tokens: userLimits.tokensPerHour,
      },
      dailyLimitUSD: 1.0, // $1 per user per day limit
      features: {
        aiGeneration: availableFeatures.includes('ai_pattern_generation'),
        emotyBot: availableFeatures.includes('emoty_bot_chat'),
        voiceCommands: availableFeatures.includes('voice_commands_basic') || availableFeatures.includes('voice_commands_full'),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Usage stats API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch usage statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use GET to retrieve usage statistics.' 
    },
    { status: 405 }
  );
}