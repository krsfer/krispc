import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AchievementSystem } from '@/lib/achievement-system';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Users can only check their own achievements
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newAchievements = await AchievementSystem.checkAndUnlockAchievements(userId);
    
    return NextResponse.json({
      newAchievements,
      count: newAchievements.length,
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json(
      { error: 'Failed to check achievements' },
      { status: 500 }
    );
  }
}