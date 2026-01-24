import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import type { AccessibilityPreferences } from '@/db/types';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences: Partial<AccessibilityPreferences> = await request.json();

    // Validate preferences
    const validKeys = [
      'high_contrast',
      'large_text',
      'reduced_motion',
      'screen_reader_mode',
      'voice_commands_enabled',
      'preferred_input_method',
      'color_blind_assistance',
    ];

    const invalidKeys = Object.keys(preferences).filter(
      key => !validKeys.includes(key)
    );

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid preference keys: ${invalidKeys.join(', ')}` },
        { status: 400 }
      );
    }

    // Get current preferences
    const currentUser = await db
      .selectFrom('users')
      .select('accessibility_preferences')
      .where('id', '=', session.user.id)
      .executeTakeFirst();

    const defaultPreferences: AccessibilityPreferences = {
      high_contrast: false,
      large_text: false,
      reduced_motion: false,
      screen_reader_mode: false,
      voice_commands_enabled: false,
      preferred_input_method: 'touch',
      color_blind_assistance: false,
    };

    const currentPreferences = currentUser?.accessibility_preferences || defaultPreferences;

    // Merge with new preferences
    const updatedPreferences: AccessibilityPreferences = {
      ...defaultPreferences,
      ...currentPreferences,
      ...preferences,
    };

    // Update in database
    await db
      .updateTable('users')
      .set({
        accessibility_preferences: updatedPreferences as AccessibilityPreferences,
      })
      .where('id', '=', session.user.id)
      .execute();

    return NextResponse.json({ 
      success: true,
      preferences: updatedPreferences 
    });
  } catch (error) {
    console.error('Error updating accessibility preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update accessibility preferences' },
      { status: 500 }
    );
  }
}