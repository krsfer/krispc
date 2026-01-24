import JSZip from 'jszip';
import type { PatternState } from '@/types/pattern';
import type {
  BatchExportOptions,
  BatchExportProgress,
  BatchExportResult,
  BatchManifest,
  ExportFormat,
  ExportResult,
} from '@/types/export';
import { ExportService } from './export-service';

interface ProcessingTask {
  pattern: PatternState;
  formats: ExportFormat[];
  index: number;
}

export class BatchProcessor {
  private exportService: ExportService;
  private isProcessing = false;
  private currentProgress: BatchExportProgress | null = null;
  private onProgressCallback: ((progress: BatchExportProgress) => void) | null = null;

  constructor() {
    this.exportService = new ExportService();
  }

  /**
   * Process multiple patterns for batch export
   */
  async processBatch(
    patterns: PatternState[],
    options: BatchExportOptions,
    onProgress?: (progress: BatchExportProgress) => void
  ): Promise<BatchExportResult> {
    if (this.isProcessing) {
      throw new Error('Batch processing already in progress');
    }

    this.isProcessing = true;
    this.onProgressCallback = onProgress || null;

    // Initialize progress
    const totalOperations = patterns.length * options.formats.length;
    this.currentProgress = {
      total: totalOperations,
      completed: 0,
      current: '',
      status: 'processing',
      errors: [],
    };

    this.reportProgress();

    try {
      const results = await this.processPatterns(patterns, options);
      
      if (options.createZip) {
        const zipFile = await this.createZipFile(results, patterns, options);
        return {
          success: true,
          zipFile,
          manifest: this.createManifest(patterns, results, options),
          errors: this.currentProgress.errors,
          progress: this.currentProgress,
        };
      } else {
        return {
          success: true,
          individualFiles: results,
          manifest: this.createManifest(patterns, results, options),
          errors: this.currentProgress.errors,
          progress: this.currentProgress,
        };
      }
    } catch (error) {
      this.currentProgress.status = 'error';
      this.currentProgress.errors.push(
        error instanceof Error ? error.message : 'Unknown batch processing error'
      );
      this.reportProgress();

      return {
        success: false,
        errors: this.currentProgress.errors,
        progress: this.currentProgress,
      };
    } finally {
      this.isProcessing = false;
      this.currentProgress = null;
      this.onProgressCallback = null;
    }
  }

  /**
   * Process individual patterns
   */
  private async processPatterns(
    patterns: PatternState[],
    options: BatchExportOptions
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    const concurrencyLimit = 3; // Process 3 patterns at a time to avoid memory issues
    
    // Create processing tasks
    const tasks: ProcessingTask[] = patterns.map((pattern, index) => ({
      pattern,
      formats: options.formats,
      index,
    }));

    // Process tasks in chunks
    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
      const chunk = tasks.slice(i, i + concurrencyLimit);
      const chunkPromises = chunk.map(task => this.processPatternTask(task, options));
      
      try {
        const chunkResults = await Promise.allSettled(chunkPromises);
        
        chunkResults.forEach((result, chunkIndex) => {
          const taskIndex = i + chunkIndex;
          const task = tasks[taskIndex];
          
          if (result.status === 'fulfilled') {
            results.push(...result.value);
          } else {
            const errorMessage = `Failed to process pattern "${task.pattern.name}": ${result.reason}`;
            this.currentProgress!.errors.push(errorMessage);
            
            // Create error results for all formats
            task.formats.forEach(format => {
              results.push({
                success: false,
                filename: this.generateErrorFilename(task.pattern, format),
                format,
                size: 0,
                error: errorMessage,
              });
            });
          }
        });
      } catch (error) {
        console.error('Chunk processing failed:', error);
        this.currentProgress!.errors.push(
          `Batch processing chunk failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    this.currentProgress!.status = 'completed';
    this.reportProgress();

    return results;
  }

  /**
   * Process a single pattern task (pattern with multiple formats)
   */
  private async processPatternTask(
    task: ProcessingTask,
    batchOptions: BatchExportOptions
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    
    for (const format of task.formats) {
      this.currentProgress!.current = `${task.pattern.name || 'Unnamed Pattern'} (${format.toUpperCase()})`;
      this.reportProgress();

      try {
        const exportOptions = {
          ...batchOptions,
          format,
        };

        const result = await this.exportService.exportPattern(task.pattern, exportOptions);
        results.push(result);

        if (!result.success) {
          this.currentProgress!.errors.push(
            `Failed to export ${task.pattern.name} as ${format}: ${result.error}`
          );
        }
      } catch (error) {
        const errorMessage = `Unexpected error exporting ${task.pattern.name} as ${format}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        
        this.currentProgress!.errors.push(errorMessage);
        
        results.push({
          success: false,
          filename: this.generateErrorFilename(task.pattern, format),
          format,
          size: 0,
          error: errorMessage,
        });
      }

      this.currentProgress!.completed++;
      this.reportProgress();

      // Add small delay to prevent browser freezing
      await this.delay(10);
    }

    return results;
  }

  /**
   * Create ZIP file from export results
   */
  private async createZipFile(
    results: ExportResult[],
    patterns: PatternState[],
    options: BatchExportOptions
  ): Promise<Blob> {
    const zip = new JSZip();
    
    // Group results by pattern
    const resultsByPattern = new Map<string, ExportResult[]>();
    
    results.forEach(result => {
      const patternName = this.extractPatternNameFromFilename(result.filename, result.format);
      if (!resultsByPattern.has(patternName)) {
        resultsByPattern.set(patternName, []);
      }
      resultsByPattern.get(patternName)!.push(result);
    });

    // Add files to ZIP
    for (const [patternName, patternResults] of resultsByPattern) {
      const folderName = this.sanitizeFilename(patternName);
      
      for (const result of patternResults) {
        if (result.success && result.data) {
          const filename = `${folderName}/${result.filename}`;
          
          if (result.data instanceof Blob) {
            zip.file(filename, result.data);
          } else {
            zip.file(filename, result.data);
          }
        }
      }
    }

    // Add manifest if requested
    if (options.includeManifest) {
      const manifest = this.createManifest(patterns, results, options);
      const manifestJson = JSON.stringify(manifest, null, 2);
      zip.file('manifest.json', manifestJson);
      
      // Also add a human-readable summary
      const summary = this.createHumanReadableSummary(manifest);
      zip.file('EXPORT_SUMMARY.txt', summary);
    }

    // Generate ZIP
    try {
      return await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        streamFiles: true, // Better memory usage for large files
      });
    } catch (error) {
      throw new Error(`Failed to create ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create batch manifest
   */
  private createManifest(
    patterns: PatternState[],
    results: ExportResult[],
    options: BatchExportOptions
  ): BatchManifest {
    const manifest: BatchManifest = {
      exportDate: new Date(),
      totalPatterns: patterns.length,
      formats: options.formats,
      patterns: [],
      settings: options,
    };

    // Group results by pattern
    const resultsByPattern = this.groupResultsByPattern(results);

    patterns.forEach(pattern => {
      const patternName = pattern.name || 'Unnamed Pattern';
      const patternResults = resultsByPattern.get(patternName) || [];
      
      manifest.patterns.push({
        id: pattern.id || '',
        name: patternName,
        files: patternResults
          .filter(result => result.success)
          .map(result => ({
            format: result.format,
            filename: result.filename,
            size: result.size,
          })),
      });
    });

    return manifest;
  }

  /**
   * Create human-readable summary
   */
  private createHumanReadableSummary(manifest: BatchManifest): string {
    const successfulPatterns = manifest.patterns.filter(p => p.files.length > 0).length;
    const totalFiles = manifest.patterns.reduce((sum, p) => sum + p.files.length, 0);
    const totalSize = manifest.patterns.reduce(
      (sum, p) => sum + p.files.reduce((fileSum, f) => fileSum + f.size, 0),
      0
    );

    let summary = `EMOTY PATTERN EXPORT SUMMARY\n`;
    summary += `===============================\n\n`;
    summary += `Export Date: ${manifest.exportDate.toLocaleString()}\n`;
    summary += `Total Patterns: ${manifest.totalPatterns}\n`;
    summary += `Successful Exports: ${successfulPatterns}\n`;
    summary += `Total Files: ${totalFiles}\n`;
    summary += `Total Size: ${this.formatFileSize(totalSize)}\n`;
    summary += `Formats: ${manifest.formats.map(f => f.toUpperCase()).join(', ')}\n\n`;

    summary += `PATTERN DETAILS:\n`;
    summary += `================\n\n`;

    manifest.patterns.forEach((pattern, index) => {
      summary += `${index + 1}. ${pattern.name}\n`;
      if (pattern.files.length > 0) {
        pattern.files.forEach(file => {
          summary += `   - ${file.filename} (${file.format.toUpperCase()}, ${this.formatFileSize(file.size)})\n`;
        });
      } else {
        summary += `   - No files exported (errors occurred)\n`;
      }
      summary += `\n`;
    });

    return summary;
  }

  /**
   * Group results by pattern name
   */
  private groupResultsByPattern(results: ExportResult[]): Map<string, ExportResult[]> {
    const grouped = new Map<string, ExportResult[]>();
    
    results.forEach(result => {
      const patternName = this.extractPatternNameFromFilename(result.filename, result.format);
      if (!grouped.has(patternName)) {
        grouped.set(patternName, []);
      }
      grouped.get(patternName)!.push(result);
    });

    return grouped;
  }

  /**
   * Extract pattern name from filename
   */
  private extractPatternNameFromFilename(filename: string, format: ExportFormat): string {
    // Remove timestamp and extension
    const baseName = filename.replace(/\.\w+$/, ''); // Remove extension
    const withoutTimestamp = baseName.replace(/_\d{4}-\d{2}-\d{2}$/, ''); // Remove timestamp
    return withoutTimestamp || 'Unnamed Pattern';
  }

  /**
   * Generate error filename
   */
  private generateErrorFilename(pattern: PatternState, format: ExportFormat): string {
    const name = pattern.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'pattern';
    const timestamp = new Date().toISOString().slice(0, 10);
    const extension = this.getFileExtension(format);
    return `${name}_${timestamp}_ERROR.${extension}`;
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      text: 'txt',
      png: 'png',
      svg: 'svg',
      pdf: 'pdf',
      json: 'json',
    };
    return extensions[format] || 'txt';
  }

  /**
   * Sanitize filename for ZIP
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100); // Limit length
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Report progress to callback
   */
  private reportProgress(): void {
    if (this.onProgressCallback && this.currentProgress) {
      this.onProgressCallback({ ...this.currentProgress });
    }
  }

  /**
   * Add delay to prevent blocking
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel current batch processing
   */
  cancel(): void {
    if (this.isProcessing && this.currentProgress) {
      this.currentProgress.status = 'error';
      this.currentProgress.errors.push('Batch processing was cancelled by user');
      this.reportProgress();
    }
    this.isProcessing = false;
  }

  /**
   * Get current processing status
   */
  getStatus(): BatchExportProgress | null {
    return this.currentProgress ? { ...this.currentProgress } : null;
  }

  /**
   * Check if batch processing is currently running
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Estimate processing time based on patterns and formats
   */
  estimateProcessingTime(
    patternCount: number,
    formats: ExportFormat[]
  ): { estimatedSeconds: number; estimatedOperations: number } {
    const operationsPerPattern = formats.length;
    const totalOperations = patternCount * operationsPerPattern;
    
    // Rough estimates based on format complexity (in seconds per operation)
    const formatTimes: Record<ExportFormat, number> = {
      text: 0.1,
      json: 0.1,
      png: 0.5,
      svg: 0.3,
      pdf: 1.0,
    };

    const estimatedSeconds = formats.reduce((total, format) => {
      return total + (formatTimes[format] * patternCount);
    }, 0);

    return {
      estimatedSeconds: Math.ceil(estimatedSeconds),
      estimatedOperations: totalOperations,
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.cancel();
    this.onProgressCallback = null;
  }
}