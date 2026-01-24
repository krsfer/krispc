import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { ExportService } from '@/lib/export/export-service';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { PatternState, PatternMode } from '@/types/pattern';
import type { ExportOptions, ExportFormat } from '@/types/export';

export async function POST(request: NextRequest) {
  try {
    // Get session for user validation
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { patternId, options } = body;

    if (!patternId || !options) {
      return NextResponse.json(
        { error: 'Pattern ID and export options are required' },
        { status: 400 }
      );
    }

    // Validate export options
    const validationResult = validateExportOptions(options);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // Get user info for feature access check
    const user = await db
      .selectFrom('users')
      .select(['user_level', 'id'])
      .where('id', '=', session.user.id)
      .executeTakeFirstOrThrow();

    // Check if user has access to this export format
    const hasAccess = ProgressionEngine.canAccessFeature(
      user.user_level,
      getFeatureRequirement(options.format)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: `Export format '${options.format}' requires ${getRequiredLevel(options.format)} level or higher` },
        { status: 403 }
      );
    }

    // Get pattern from database
    const pattern = await getPatternById(patternId, session.user.id);
    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found or access denied' },
        { status: 404 }
      );
    }

    // Initialize export service and process pattern
    const exportService = new ExportService();
    const result = await exportService.exportPattern(pattern, options);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      );
    }

    // Track the export action for progression
    await ProgressionEngine.trackAction(session.user.id, 'export_pattern', {
      format: options.format,
      patternId,
    });

    // Return the file data
    if (result.data instanceof Blob) {
      const arrayBuffer = await result.data.arrayBuffer();
      const headers = new Headers();
      
      // Set appropriate content type
      const contentType = getContentType(options.format);
      headers.set('Content-Type', contentType);
      headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);
      headers.set('Content-Length', result.size.toString());
      
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers,
      });
    } else {
      // String data (text exports)
      const headers = new Headers();
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);
      
      return new NextResponse(result.data, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get pattern by ID with access control
 */
async function getPatternById(patternId: string, userId: string): Promise<PatternState | null> {
  try {
    const pattern = await db
      .selectFrom('patterns')
      .selectAll()
      .where('id', '=', patternId)
      .where((eb) => eb.or([
        eb('user_id', '=', userId), // User owns the pattern
        eb('is_public', '=', true)  // Pattern is public
      ]))
      .executeTakeFirst();

    if (!pattern) {
      return null;
    }

    // Convert database pattern to PatternState
    const sequence = JSON.parse(pattern.sequence);
    const tags = pattern.tags || [];

    return {
      id: pattern.id,
      name: pattern.name,
      sequence,
      insertionIndex: 0,
      patternSize: pattern.size,
      patternMode: PatternMode.CONCENTRIC, // Default mode
      activeInsertionMode: PatternMode.CONCENTRIC,
      createdAt: pattern.created_at,
      updatedAt: pattern.updated_at,
      isFavorite: false, // Would need to check favorites table
      tags,
      metadata: {
        aiGenerated: pattern.is_ai_generated,
        sourcePrompt: pattern.generation_prompt || undefined,
        complexity: pattern.difficulty_rating ? 
          (pattern.difficulty_rating < 3 ? 'simple' : 
           pattern.difficulty_rating < 7 ? 'moderate' : 'complex') : 'simple',
        language: 'en', // Default
        userLevel: 1, // Would need to get from user
      },
    };
  } catch (error) {
    console.error('Error fetching pattern:', error);
    return null;
  }
}

/**
 * Validate export options
 */
function validateExportOptions(options: ExportOptions): { valid: boolean; error?: string } {
  const validFormats: ExportFormat[] = ['text', 'png', 'svg', 'pdf', 'json'];
  
  if (!options.format || !validFormats.includes(options.format)) {
    return {
      valid: false,
      error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
    };
  }

  if (options.quality < 0 || options.quality > 100) {
    return {
      valid: false,
      error: 'Quality must be between 0 and 100'
    };
  }

  if (options.size === 'custom') {
    if (!options.dimensions || 
        options.dimensions.width <= 0 || 
        options.dimensions.height <= 0) {
      return {
        valid: false,
        error: 'Custom dimensions must be positive numbers'
      };
    }

    if (options.dimensions.width > 4096 || options.dimensions.height > 4096) {
      return {
        valid: false,
        error: 'Custom dimensions cannot exceed 4096x4096 pixels'
      };
    }
  }

  return { valid: true };
}

/**
 * Get feature requirement for export format
 */
function getFeatureRequirement(format: ExportFormat): string {
  const requirements: Record<ExportFormat, string> = {
    text: 'basic_export',
    png: 'basic_export',
    json: 'basic_export',
    svg: 'export_multiple_formats',
    pdf: 'advanced_export',
  };

  return requirements[format] || 'basic_export';
}

/**
 * Get required level for export format
 */
function getRequiredLevel(format: ExportFormat): string {
  const levels: Record<ExportFormat, string> = {
    text: 'beginner',
    png: 'beginner',
    json: 'beginner',
    svg: 'intermediate',
    pdf: 'advanced',
  };

  return levels[format] || 'beginner';
}

/**
 * Get content type for export format
 */
function getContentType(format: ExportFormat): string {
  const types: Record<ExportFormat, string> = {
    text: 'text/plain',
    png: 'image/png',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    json: 'application/json',
  };

  return types[format] || 'application/octet-stream';
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}