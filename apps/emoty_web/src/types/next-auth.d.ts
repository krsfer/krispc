import 'next-auth';
import type { UserLevel, AccessibilityPreferences } from '@/db/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      userLevel: UserLevel;
      reputationScore: number;
      totalPatternsCreated: number;
      languagePreference: 'en' | 'fr';
      accessibilityPreferences: AccessibilityPreferences | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    userLevel?: UserLevel;
  }
}