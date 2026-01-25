// Export system for Emoty Web
// Comprehensive export functionality for patterns

import { ExportService } from './export-service';
import { BatchProcessor } from './batch-processor';
import type { ExportFormat, ExportOptions } from '@/types/export';

export { ExportService } from './export-service';
export { ImageGenerator } from './image-generator';
export { ShareCodeService, PatternCompressor } from './share-codes';
export { BatchProcessor } from './batch-processor';

// Re-export types
export type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  ExportSize,
  ExportDimensions,
  BatchExportOptions,
  BatchExportProgress,
  BatchExportResult,
  BatchManifest,
  ShareCodeData,
  ShareCodeOptions,
  EXPORT_SIZE_PRESETS,
  EXPORT_QUALITY_PRESETS,
  EXPORT_FEATURE_REQUIREMENTS,
  BATCH_EXPORT_REQUIREMENTS,
  SHARE_CODE_REQUIREMENTS,
} from '@/types/export';

// Export utility functions
export const ExportUtils = {
  /**
   * Check if user can access export format
   */
  canUserAccessFormat(userLevel: string, format: ExportFormat): boolean {
    return ExportService.checkFormatAccess(userLevel, format);
  },

  /**
   * Get maximum batch size for user level
   */
  getMaxBatchSize(userLevel: string): number {
    const limits: Record<string, number> = {
      beginner: 0,     // No batch operations
      intermediate: 5, // Small batches
      advanced: 20,    // Medium batches
      expert: 100,     // Large batches
    };
    return limits[userLevel] || 0;
  },

  /**
   * Estimate export processing time
   */
  estimateProcessingTime(
    patternCount: number,
    formats: ExportFormat[]
  ): { estimatedSeconds: number; estimatedOperations: number } {
    const batchProcessor = new BatchProcessor();
    return batchProcessor.estimateProcessingTime(patternCount, formats);
  },

  /**
   * Validate export options
   */
  validateExportOptions(options: ExportOptions): { valid: boolean; error?: string } {
    if (options.quality < 0 || options.quality > 100) {
      return { valid: false, error: 'Quality must be between 0 and 100' };
    }

    if (options.size === 'custom') {
      if (!options.dimensions ||
        options.dimensions.width <= 0 ||
        options.dimensions.height <= 0) {
        return { valid: false, error: 'Custom dimensions must be positive numbers' };
      }

      if (options.dimensions.width > 4096 || options.dimensions.height > 4096) {
        return { valid: false, error: 'Custom dimensions cannot exceed 4096x4096 pixels' };
      }
    }

    return { valid: true };
  },

  /**
   * Get file extension for format
   */
  getFileExtension(format: ExportFormat, subtype?: string): string {
    switch (format) {
      case 'text':
        return subtype === 'markdown' ? 'md' : subtype === 'csv' ? 'csv' : 'txt';
      case 'png':
        return 'png';
      case 'svg':
        return 'svg';
      case 'pdf':
        return 'pdf';
      case 'json':
        return 'json';
      default:
        return 'txt';
    }
  },

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },
};