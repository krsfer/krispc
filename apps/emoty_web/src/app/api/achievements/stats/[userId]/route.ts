import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AchievementSystem } from '@/lib/achievement-system';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Users can only access their own achievement stats
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const achievementStats = await AchievementSystem.getAchievementStats(userId);
    
    return NextResponse.json(achievementStats);
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievement stats' },
      { status: 500 }
    );
  }
}