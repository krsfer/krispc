// Collections API route - GET (list) and POST (create)
import { NextRequest, NextResponse } from 'next/server';
import { patternCollectionService } from '@/lib/services/pattern-collection-service';
import { auth } from '@/lib/auth';
import type { PatternCollectionInsert, PaginationOptions } from '@/db/types';

// GET /api/collections - List collections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get current user
    const session = await auth();
    const currentUserId = session?.user?.id;

    // Parse parameters
    const includePublic = searchParams.get('include_public') === 'true';
    const publicOnly = searchParams.get('public_only') === 'true';
    const search = searchParams.get('search');

    const pagination: PaginationOptions = {
      limit: Math.min(parseInt(searchParams.get('limit') || '20', 10), 100),
      offset: parseInt(searchParams.get('offset') || '0', 10)
    };

    let collections;

    if (search) {
      // Search collections
      collections = await patternCollectionService.searchCollections(
        search,
        publicOnly || !currentUserId,
        currentUserId,
        pagination
      );
    } else if (publicOnly || !currentUserId) {
      // Get public collections
      collections = await patternCollectionService.getPublicCollections(
        pagination,
        currentUserId
      );
    } else {
      // Get user's collections
      collections = await patternCollectionService.getUserCollections(
        currentUserId!,
        includePublic,
        pagination
      );
    }

    return NextResponse.json({
      collections,
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset || 0,
        has_next: collections.length === pagination.limit
      }
    });

  } catch (error) {
    console.error('GET /api/collections error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create new collection
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
    const validation = validateCollectionData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Create collection data
    const collectionData: PatternCollectionInsert = {
      user_id: session.user.id,
      name: body.name.trim(),
      description: body.description ? body.description.trim() : null,
      color: body.color || '#6366f1',
      is_public: body.is_public || false
    };

    // Create collection
    const newCollection = await patternCollectionService.createCollection(collectionData);

    return NextResponse.json(newCollection, { status: 201 });

  } catch (error) {
    console.error('POST /api/collections error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validation helper
function validateCollectionData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (data.name && data.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  // Optional field validation
  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }

  if (data.description && data.description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }

  if (data.color && (typeof data.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(data.color))) {
    errors.push('Color must be a valid hex color (e.g., #6366f1)');
  }

  if (data.is_public !== undefined && typeof data.is_public !== 'boolean') {
    errors.push('is_public must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}