import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareCodeService } from '@/lib/export/share-codes';

// GET - Get user's share codes and statistics
export async function GET(request: NextRequest) {
  try {
    // Get session for user validation
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const includeStats = url.searchParams.get('stats') === 'true';
    const includeCodes = url.searchParams.get('codes') !== 'false'; // Default true

    const response: any = {
      success: true,
    };

    // Get share statistics if requested
    if (includeStats) {
      const stats = await ShareCodeService.getUserShareStats(session.user.id);
      response.stats = stats;
    }

    // Get share codes list if requested
    if (includeCodes) {
      const shareCodes = await ShareCodeService.getUserShareCodes(session.user.id);
      response.shareCodes = shareCodes;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('User share codes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user share codes' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific share code (requires code in request body)
export async function DELETE(request: NextRequest) {
  try {
    // Get session for user validation
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Share code is required' },
        { status: 400 }
      );
    }

    if (!ShareCodeService.isValidShareCode(code)) {
      return NextResponse.json(
        { error: 'Invalid share code format' },
        { status: 400 }
      );
    }

    // Verify the share code belongs to the user before deleting
    const shareCodes = await ShareCodeService.getUserShareCodes(session.user.id);
    const ownsCode = shareCodes.some(sc => sc.code.toUpperCase() === code.toUpperCase());

    if (!ownsCode) {
      return NextResponse.json(
        { error: 'Share code not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the share code
    await ShareCodeService.deleteShareCode(code);

    return NextResponse.json({
      success: true,
      message: 'Share code deleted successfully',
    });
  } catch (error) {
    console.error('Share code deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete share code' },
      { status: 500 }
    );
  }
}

// Only allow GET and DELETE
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use /api/share/create for creating share codes.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}