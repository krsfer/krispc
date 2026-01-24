import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { patternGenerator } from '@/lib/ai/pattern-generator';
import { progressionEngine } from '@/lib/progression-engine';
import type { PatternGenerationRequest } from '@/types/ai';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request
    const validationResult = validateGenerationRequest(body);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // Check user's access to AI features
    const userProgression = await progressionEngine.getUserProgression(session.user.id);
    const hasAIAccess = userProgression?.availableFeatures.includes('ai_pattern_generation');
    
    if (!hasAIAccess) {
      return NextResponse.json(
        { error: 'AI pattern generation not available for your level' },
        { status: 403 }
      );
    }

    // Build generation request
    const generationRequest: PatternGenerationRequest = {
      userId: session.user.id,
      userLevel: userProgression?.currentLevel || 'beginner',
      language: body.language || 'en',
      theme: body.theme,
      mood: body.mood,
      colors: body.colors,
      size: body.size,
      customPrompt: body.customPrompt,
      maxPatterns: Math.min(body.maxPatterns || 2, 5), // Max 5 patterns
      avoidEmojis: body.avoidEmojis,
      includeEmojis: body.includeEmojis
    };

    // Generate patterns
    const result = await patternGenerator.generatePatterns(generationRequest);

    // Track AI usage for analytics
    if (result.success) {
      await trackAIUsage(session.user.id, {
        patternsGenerated: result.patterns?.length || 0,
        tokensUsed: result.usage?.totalTokens || 0,
        aiProvider: result.fallback ? 'local' : 'anthropic'
      });
    }

    // Return response
    return NextResponse.json({
      success: result.success,
      patterns: result.patterns,
      fallback: result.fallback,
      error: result.error,
      metadata: {
        generatedAt: result.generatedAt,
        aiGenerated: result.patterns?.some(p => p.metadata.aiGenerated) || false,
        tokensUsed: result.usage?.totalTokens || 0,
        rateLimited: result.rateLimited
      }
    });

  } catch (error) {
    console.error('Pattern generation API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during pattern generation',
        fallback: [] 
      },
      { status: 500 }
    );
  }
}

/**
 * Validate pattern generation request
 */
function validateGenerationRequest(body: any): { valid: boolean; error?: string } {
  // Check required fields
  if (body.language && !['en', 'fr'].includes(body.language)) {
    return { valid: false, error: 'Language must be "en" or "fr"' };
  }

  // Validate theme
  const validThemes = ['nature', 'emotions', 'food', 'travel', 'animals', 'abstract', 'seasonal', 'celebration', 'tech', 'sports'];
  if (body.theme && !validThemes.includes(body.theme)) {
    return { valid: false, error: `Invalid theme. Must be one of: ${validThemes.join(', ')}` };
  }

  // Validate mood  
  const validMoods = ['happy', 'calm', 'energetic', 'romantic', 'mysterious', 'playful', 'elegant', 'bold', 'peaceful'];
  if (body.mood && !validMoods.includes(body.mood)) {
    return { valid: false, error: `Invalid mood. Must be one of: ${validMoods.join(', ')}` };
  }

  // Validate size
  if (body.size && (typeof body.size !== 'number' || body.size < 3 || body.size > 12)) {
    return { valid: false, error: 'Size must be a number between 3 and 12' };
  }

  // Validate maxPatterns
  if (body.maxPatterns && (typeof body.maxPatterns !== 'number' || body.maxPatterns < 1 || body.maxPatterns > 5)) {
    return { valid: false, error: 'maxPatterns must be a number between 1 and 5' };
  }

  // Validate custom prompt length
  if (body.customPrompt && body.customPrompt.length > 500) {
    return { valid: false, error: 'Custom prompt must be 500 characters or less' };
  }

  // Validate emoji arrays
  if (body.avoidEmojis && !Array.isArray(body.avoidEmojis)) {
    return { valid: false, error: 'avoidEmojis must be an array' };
  }

  if (body.includeEmojis && !Array.isArray(body.includeEmojis)) {
    return { valid: false, error: 'includeEmojis must be an array' };
  }

  return { valid: true };
}

/**
 * Track AI usage for analytics
 */
async function trackAIUsage(userId: string, usage: {
  patternsGenerated: number;
  tokensUsed: number;
  aiProvider: string;
}): Promise<void> {
  try {
    // This would integrate with your analytics system
    console.log(`AI Usage - User: ${userId}, Patterns: ${usage.patternsGenerated}, Tokens: ${usage.tokensUsed}, Provider: ${usage.aiProvider}`);
    
    // You could store this in a database table for analytics
    // await db.insertInto('ai_usage_logs').values({
    //   user_id: userId,
    //   patterns_generated: usage.patternsGenerated,
    //   tokens_used: usage.tokensUsed,
    //   provider: usage.aiProvider,
    //   created_at: new Date()
    // }).execute();
  } catch (error) {
    console.error('Failed to track AI usage:', error);
    // Non-critical error, don't throw
  }
}