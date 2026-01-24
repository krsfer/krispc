import { NextRequest, NextResponse } from 'next/server';
import { ShareCodeService } from '@/lib/export/share-codes';

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { code } = await params;

    // Validate share code format
    if (!ShareCodeService.isValidShareCode(code)) {
      return NextResponse.json(
        { error: 'Invalid share code format' },
        { status: 400 }
      );
    }

    // Get pattern from share code
    const pattern = await ShareCodeService.getPatternFromShareCode(code);
    
    if (!pattern) {
      return NextResponse.json(
        { error: 'Share code not found or expired' },
        { status: 404 }
      );
    }

    // Return pattern data
    return NextResponse.json({
      success: true,
      pattern: {
        id: pattern.id,
        name: pattern.name,
        description: pattern.description,
        sequence: pattern.sequence,
        patternSize: pattern.patternSize,
        patternMode: pattern.patternMode,
        tags: pattern.tags,
        metadata: pattern.metadata,
      },
      shareCode: code.toUpperCase(),
    });
  } catch (error) {
    console.error('Share code retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shared pattern' },
      { status: 500 }
    );
  }
}

// Handle DELETE requests for share code deletion
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // This would require authentication to ensure only the owner can delete
    // For now, we'll just return method not allowed
    return NextResponse.json(
      { error: 'Share code deletion requires authentication' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Share code deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete share code' },
      { status: 500 }
    );
  }
}

// Don't allow other methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}