import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import type { PatternState } from '@/types/pattern';
import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  ExportDimensions,
  ExportMetadata,
  EXPORT_SIZE_PRESETS,
  EXPORT_QUALITY_PRESETS,
} from '@/types/export';
import { ImageGenerator } from './image-generator';

export class ExportService {
  private imageGenerator: ImageGenerator;

  constructor() {
    this.imageGenerator = new ImageGenerator();
  }

  /**
   * Export a single pattern in the specified format
   */
  async exportPattern(
    pattern: PatternState,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const startTime = Date.now();
      
      // Validate options
      this.validateExportOptions(options);
      
      let result: ExportResult;
      
      switch (options.format) {
        case 'text':
          result = await this.exportAsText(pattern, options);
          break;
        case 'png':
          result = await this.exportAsImage(pattern, options, 'png');
          break;
        case 'svg':
          result = await this.exportAsImage(pattern, options, 'svg');
          break;
        case 'pdf':
          result = await this.exportAsPDF(pattern, options);
          break;
        case 'json':
          result = await this.exportAsJSON(pattern, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Add metadata if requested
      if (options.includeMetadata && result.success) {
        result.metadata = this.createExportMetadata(
          pattern,
          options,
          result.dimensions || this.getDimensions(options),
          Date.now() - startTime
        );
      }

      return result;
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        filename: this.generateFilename(pattern, options.format),
        format: options.format,
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  /**
   * Export pattern as text
   */
  private async exportAsText(
    pattern: PatternState,
    options: ExportOptions
  ): Promise<ExportResult> {
    let textContent = '';
    
    switch (options.textFormat || 'plain') {
      case 'plain':
        textContent = pattern.sequence.join('');
        if (options.includePositions) {
          textContent += '\n\n# Positions:\n';
          pattern.sequence.forEach((emoji, index) => {
            textContent += `${index + 1}: ${emoji}\n`;
          });
        }
        break;
        
      case 'markdown':
        textContent = `# ${pattern.name || 'Emoji Pattern'}\n\n`;
        textContent += `**Sequence:** ${pattern.sequence.join('')}\n\n`;
        if (pattern.description) {
          textContent += `**Description:** ${pattern.description}\n\n`;
        }
        if (options.includePositions) {
          textContent += '## Position Details:\n\n';
          pattern.sequence.forEach((emoji, index) => {
            textContent += `${index + 1}. ${emoji}\n`;
          });
        }
        if (options.includeMetadata && pattern.metadata) {
          textContent += '\n## Metadata:\n\n';
          textContent += `- Created: ${pattern.createdAt || 'Unknown'}\n`;
          textContent += `- Complexity: ${pattern.metadata.complexity}\n`;
          textContent += `- AI Generated: ${pattern.metadata.aiGenerated ? 'Yes' : 'No'}\n`;
        }
        break;
        
      case 'csv':
        textContent = 'Position,Emoji,Unicode\n';
        pattern.sequence.forEach((emoji, index) => {
          const unicode = emoji.codePointAt(0)?.toString(16) || '';
          textContent += `${index + 1},"${emoji}",U+${unicode.toUpperCase()}\n`;
        });
        break;
    }

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const filename = this.generateFilename(pattern, 'text', options.textFormat);

    return {
      success: true,
      data: blob,
      filename,
      format: 'text',
      size: blob.size,
    };
  }

  /**
   * Export pattern as image (PNG or SVG)
   */
  private async exportAsImage(
    pattern: PatternState,
    options: ExportOptions,
    format: 'png' | 'svg'
  ): Promise<ExportResult> {
    const dimensions = this.getDimensions(options);
    
    let data: Blob;
    
    if (format === 'png') {
      data = await this.imageGenerator.generatePNG(pattern, {
        ...options,
        dimensions,
      });
    } else {
      data = await this.imageGenerator.generateSVG(pattern, {
        ...options,
        dimensions,
      });
    }

    const filename = this.generateFilename(pattern, format);

    return {
      success: true,
      data,
      filename,
      format,
      size: data.size,
      dimensions,
    };
  }

  /**
   * Export pattern as PDF
   */
  private async exportAsPDF(
    pattern: PatternState,
    options: ExportOptions
  ): Promise<ExportResult> {
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.pageSize || 'A4',
    });

    // Set up dimensions and positioning
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - 2 * margin;

    // Add title
    pdf.setFontSize(20);
    pdf.text(pattern.name || 'Emoji Pattern', margin, margin + 10);

    // Generate pattern image and add to PDF
    const imageSize = Math.min(contentWidth, contentHeight - 40);
    const imageDimensions = { width: imageSize * 2.83, height: imageSize * 2.83 }; // Convert mm to pixels roughly
    
    const imageBlob = await this.imageGenerator.generatePNG(pattern, {
      ...options,
      dimensions: imageDimensions,
      transparentBackground: false,
    });

    // Convert blob to data URL
    const imageDataUrl = await this.blobToDataURL(imageBlob);
    
    // Add image to PDF
    const imageX = (pageWidth - imageSize) / 2;
    const imageY = margin + 20;
    pdf.addImage(imageDataUrl, 'PNG', imageX, imageY, imageSize, imageSize);

    // Add pattern details
    let yPosition = imageY + imageSize + 20;
    pdf.setFontSize(12);
    
    pdf.text('Pattern Sequence:', margin, yPosition);
    yPosition += 8;
    
    // Add emojis in rows
    const emojiSize = 12;
    const emojisPerRow = Math.floor(contentWidth / emojiSize);
    let currentRow = 0;
    
    pattern.sequence.forEach((emoji, index) => {
      const xPos = margin + (index % emojisPerRow) * emojiSize;
      const yPos = yPosition + currentRow * emojiSize;
      
      if (index % emojisPerRow === 0 && index > 0) {
        currentRow++;
      }
      
      // Check if we need a new page
      if (yPos > pageHeight - margin - emojiSize) {
        pdf.addPage();
        currentRow = 0;
        yPosition = margin;
      }
      
      pdf.setFontSize(emojiSize);
      pdf.text(emoji, xPos, yPos + currentRow * emojiSize);
    });

    // Add metadata if requested
    if (options.includeMetadata && pattern.metadata) {
      yPosition += (currentRow + 1) * emojiSize + 10;
      
      if (yPosition > pageHeight - margin - 40) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFontSize(10);
      pdf.text('Pattern Details:', margin, yPosition);
      yPosition += 6;
      
      const details = [
        `Created: ${pattern.createdAt?.toDateString() || 'Unknown'}`,
        `Complexity: ${pattern.metadata.complexity}`,
        `AI Generated: ${pattern.metadata.aiGenerated ? 'Yes' : 'No'}`,
        `Size: ${pattern.patternSize}x${pattern.patternSize}`,
      ];
      
      details.forEach(detail => {
        pdf.text(detail, margin, yPosition);
        yPosition += 5;
      });
    }

    const pdfBlob = pdf.output('blob');
    const filename = this.generateFilename(pattern, 'pdf');

    return {
      success: true,
      data: pdfBlob,
      filename,
      format: 'pdf',
      size: pdfBlob.size,
      dimensions: { width: pageWidth, height: pageHeight },
    };
  }

  /**
   * Export pattern as JSON
   */
  private async exportAsJSON(
    pattern: PatternState,
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportData = {
      pattern: {
        id: pattern.id,
        name: pattern.name,
        description: pattern.description,
        sequence: pattern.sequence,
        patternSize: pattern.patternSize,
        patternMode: pattern.patternMode,
        tags: pattern.tags,
        createdAt: pattern.createdAt,
        updatedAt: pattern.updatedAt,
        isFavorite: pattern.isFavorite,
      },
      metadata: options.includeMetadata ? pattern.metadata : undefined,
      export: {
        format: 'json',
        exportedAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = this.generateFilename(pattern, 'json');

    return {
      success: true,
      data: blob,
      filename,
      format: 'json',
      size: blob.size,
    };
  }

  /**
   * Validate export options
   */
  private validateExportOptions(options: ExportOptions): void {
    if (!options.format) {
      throw new Error('Export format is required');
    }

    if (options.quality < 0 || options.quality > 100) {
      throw new Error('Quality must be between 0 and 100');
    }

    if (options.size === 'custom') {
      if (!options.dimensions || options.dimensions.width <= 0 || options.dimensions.height <= 0) {
        throw new Error('Custom dimensions must be positive numbers');
      }

      if (options.dimensions.width > 4096 || options.dimensions.height > 4096) {
        throw new Error('Custom dimensions cannot exceed 4096x4096 pixels');
      }
    }
  }

  /**
   * Get dimensions for export based on options
   */
  private getDimensions(options: ExportOptions): ExportDimensions {
    if (options.size === 'custom' && options.dimensions) {
      return options.dimensions;
    }

    return EXPORT_SIZE_PRESETS[options.size] || EXPORT_SIZE_PRESETS.medium;
  }

  /**
   * Generate filename for export
   */
  private generateFilename(
    pattern: PatternState,
    format: ExportFormat,
    subtype?: string
  ): string {
    const name = pattern.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'pattern';
    const timestamp = new Date().toISOString().slice(0, 10);
    const extension = this.getFileExtension(format, subtype);
    
    return `${name}_${timestamp}.${extension}`;
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: ExportFormat, subtype?: string): string {
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
  }

  /**
   * Create export metadata
   */
  private createExportMetadata(
    pattern: PatternState,
    options: ExportOptions,
    dimensions: ExportDimensions,
    processingTime: number
  ): ExportMetadata {
    return {
      patternId: pattern.id || uuidv4(),
      patternName: pattern.name || 'Unnamed Pattern',
      userLevel: pattern.metadata?.userLevel.toString() || 'unknown',
      exportTime: new Date(),
      format: options.format,
      size: dimensions,
      quality: options.quality,
      settings: { ...options },
    };
  }

  /**
   * Convert blob to data URL
   */
  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if user has access to export format
   */
  static checkFormatAccess(userLevel: string, format: ExportFormat): boolean {
    // This would integrate with the progression system
    // For now, return basic access rules
    switch (format) {
      case 'text':
      case 'png':
      case 'json':
        return true; // Basic export features
      case 'svg':
        return ['intermediate', 'advanced', 'expert'].includes(userLevel);
      case 'pdf':
        return ['advanced', 'expert'].includes(userLevel);
      default:
        return false;
    }
  }
}