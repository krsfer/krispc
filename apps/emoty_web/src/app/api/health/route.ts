// Health check endpoint for Railway deployment
import { NextResponse } from 'next/server';

export async function GET() {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'emoty-web',
    version: '1.9.3',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      server: 'healthy',
      // Add database check when database is implemented
      // database: await checkDatabase() ? 'healthy' : 'unhealthy'
    }
  };

  return NextResponse.json(healthCheck, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    }
  });
}