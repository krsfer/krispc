import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ProgressionEngine } from '@/lib/progression-engine';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, metadata } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Track the action using the progression engine
    await ProgressionEngine.trackAction(session.user.id, action, metadata);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking action:', error);
    return NextResponse.json(
      { error: 'Failed to track action' },
      { status: 500 }
    );
  }
}