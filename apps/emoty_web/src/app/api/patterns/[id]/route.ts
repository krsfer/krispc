// Individual pattern API route - GET, PUT, DELETE
import { NextRequest, NextResponse } from 'next/server';
import { patternService } from '@/lib/services/pattern-service';
import { patternCache } from '@/lib/cache/pattern-cache';
import { auth } from '@/lib/auth';
import type { PatternUpdate } from '@/db/types';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/patterns/[id] - Get single pattern
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const patternId = params.id;
    
    // Get current user
    const session = await auth();
    const currentUserId = session?.user?.id;

    // Try cache first
    let pattern = await patternCache.getCachedPattern(patternId);
    
    if (!pattern) {
      // Fetch from database
      pattern = await patternService.getPatternById(patternId, currentUserId);
      
      if (!pattern) {
        return NextResponse.json(
          { error: 'Pattern not found' },
          { status: 404 }
        );
      }

      // Cache the pattern
      patternCache.cachePattern(pattern).catch(console.error);
    }

    // Check access permissions
    if (!pattern.is_public && pattern.user_id !== currentUserId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Log view action (only for authenticated users)
    if (currentUserId && pattern.user_id !== currentUserId) {
      // Note: This would ideally be done asynchronously to not slow down the response
      patternService['logPatternAction'](null, patternId, currentUserId, 'view')
        .catch(console.error);
    }

    return NextResponse.json(pattern);

  } catch (error) {
    console.error(`GET /api/patterns/${params.id} error:`, error);
    
    if (error.message.includes('Permission denied')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/patterns/[id] - Update pattern
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const patternId = params.id;
    const body = await request.json();

    // Validate update data
    const validation = validatePatternUpdateData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: PatternUpdate = {};
    
    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    
    if (body.sequence !== undefined) {
      updateData.sequence = body.sequence;
    }
    
    if (body.palette_id !== undefined) {
      updateData.palette_id = body.palette_id;
    }
    
    if (body.size !== undefined) {
      updateData.size = body.size;
    }
    
    if (body.is_public !== undefined) {
      updateData.is_public = body.is_public;
    }
    
    if (body.tags !== undefined) {
      updateData.tags = body.tags;
    }
    
    if (body.difficulty_rating !== undefined) {
      updateData.difficulty_rating = body.difficulty_rating;
    }
    
    if (body.complexity_score !== undefined) {
      updateData.complexity_score = body.complexity_score;
    }
    
    if (body.estimated_time_minutes !== undefined) {
      updateData.estimated_time_minutes = body.estimated_time_minutes;
    }

    // Update pattern
    const updatedPattern = await patternService.updatePattern(
      patternId,
      updateData,
      session.user.id
    );

    // Update cache
    const patternWithDetails = await patternService.getPatternById(
      updatedPattern.id,
      session.user.id
    );
    if (patternWithDetails) {
      patternCache.cachePattern(patternWithDetails).catch(console.error);
    }

    return NextResponse.json(updatedPattern);

  } catch (error) {
    console.error(`PUT /api/patterns/${params.id} error:`, error);
    
    if (error.message.includes('Permission denied')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }
    
    if (error.message.includes('Pattern not found')) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }
    
    if (error.message.includes('modified by another user')) {
      return NextResponse.json(
        { error: 'Pattern was modified by another user. Please refresh and try again.' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/patterns/[id] - Delete (soft delete) pattern
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const patternId = params.id;

    // Delete pattern (soft delete)
    await patternService.deletePattern(patternId, session.user.id);

    // Remove from cache
    // Note: In a real implementation, you'd want to remove from memory cache too
    // patternCache.removeFromMemoryCache(patternId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(`DELETE /api/patterns/${params.id} error:`, error);
    
    if (error.message.includes('Permission denied')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }
    
    if (error.message.includes('Pattern not found')) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validation helper for updates
function validatePatternUpdateData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Optional field validation - only validate fields that are present
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Name must be a non-empty string');
    }
    if (data.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    }
  }

  if (data.sequence !== undefined) {
    if (!patternService.validatePatternSequence(data.sequence)) {
      errors.push('Invalid pattern sequence format');
    }
  }

  if (data.palette_id !== undefined) {
    if (typeof data.palette_id !== 'string' || data.palette_id.trim().length === 0) {
      errors.push('Palette ID must be a non-empty string');
    }
  }

  if (data.size !== undefined) {
    if (typeof data.size !== 'number' || data.size <= 0) {
      errors.push('Size must be a positive number');
    }
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else if (data.tags.some((tag: any) => typeof tag !== 'string')) {
      errors.push('All tags must be strings');
    }
  }

  if (data.difficulty_rating !== undefined) {
    if (typeof data.difficulty_rating !== 'number' || 
        data.difficulty_rating < 1 || 
        data.difficulty_rating > 5) {
      errors.push('Difficulty rating must be between 1 and 5');
    }
  }

  if (data.complexity_score !== undefined) {
    if (typeof data.complexity_score !== 'number' || 
        data.complexity_score < 0 || 
        data.complexity_score > 10) {
      errors.push('Complexity score must be between 0 and 10');
    }
  }

  if (data.estimated_time_minutes !== undefined) {
    if (typeof data.estimated_time_minutes !== 'number' || 
        data.estimated_time_minutes <= 0) {
      errors.push('Estimated time must be a positive number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}