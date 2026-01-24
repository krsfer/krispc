// Main patterns API route - GET (search/list) and POST (create)
import { NextRequest, NextResponse } from 'next/server';
import { patternService, PatternService } from '@/lib/services/pattern-service';
import { patternCache } from '@/lib/cache/pattern-cache';
import { auth } from '@/lib/auth';
import type { 
  PatternInsert, 
  PatternSearchFilters, 
  PatternSortOptions, 
  PaginationOptions,
  PatternSequence
} from '@/db/types';

// GET /api/patterns - Search and list patterns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get current user
    const session = await auth();
    const currentUserId = session?.user?.id;

    // Parse search filters
    const filters: PatternSearchFilters = {};
    
    if (searchParams.get('query')) {
      filters.query = searchParams.get('query')!;
    }
    
    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')!.split(',').filter(Boolean);
    }
    
    if (searchParams.get('user_id')) {
      filters.user_id = searchParams.get('user_id')!;
    }
    
    if (searchParams.get('palette_id')) {
      filters.palette_id = searchParams.get('palette_id')!;
    }
    
    if (searchParams.get('is_public') !== null) {
      filters.is_public = searchParams.get('is_public') === 'true';
    }
    
    if (searchParams.get('is_ai_generated') !== null) {
      filters.is_ai_generated = searchParams.get('is_ai_generated') === 'true';
    }
    
    if (searchParams.get('difficulty_min')) {
      filters.difficulty_min = parseInt(searchParams.get('difficulty_min')!, 10);
    }
    
    if (searchParams.get('difficulty_max')) {
      filters.difficulty_max = parseInt(searchParams.get('difficulty_max')!, 10);
    }
    
    if (searchParams.get('complexity_min')) {
      filters.complexity_min = parseFloat(searchParams.get('complexity_min')!);
    }
    
    if (searchParams.get('complexity_max')) {
      filters.complexity_max = parseFloat(searchParams.get('complexity_max')!);
    }
    
    if (searchParams.get('created_after')) {
      filters.created_after = new Date(searchParams.get('created_after')!);
    }
    
    if (searchParams.get('created_before')) {
      filters.created_before = new Date(searchParams.get('created_before')!);
    }

    // Parse sorting
    const sort: PatternSortOptions = {
      field: (searchParams.get('sort_by') as any) || 'created_at',
      direction: (searchParams.get('sort_direction') as 'asc' | 'desc') || 'desc'
    };

    // Parse pagination
    const pagination: PaginationOptions = {
      limit: Math.min(parseInt(searchParams.get('limit') || '20', 10), 100),
      offset: parseInt(searchParams.get('offset') || '0', 10)
    };

    // Search patterns
    const result = await patternService.searchPatterns(
      filters, 
      sort, 
      pagination, 
      currentUserId
    );

    // Cache popular patterns
    if (result.data.length > 0) {
      const popularPatterns = result.data.filter(p => Number(p.view_count) > 10);
      if (popularPatterns.length > 0) {
        patternCache.cachePatterns(popularPatterns).catch(console.error);
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('GET /api/patterns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/patterns - Create new pattern
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

    // Validate required fields
    const validation = validatePatternData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Create pattern data
    const patternData: PatternInsert = {
      user_id: session.user.id,
      name: body.name.trim(),
      sequence: body.sequence,
      palette_id: body.palette_id,
      size: body.size,
      is_public: body.is_public || false,
      is_ai_generated: body.is_ai_generated || false,
      generation_prompt: body.generation_prompt || null,
      tags: body.tags || null,
      difficulty_rating: body.difficulty_rating || null,
      complexity_score: body.complexity_score || null,
      estimated_time_minutes: body.estimated_time_minutes || null,
      parent_pattern_id: body.parent_pattern_id || null
    };

    // Create pattern
    const newPattern = await patternService.createPattern(patternData);

    // Cache the new pattern
    const patternWithDetails = await patternService.getPatternById(
      String(newPattern.id),
      session.user.id
    );
    if (patternWithDetails) {
      patternCache.cachePattern(patternWithDetails).catch(console.error);
    }

    return NextResponse.json(newPattern, { status: 201 });

  } catch (error) {
    console.error('POST /api/patterns error:', error);

    if (error instanceof Error && error.message.includes('Permission denied')) {
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

// Validation helper
function validatePatternData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (data.name && data.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  if (!data.sequence) {
    errors.push('Sequence is required');
  }

  if (!PatternService.validatePatternSequence(data.sequence)) {
    errors.push('Invalid pattern sequence format');
  }

  if (!data.palette_id || typeof data.palette_id !== 'string') {
    errors.push('Palette ID is required');
  }

  if (!data.size || typeof data.size !== 'number' || data.size <= 0) {
    errors.push('Size must be a positive number');
  }

  // Optional field validation
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  }

  if (data.tags && data.tags.some((tag: any) => typeof tag !== 'string')) {
    errors.push('All tags must be strings');
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

  if (data.generation_prompt && typeof data.generation_prompt !== 'string') {
    errors.push('Generation prompt must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}