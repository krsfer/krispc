// Batch operations API route - Update multiple patterns at once
import { NextRequest, NextResponse } from 'next/server';
import { patternService } from '@/lib/services/pattern-service';
import { patternCache } from '@/lib/cache/pattern-cache';
import { auth } from '@/lib/auth';
import type { PatternUpdate } from '@/db/types';

// POST /api/patterns/batch - Batch update patterns
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request structure
    if (!body.pattern_ids || !Array.isArray(body.pattern_ids)) {
      return NextResponse.json(
        { error: 'pattern_ids must be an array' },
        { status: 400 }
      );
    }

    if (body.pattern_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one pattern ID is required' },
        { status: 400 }
      );
    }

    if (body.pattern_ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 patterns can be updated at once' },
        { status: 400 }
      );
    }

    if (!body.updates || typeof body.updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Validate updates
    const validation = validateBatchUpdateData(body.updates);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Perform batch update
    const updatedPatterns = await patternService.batchUpdatePatterns(
      body.pattern_ids,
      body.updates,
      session.user.id
    );

    // Update cache for updated patterns
    const cachePromises = updatedPatterns.map(async (pattern) => {
      const patternWithDetails = await patternService.getPatternById(
        pattern.id,
        session.user.id
      );
      if (patternWithDetails) {
        return patternCache.cachePattern(patternWithDetails);
      }
    });
    
    Promise.all(cachePromises).catch(console.error);

    return NextResponse.json({
      success: true,
      updated_count: updatedPatterns.length,
      patterns: updatedPatterns
    });

  } catch (error) {
    console.error('POST /api/patterns/batch error:', error);
    
    if (error.message.includes('Permission denied')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }
    
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Some patterns not found or permission denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validation helper for batch updates
function validateBatchUpdateData(updates: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one valid update field is provided
  const validFields = [
    'is_public', 'tags', 'difficulty_rating', 'complexity_score'
  ];
  
  const hasValidField = validFields.some(field => updates.hasOwnProperty(field));
  if (!hasValidField) {
    errors.push(`At least one valid update field is required: ${validFields.join(', ')}`);
  }

  // Validate individual fields
  if (updates.is_public !== undefined && typeof updates.is_public !== 'boolean') {
    errors.push('is_public must be a boolean');
  }

  if (updates.tags !== undefined) {
    if (!Array.isArray(updates.tags)) {
      errors.push('tags must be an array');
    } else if (updates.tags.some((tag: any) => typeof tag !== 'string')) {
      errors.push('All tags must be strings');
    }
  }

  if (updates.difficulty_rating !== undefined) {
    if (typeof updates.difficulty_rating !== 'number' || 
        updates.difficulty_rating < 1 || 
        updates.difficulty_rating > 5) {
      errors.push('difficulty_rating must be between 1 and 5');
    }
  }

  if (updates.complexity_score !== undefined) {
    if (typeof updates.complexity_score !== 'number' || 
        updates.complexity_score < 0 || 
        updates.complexity_score > 10) {
      errors.push('complexity_score must be between 0 and 10');
    }
  }

  // Don't allow batch updates of critical fields like name, sequence, etc.
  const disallowedFields = ['name', 'sequence', 'palette_id', 'size'];
  const hasDisallowedField = disallowedFields.some(field => updates.hasOwnProperty(field));
  if (hasDisallowedField) {
    errors.push(`Batch updates not allowed for: ${disallowedFields.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}