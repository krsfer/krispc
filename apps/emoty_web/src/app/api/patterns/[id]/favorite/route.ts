// Pattern favorite toggle API route
import { NextRequest, NextResponse } from 'next/server';
import { patternService } from '@/lib/services/pattern-service';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/patterns/[id]/favorite - Toggle favorite status
export async function POST(
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

    const { id: patternId } = await params;

    // Check if pattern exists and is accessible
    const pattern = await patternService.getPatternById(patternId, session.user.id);
    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    if (!pattern.is_public && pattern.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Toggle favorite status
    const isFavorited = await patternService.toggleFavorite(patternId, session.user.id);

    return NextResponse.json({
      success: true,
      is_favorited: isFavorited,
      pattern_id: patternId
    });

  } catch (error) {
    console.error(`POST /api/patterns/[id]/favorite error:`, error);

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