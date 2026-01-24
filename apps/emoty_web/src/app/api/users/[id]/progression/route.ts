import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ProgressionEngine } from '@/lib/progression-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can only access their own progression data
    if (session.user.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const progressionData = await ProgressionEngine.calculateProgression(params.id);
    
    return NextResponse.json(progressionData);
  } catch (error) {
    console.error('Error fetching progression data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progression data' },
      { status: 500 }
    );
  }
}