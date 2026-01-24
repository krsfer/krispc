import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { language } = await request.json();

    if (!language || !['en', 'fr'].includes(language)) {
      return NextResponse.json(
        { error: 'Language must be "en" or "fr"' },
        { status: 400 }
      );
    }

    // Update in database
    await db
      .updateTable('users')
      .set({
        language_preference: language,
      })
      .where('id', '=', session.user.id)
      .execute();

    return NextResponse.json({ 
      success: true,
      language 
    });
  } catch (error) {
    console.error('Error updating language preference:', error);
    return NextResponse.json(
      { error: 'Failed to update language preference' },
      { status: 500 }
    );
  }
}