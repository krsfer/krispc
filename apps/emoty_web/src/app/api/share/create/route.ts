import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { ShareCodeService } from '@/lib/export/share-codes';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { PatternState, PatternMode } from '@/types/pattern';
import type { ShareCodeOptions } from '@/types/export';

export async function POST(request: NextRequest) {
  try {
    // Get session for user validation
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { patternId, options } = body;

    if (!patternId) {
      return NextResponse.json(
        { error: 'Pattern ID is required' },
        { status: 400 }
      );
    }

    // Get user info for feature access and quota checks
    const user = await db
      .selectFrom('users')
      .select(['user_level', 'id'])
      .where('id', '=', session.user.id)
      .executeTakeFirstOrThrow();

    // Check if user has access to share codes
    const hasAccess = ProgressionEngine.canAccessFeature(
      user.user_level,
      'pattern_sharing'
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Pattern sharing requires intermediate level or higher' },
        { status: 403 }
      );
    }

    // Check user share code quota
    const hasReachedQuota = await ShareCodeService.hasUserReachedQuota(
      session.user.id,
      user.user_level
    );

    if (hasReachedQuota) {
      const quota = ShareCodeService.getShareCodeQuota(user.user_level);
      return NextResponse.json(
        { error: `Share code limit reached. Your level allows ${quota} active share codes.` },
        { status: 429 }
      );
    }

    // Get pattern from database
    const pattern = await getPatternById(patternId, session.user.id);
    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found or access denied' },
        { status: 404 }
      );
    }

    // Validate share code options
    const shareOptions: ShareCodeOptions = {
      expirationDays: options?.expirationDays || 30,
      includeMetadata: options?.includeMetadata !== false, // Default true
      compress: options?.compress !== false, // Default true
    };

    if (shareOptions.expirationDays && (shareOptions.expirationDays < 1 || shareOptions.expirationDays > 365)) {
      return NextResponse.json(
        { error: 'Expiration days must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Generate share code
    const shareCodeData = await ShareCodeService.generateShareCode(
      pattern,
      session.user.id,
      shareOptions
    );

    // Track the share action
    await ProgressionEngine.trackAction(session.user.id, 'share_pattern', {
      patternId,
      shareCode: shareCodeData.code,
    });

    return NextResponse.json({
      success: true,
      shareCode: shareCodeData.code,
      shareUrl: shareCodeData.url,
      expiresAt: shareCodeData.expiresAt,
      pattern: {
        id: shareCodeData.pattern.id,
        name: shareCodeData.pattern.name,
      },
    });
  } catch (error) {
    console.error('Share code creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create share code' },
      { status: 500 }
    );
  }
}

/**
 * Get pattern by ID with ownership validation
 */
async function getPatternById(patternId: string, userId: string): Promise<PatternState | null> {
  try {
    const pattern = await db
      .selectFrom('patterns')
      .selectAll()
      .where('id', '=', patternId)
      .where('user_id', '=', userId) // Only allow sharing own patterns
      .executeTakeFirst();

    if (!pattern) {
      return null;
    }

    // Convert database pattern to PatternState
    const sequence = JSON.parse(pattern.sequence);
    const tags = pattern.tags || [];

    return {
      id: pattern.id,
      name: pattern.name,
      sequence,
      insertionIndex: 0,
      patternSize: pattern.size,
      patternMode: PatternMode.CONCENTRIC, // Default mode
      activeInsertionMode: PatternMode.CONCENTRIC,
      createdAt: pattern.created_at,
      updatedAt: pattern.updated_at,
      isFavorite: false,
      tags,
      metadata: {
        aiGenerated: pattern.is_ai_generated,
        sourcePrompt: pattern.generation_prompt || undefined,
        complexity: pattern.difficulty_rating ? 
          (pattern.difficulty_rating < 3 ? 'simple' : 
           pattern.difficulty_rating < 7 ? 'moderate' : 'complex') : 'simple',
        language: 'en', // Default
        userLevel: 1, // Would need to get from user
      },
    };
  } catch (error) {
    console.error('Error fetching pattern:', error);
    return null;
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}