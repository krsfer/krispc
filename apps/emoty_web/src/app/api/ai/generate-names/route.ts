import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { aiSafety } from '@/lib/ai/ai-safety';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { UserLevel, PatternSequence } from '@/db/types';

interface GenerateNamesRequest {
  pattern: PatternSequence;
  language?: 'en' | 'fr';
  style?: 'creative' | 'descriptive' | 'playful' | 'elegant';
  userId: string;
  userLevel: UserLevel;
}

export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GenerateNamesRequest = await request.json();
    const { pattern, language = 'en', style = 'creative', userId, userLevel } = body;

    // Verify user ID matches session
    if (userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // Check if user can access AI features
    if (!ProgressionEngine.canAccessFeature(userLevel, 'ai_pattern_generation')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI naming features require Intermediate level or higher' 
        },
        { status: 403 }
      );
    }

    // Validate pattern data
    if (!pattern || !pattern.emojis || !Array.isArray(pattern.emojis)) {
      return NextResponse.json(
        { success: false, error: 'Valid pattern data is required' },
        { status: 400 }
      );
    }

    if (pattern.emojis.length === 0 || pattern.emojis.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Pattern must have between 1 and 100 emoji cells' },
        { status: 400 }
      );
    }

    // Validate style parameter
    const validStyles = ['creative', 'descriptive', 'playful', 'elegant'];
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { success: false, error: 'Invalid style parameter' },
        { status: 400 }
      );
    }

    // Check COPPA compliance
    const coppaCheck = await aiSafety.checkCOPPACompliance(userId);
    if (!coppaCheck.compliant) {
      return NextResponse.json(
        { 
          success: false, 
          error: coppaCheck.reason,
          requiredActions: coppaCheck.requiredActions 
        },
        { status: 403 }
      );
    }

    // Sanitize pattern data (remove any potential metadata that could contain PII)
    const sanitizedPattern: PatternSequence = {
      emojis: pattern.emojis.map(cell => ({
        emoji: cell.emoji,
        position: cell.position,
        // Remove any metadata that might contain user info
      })),
      metadata: {
        version: pattern.metadata?.version || 1,
        created_with: 'sanitized',
        last_modified: new Date(),
      },
    };

    // Make AI request
    const aiResponse = await aiServiceManager.generatePatternNames({
      userId,
      userLevel,
      requestType: 'pattern_naming',
      data: {
        pattern: sanitizedPattern,
        style,
      },
      language,
    });

    if (!aiResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: aiResponse.error || 'Name generation failed',
          service: aiResponse.service,
          fallbackUsed: aiResponse.fallbackUsed,
        },
        { status: 500 }
      );
    }

    // Sanitize generated names
    let sanitizedNames: string[] = [];
    const allModifications: string[] = [];

    if (aiResponse.data && Array.isArray(aiResponse.data)) {
      for (const name of aiResponse.data) {
        const { sanitized, modifications } = aiSafety.sanitizeOutput(name, { userId });
        sanitizedNames.push(sanitized);
        allModifications.push(...modifications);
      }
    }

    // Filter out any empty or very short names
    sanitizedNames = sanitizedNames.filter(name => name && name.length >= 3);

    // Ensure we have at least one name
    if (sanitizedNames.length === 0) {
      sanitizedNames = [
        language === 'en' ? 'Beautiful Pattern' : 'Beau Motif',
        language === 'en' ? 'Creative Design' : 'Design Créatif',
        language === 'en' ? 'Emoji Art' : 'Art Emoji',
      ];
    }

    // Track user action for analytics
    await ProgressionEngine.trackAction(userId, 'use_ai_naming', {
      style,
      service: aiResponse.service,
      cached: aiResponse.cached,
      namesGenerated: sanitizedNames.length,
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      names: sanitizedNames,
      explanation: language === 'en' 
        ? `Generated ${style} names based on your pattern's design and colors.`
        : `Noms ${style} générés basés sur le design et les couleurs de votre motif.`,
      service: aiResponse.service,
      cached: aiResponse.cached,
      tokensUsed: aiResponse.tokensUsed,
      costUSD: aiResponse.costUSD,
      rateLimitRemaining: aiResponse.rateLimitRemaining,
      fallbackUsed: aiResponse.fallbackUsed,
      modifications: allModifications.length > 0 ? allModifications : undefined,
    });

  } catch (error) {
    console.error('Name generation API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST to generate names.' 
    },
    { status: 405 }
  );
}