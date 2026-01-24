# Emoty Web App - Railway Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Emoty web application to Railway, including environment setup, database configuration, and production optimization.

## Railway Platform Setup

### 1. Project Creation

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init emoty-webapp

# Link to existing project (if created via web)
railway link [project-id]
```

### 2. Service Configuration

Create `railway.toml` in project root:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"

[environment]
NODE_ENV = "production"
```

## Environment Configuration

### 1. Environment Variables Setup

```bash
# Production environment variables
railway variables set NODE_ENV=production
railway variables set NEXTAUTH_URL=https://emoty-webapp.railway.app
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Database configuration (auto-configured by Railway)
railway variables set DATABASE_URL=${{ PostgreSQL.DATABASE_URL }}

# AI Service configuration
railway variables set ANTHROPIC_API_KEY=your_anthropic_key_here
railway variables set AI_MODEL=claude-3-haiku-20240307
railway variables set AI_MAX_TOKENS=2000

# Application configuration
railway variables set APP_NAME="Emoty Web"
railway variables set APP_VERSION="1.0.0"
railway variables set APP_DOMAIN="emoty-webapp.railway.app"

# Security configuration
railway variables set SESSION_SECRET=$(openssl rand -base64 32)
railway variables set ENCRYPTION_KEY=$(openssl rand -base64 32)

# Feature flags
railway variables set ENABLE_VOICE_COMMANDS=true
railway variables set ENABLE_AI_FEATURES=true
railway variables set ENABLE_ANALYTICS=true
```

### 2. Environment File Template

Create `.env.example`:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/emoty_db

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# AI Integration
ANTHROPIC_API_KEY=your_anthropic_api_key
AI_MODEL=claude-3-haiku-20240307
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7

# Application Settings
APP_NAME=Emoty Web
APP_VERSION=1.0.0
NODE_ENV=development

# Security
SESSION_SECRET=your_session_secret
ENCRYPTION_KEY=your_encryption_key

# Features
ENABLE_VOICE_COMMANDS=true
ENABLE_AI_FEATURES=true
ENABLE_ANALYTICS=false

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=development

# Performance
REDIS_URL=redis://localhost:6379
ENABLE_CACHE=true
CACHE_TTL=3600
```

## Database Setup

### 1. PostgreSQL Service

```bash
# Add PostgreSQL service
railway add postgresql

# Get database connection details
railway variables get DATABASE_URL
```

### 2. Database Schema Migration

Create `db/schema.sql`:

```sql
-- Create database extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for future authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patterns table
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sequence JSONB NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'concentric',
    insertion_index INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emoji palettes table
CREATE TABLE emoji_palettes (
    id VARCHAR(50) PRIMARY KEY,
    name JSONB NOT NULL,
    category VARCHAR(20) NOT NULL,
    emojis TEXT[] NOT NULL,
    order_index INTEGER NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    description JSONB,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'en',
    theme VARCHAR(10) DEFAULT 'light',
    accessibility_settings JSONB DEFAULT '{}',
    voice_settings JSONB DEFAULT '{}',
    ai_settings JSONB DEFAULT '{}',
    ui_settings JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI conversation history
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL,
    messages JSONB NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage analytics (optional)
CREATE TABLE usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_patterns_user_created ON patterns(user_id, created_at DESC);
CREATE INDEX idx_patterns_favorites ON patterns(user_id) WHERE is_favorite = true;
CREATE INDEX idx_patterns_tags ON patterns USING GIN(tags);
CREATE INDEX idx_patterns_name_search ON patterns USING GIN(to_tsvector('english', name));
CREATE INDEX idx_palettes_category_order ON emoji_palettes(category, order_index);
CREATE INDEX idx_analytics_user_type ON usage_analytics(user_id, event_type);
CREATE INDEX idx_analytics_timestamp ON usage_analytics(timestamp DESC);

-- Insert default emoji palettes
INSERT INTO emoji_palettes (id, name, category, emojis, order_index) VALUES
('hearts-flowers', '{"en": "Hearts & Flowers", "fr": "Cœurs et Fleurs"}', 'color', 
 ARRAY['❤️','💕','💖','🌸','🌺','🌻','🌷','💐','🌹','💓','💗','💘','💝','💞','💋','🥰','😍','😘','💌','💏','💑'], 1),
('happy-faces', '{"en": "Happy Faces", "fr": "Visages Heureux"}', 'color',
 ARRAY['😀','😃','😄','😁','😆','😊','☺️','🙂','🤗','😌','😉','🥰','😍','🤩','😋','😎','🤠','🥳','🎉','🎊','🎈'], 2),
('nature-vibes', '{"en": "Nature Vibes", "fr": "Vibes Nature"}', 'color',
 ARRAY['🌸','🌺','🌻','🌷','🌹','🌲','🌳','🌴','🍀','🌿','🌱','🦋','🐝','🌞','⭐','🌙','💫','🌈','☀️','🌤️'], 3);
-- Add remaining palettes...
```

### 3. Migration Script

Create `scripts/migrate.js`:

```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Running database migrations...');
    
    const schemaSQL = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    await pool.query(schemaSQL);
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
```

## Build Configuration

### 1. Next.js Configuration

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    domains: ['emoty-webapp.railway.app'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=()'
          }
        ]
      }
    ];
  },
  
  // Output configuration for Railway
  output: 'standalone',
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // PWA support
  ...(process.env.NODE_ENV === 'production' && {
    experimental: {
      esmExternals: false
    }
  })
};

module.exports = nextConfig;
```

### 2. Package.json Scripts

Update `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js",
    "railway:build": "npm run migrate && npm run build",
    "railway:start": "npm start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

## Deployment Process

### 1. Automated Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        run: railway up --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 2. Manual Deployment

```bash
# Deploy to Railway
railway up

# Deploy with specific service
railway up --service=emoty-webapp

# Deploy with environment
railway up --environment=production

# View deployment logs
railway logs

# Check deployment status
railway status
```

## Health Checks and Monitoring

### 1. Health Check Endpoint

Create `pages/api/health.js`:

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Database connectivity check
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    checks.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };

    // AI service check (optional)
    if (process.env.ANTHROPIC_API_KEY) {
      checks.checks.ai_service = {
        status: 'configured',
        model: process.env.AI_MODEL
      };
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    checks.checks.memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    res.status(200).json(checks);
  } catch (error) {
    checks.status = 'unhealthy';
    checks.error = error.message;
    res.status(500).json(checks);
  }
}
```

### 2. Monitoring Setup

Create `lib/monitoring.js`:

```javascript
class MonitoringService {
  static init() {
    if (process.env.NODE_ENV === 'production') {
      // Error tracking
      if (process.env.SENTRY_DSN) {
        this.initSentry();
      }
      
      // Performance monitoring
      this.initPerformanceMonitoring();
    }
  }

  static initSentry() {
    const Sentry = require('@sentry/nextjs');
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      }
    });
  }

  static initPerformanceMonitoring() {
    // Custom performance monitoring
    console.log('Performance monitoring initialized');
  }

  static trackEvent(event, data = {}) {
    if (process.env.NODE_ENV === 'production') {
      // Send to analytics service
      console.log('Analytics event:', event, data);
    }
  }
}

export default MonitoringService;
```

## Performance Optimization

### 1. Caching Strategy

Create `lib/cache.js`:

```javascript
import Redis from 'ioredis';

class CacheService {
  constructor() {
    this.redis = process.env.REDIS_URL 
      ? new Redis(process.env.REDIS_URL)
      : null;
    
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 100;
  }

  async get(key) {
    // Try Redis first
    if (this.redis) {
      try {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn('Redis get failed:', error);
      }
    }

    // Fallback to memory cache
    return this.memoryCache.get(key) || null;
  }

  async set(key, value, ttlSeconds = 3600) {
    const serialized = JSON.stringify(value);

    // Store in Redis
    if (this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, serialized);
      } catch (error) {
        console.warn('Redis set failed:', error);
      }
    }

    // Store in memory cache with LRU eviction
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, value);
  }

  async del(key) {
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.warn('Redis del failed:', error);
      }
    }
    
    this.memoryCache.delete(key);
  }
}

export default new CacheService();
```

### 2. Build Optimization

Create `.railwayignore`:

```
# Development files
.env.local
.env.development
.env.test

# Testing
coverage/
.nyc_output/
jest.config.js

# Documentation
docs/
*.md
!README.md

# Development tools
.vscode/
.idea/

# Logs
logs/
*.log

# Cache
.next/cache/
node_modules/.cache/

# Source maps in production
*.map
```

## Security Configuration

### 1. Content Security Policy

Create `middleware.js`:

```javascript
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Security headers
  const response = NextResponse.next();
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' api.anthropic.com",
    "media-src 'self'",
    "frame-src 'none'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 2. Rate Limiting

Create `lib/rate-limiter.js`:

```javascript
import cache from './cache';

class RateLimiter {
  async checkLimit(identifier, limit = 10, windowSeconds = 60) {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Get current requests
    const requests = await cache.get(key) || [];
    
    // Filter requests within window
    const validRequests = requests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: validRequests[0] + (windowSeconds * 1000)
      };
    }
    
    // Add current request
    validRequests.push(now);
    await cache.set(key, validRequests, windowSeconds);
    
    return {
      allowed: true,
      remaining: limit - validRequests.length,
      resetTime: now + (windowSeconds * 1000)
    };
  }
}

export default new RateLimiter();
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   railway logs --service=emoty-webapp
   
   # Local build test
   npm run build
   ```

2. **Database Connection Issues**
   ```bash
   # Verify database URL
   railway variables get DATABASE_URL
   
   # Test connection
   railway shell
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Environment Variable Issues**
   ```bash
   # List all variables
   railway variables list
   
   # Update variable
   railway variables set VARIABLE_NAME=new_value
   ```

### Performance Issues

1. **Slow API Responses**
   - Check Anthropic API response times
   - Verify database query performance
   - Monitor Railway resource usage

2. **Memory Issues**
   - Monitor heap usage via health endpoint
   - Check for memory leaks in patterns cache
   - Adjust cache sizes if needed

3. **High CPU Usage**
   - Monitor pattern rendering performance
   - Check for infinite loops in Canvas drawing
   - Optimize emoji bitmap caching

---

*This deployment guide ensures a robust, secure, and performant production deployment of the Emoty web application on Railway.*