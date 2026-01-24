import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { BatchProcessor } from '@/lib/export/batch-processor';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { PatternState } from '@/types/pattern';
import { PatternMode } from '@/types/pattern';
import type { BatchExportOptions, ExportFormat } from '@/types/export';

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
    const { patternIds, options } = body;

    if (!patternIds || !Array.isArray(patternIds) || patternIds.length === 0) {
      return NextResponse.json(
        { error: 'Pattern IDs array is required' },
        { status: 400 }
      );
    }

    if (!options || !options.formats || !Array.isArray(options.formats)) {
      return NextResponse.json(
        { error: 'Export options with formats array is required' },
        { status: 400 }
      );
    }

    // Validate batch size limits
    const maxBatchSize = getMaxBatchSize(session.user.userLevel);
    if (patternIds.length > maxBatchSize) {
      return NextResponse.json(
        { error: `Batch size cannot exceed ${maxBatchSize} patterns for your user level` },
        { status: 400 }
      );
    }

    // Get user info for feature access check
    const user = await db
      .selectFrom('users')
      .select(['user_level', 'id'])
      .where('id', '=', session.user.id)
      .executeTakeFirstOrThrow();

    // Check if user has access to batch operations
    const hasBatchAccess = ProgressionEngine.canAccessFeature(
      user.user_level,
      'batch_operations'
    );

    if (!hasBatchAccess) {
      return NextResponse.json(
        { error: 'Batch operations require advanced level or higher' },
        { status: 403 }
      );
    }

    // Validate export formats access
    for (const format of options.formats) {
      const hasFormatAccess = ProgressionEngine.canAccessFeature(
        user.user_level,
        getFeatureRequirement(format)
      );

      if (!hasFormatAccess) {
        return NextResponse.json(
          { error: `Export format '${format}' requires ${getRequiredLevel(format)} level or higher` },
          { status: 403 }
        );
      }
    }

    // Validate batch export options
    const validationResult = validateBatchExportOptions(options);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // Get patterns from database
    const patterns = await getPatternsByIds(patternIds, session.user.id);
    if (patterns.length === 0) {
      return NextResponse.json(
        { error: 'No accessible patterns found' },
        { status: 404 }
      );
    }

    // Warn if some patterns weren't found
    if (patterns.length < patternIds.length) {
      console.warn(`Only found ${patterns.length} of ${patternIds.length} requested patterns`);
    }

    // Initialize batch processor
    const processor = new BatchProcessor();
    
    // Create progress tracking for streaming response (optional enhancement)
    const result = await processor.processBatch(patterns, options);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Batch export failed',
          details: result.errors 
        },
        { status: 500 }
      );
    }

    // Track the batch export action
    await ProgressionEngine.trackAction(session.user.id, 'batch_export', {
      patternCount: patterns.length,
      formats: options.formats,
      createZip: options.createZip,
    });

    // Return ZIP file if created, otherwise return manifest with individual files info
    if (result.zipFile) {
      const zipArrayBuffer = await result.zipFile.arrayBuffer();
      const filename = options.zipName || `emoty_patterns_export_${new Date().toISOString().slice(0, 10)}.zip`;
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/zip');
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      headers.set('Content-Length', result.zipFile.size.toString());
      
      return new NextResponse(zipArrayBuffer, {
        status: 200,
        headers,
      });
    } else {
      // Return manifest and file info for individual file downloads
      return NextResponse.json({
        success: true,
        manifest: result.manifest,
        fileCount: result.individualFiles?.length || 0,
        errors: result.errors,
        // Note: Individual files would need separate endpoints for download
        message: 'Batch export completed. Use individual export endpoints to download files.',
      });
    }
  } catch (error) {
    console.error('Batch export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get patterns by IDs with access control
 */
async function getPatternsByIds(patternIds: string[], userId: string): Promise<PatternState[]> {
  try {
    const patterns = await db
      .selectFrom('patterns')
      .selectAll()
      .where('id', 'in', patternIds)
      .where((eb) => eb.or([
        eb('user_id', '=', userId), // User owns the pattern
        eb('is_public', '=', true)  // Pattern is public
      ]))
      .execute();

    return patterns.map(pattern => {
      const sequence = pattern.sequence.emojis.map(cell => cell.emoji);
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
    });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    return [];
  }
}

/**
 * Validate batch export options
 */
function validateBatchExportOptions(options: BatchExportOptions): { valid: boolean; error?: string } {
  const validFormats: ExportFormat[] = ['text', 'png', 'svg', 'pdf', 'json'];
  
  if (!options.formats.every(format => validFormats.includes(format))) {
    return {
      valid: false,
      error: `Invalid format(s). Must be one of: ${validFormats.join(', ')}`
    };
  }

  if (options.formats.length === 0) {
    return {
      valid: false,
      error: 'At least one export format is required'
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
 * Get maximum batch size for user level
 */
function getMaxBatchSize(userLevel: string): number {
  const limits: Record<string, number> = {
    beginner: 0,     // No batch operations
    intermediate: 5, // Small batches
    advanced: 20,    // Medium batches
    expert: 100,     // Large batches
  };

  return limits[userLevel] || 0;
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

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}