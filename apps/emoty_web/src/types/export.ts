// Export types for Emoty Web export system

export type ExportFormat = 'text' | 'png' | 'svg' | 'pdf' | 'json';

export type ExportSize = 'small' | 'medium' | 'large' | 'xlarge' | 'custom';

export interface ExportDimensions {
  width: number;
  height: number;
}

export interface ExportOptions {
  format: ExportFormat;
  size: ExportSize;
  dimensions?: ExportDimensions; // For custom size
  quality: number; // 0-100, mainly for PNG/JPEG
  backgroundColor: string;
  includeMetadata: boolean;
  includePadding: boolean;
  transparentBackground?: boolean; // For PNG/SVG
  
  // PDF specific options
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  
  // Text specific options
  includePositions?: boolean;
  textFormat?: 'plain' | 'markdown' | 'csv';
}

export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  filename: string;
  format: ExportFormat;
  size: number; // bytes
  dimensions?: ExportDimensions;
  error?: string;
  metadata?: ExportMetadata;
}

export interface ExportMetadata {
  patternId: string;
  patternName: string;
  userLevel: string;
  exportTime: Date;
  format: ExportFormat;
  size: ExportDimensions;
  quality: number;
  settings: ExportOptions;
}

export interface BatchExportOptions extends Omit<ExportOptions, 'format'> {
  formats: ExportFormat[];
  createZip: boolean;
  zipName?: string;
  includeManifest: boolean;
}

export interface BatchExportProgress {
  total: number;
  completed: number;
  current: string; // Current item being processed
  status: 'pending' | 'processing' | 'completed' | 'error';
  errors: string[];
}

export interface BatchExportResult {
  success: boolean;
  zipFile?: Blob;
  individualFiles?: ExportResult[];
  manifest?: BatchManifest;
  errors: string[];
  progress: BatchExportProgress;
}

export interface BatchManifest {
  exportDate: Date;
  totalPatterns: number;
  formats: ExportFormat[];
  patterns: Array<{
    id: string;
    name: string;
    files: Array<{
      format: ExportFormat;
      filename: string;
      size: number;
    }>;
  }>;
  settings: BatchExportOptions;
}

export interface ShareCodeData {
  code: string;
  url: string;
  expiresAt?: Date;
  pattern: {
    id: string;
    name: string;
    sequence: string[];
    metadata: any;
  };
}

export interface ShareCodeOptions {
  expirationDays?: number; // null for no expiration
  includeMetadata: boolean;
  compress: boolean;
}

// Size presets for different export dimensions
export const EXPORT_SIZE_PRESETS: Record<ExportSize, ExportDimensions> = {
  small: { width: 256, height: 256 },
  medium: { width: 512, height: 512 },
  large: { width: 1024, height: 1024 },
  xlarge: { width: 2048, height: 2048 },
  custom: { width: 512, height: 512 }, // Default for custom
};

// Quality presets
export const EXPORT_QUALITY_PRESETS = {
  low: 60,
  medium: 80,
  high: 90,
  ultra: 100,
} as const;

// Feature access mapping for export formats
export const EXPORT_FEATURE_REQUIREMENTS: Record<ExportFormat, string[]> = {
  text: ['basic_export'],
  png: ['basic_export'],
  svg: ['export_multiple_formats'],
  pdf: ['advanced_export'],
  json: ['basic_export'],
};

// Batch export feature requirements
export const BATCH_EXPORT_REQUIREMENTS = ['batch_operations'];

// Share code feature requirements
export const SHARE_CODE_REQUIREMENTS = ['pattern_sharing'];