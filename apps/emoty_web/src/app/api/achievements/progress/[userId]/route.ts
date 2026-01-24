import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AchievementSystem } from '@/lib/achievement-system';
import { db } from '@/db/connection';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can only access their own achievement progress
    if (session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user level
    const user = await db
      .selectFrom('users')
      .select('user_level')
      .where('id', '=', params.userId)
      .executeTakeFirst();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const achievementProgress = await AchievementSystem.getAchievementProgress(
      params.userId,
      user.user_level
    );
    
    return NextResponse.json(achievementProgress);
  } catch (error) {
    console.error('Error fetching achievement progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievement progress' },
      { status: 500 }
    );
  }
}