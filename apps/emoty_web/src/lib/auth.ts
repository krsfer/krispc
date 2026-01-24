import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db/connection';
import type { UserLevel } from '@/db/types';

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth",
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        action: { label: 'Action', type: 'hidden' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const action = credentials.action as string;

        if (action === 'signup') {
          // Check if user already exists
          const existingUser = await db
            .selectFrom('users')
            .select('id')
            .where('email', '=', email)
            .executeTakeFirst();

          if (existingUser) {
            throw new Error('User already exists with this email');
          }

          // Hash password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Create new user
          const newUser = await db
            .insertInto('users')
            .values({
              email,
              password_hash: hashedPassword,
              username: email.split('@')[0],
              language_preference: 'en',
            })
            .returning(['id', 'email', 'username', 'user_level'])
            .executeTakeFirstOrThrow();

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.username,
            userLevel: newUser.user_level,
          };
        } else {
          // Sign in existing user
          const user = await db
            .selectFrom('users')
            .select(['id', 'email', 'username', 'user_level', 'reputation_score', 'password_hash'])
            .where('email', '=', email)
            .where('is_active', '=', true)
            .executeTakeFirst();

          if (!user) {
            throw new Error('No account found with this email');
          }

          if (!user.password_hash) {
            throw new Error('This account does not have a password set. Please use another sign-in method.');
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            throw new Error('Invalid password');
          }

          // Update last login
          await db
            .updateTable('users')
            .set({ last_login_at: new Date() })
            .where('id', '=', user.id)
            .execute();

          return {
            id: user.id,
            email: user.email,
            name: user.username,
            userLevel: user.user_level,
          };
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        const userData = await db
          .selectFrom('users')
          .select([
            'id',
            'user_level',
            'reputation_score',
            'total_patterns_created',
            'language_preference',
            'accessibility_preferences',
          ])
          .where('id', '=', token.sub)
          .executeTakeFirst();

        if (userData) {
          session.user.id = userData.id;
          session.user.userLevel = userData.user_level;
          session.user.reputationScore = userData.reputation_score;
          session.user.totalPatternsCreated = userData.total_patterns_created;
          session.user.languagePreference = userData.language_preference;
          session.user.accessibilityPreferences = userData.accessibility_preferences;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userLevel = user.userLevel;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// Legacy export for compatibility
export const authOptions = {
  basePath: "/emo/api/auth",
  trustHost: true,
  providers: [], // Will be handled by the new auth instance
};

// Helper function to get user with progression data
export async function getUserWithProgression(userId: string) {
  const user = await db
    .selectFrom('users')
    .leftJoin('user_achievements', 'users.id', 'user_achievements.user_id')
    .leftJoin('patterns', 'users.id', 'patterns.user_id')
    .select([
      'users.id',
      'users.email',
      'users.username',
      'users.full_name',
      'users.user_level',
      'users.reputation_score',
      'users.total_patterns_created',
      'users.language_preference',
      'users.accessibility_preferences',
      'users.created_at',
      'users.last_login_at',
    ])
    .select((eb) => [
      eb.fn.count('user_achievements.id').distinct().as('achievement_count'),
      eb.fn.count('patterns.id').distinct().as('pattern_count'),
    ])
    .where('users.id', '=', userId)
    .where('users.is_active', '=', true)
    .groupBy([
      'users.id',
      'users.email',
      'users.username',
      'users.full_name',
      'users.user_level',
      'users.reputation_score',
      'users.total_patterns_created',
      'users.language_preference',
      'users.accessibility_preferences',
      'users.created_at',
      'users.last_login_at',
    ])
    .executeTakeFirst();

  return user;
}