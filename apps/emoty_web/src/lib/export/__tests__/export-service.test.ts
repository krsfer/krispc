import { ExportService } from '../export-service';
import { ImageGenerator } from '../image-generator';
import type { PatternState } from '@/types/pattern';
import type { ExportOptions } from '@/types/export';

// Mock dependencies
jest.mock('../image-generator');
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    addImage: jest.fn(),
    addPage: jest.fn(),
    output: jest.fn().mockReturnValue(new Blob(['pdf content'], { type: 'application/pdf' })),
    internal: {
      pageSize: {
        getWidth: jest.fn().mockReturnValue(210),
        getHeight: jest.fn().mockReturnValue(297)
      }
    }
  }))
}));

const MockImageGenerator = ImageGenerator as jest.MockedClass<typeof ImageGenerator>;

describe('ExportService', () => {
  let exportService: ExportService;
  let mockImageGenerator: jest.Mocked<ImageGenerator>;

  const mockPattern: PatternState = {
    id: 'pattern-123',
    name: 'Test Pattern',
    sequence: ['😀', '😊', '😍'],
    insertionIndex: 0,
    patternSize: 8,
    patternMode: 'concentric' as const,
    activeInsertionMode: 'concentric' as const,
    tags: ['test', 'emoji'],
    createdAt: new Date('2024-01-15T10:00:00Z'),
    metadata: {
      aiGenerated: false,
      complexity: 'simple' as const,
      language: 'en' as const,
      userLevel: 1
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockImageGenerator = {
      generatePNG: jest.fn(),
      generateSVG: jest.fn(),
      dispose: jest.fn()
    } as any;

    MockImageGenerator.mockImplementation(() => mockImageGenerator);
    exportService = new ExportService();
  });

  describe('exportPattern', () => {
    const baseOptions: ExportOptions = {
      format: 'text',
      quality: 90,
      size: 'medium',
      includeMetadata: false,
      backgroundColor: '#ffffff',
      transparentBackground: false
    };

    it('should export pattern as text', async () => {
      const options: ExportOptions = {
        ...baseOptions,
        format: 'text',
        textFormat: 'plain'
      };

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('text');
      expect(result.filename).toContain('Test_Pattern');
      expect(result.filename).toContain('.txt');
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should export pattern as markdown', async () => {
      const options: ExportOptions = {
        ...baseOptions,
        format: 'text',
        textFormat: 'markdown',
        includeMetadata: true
      };

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(true);
      expect(result.filename).toContain('.md');
      
      // Verify markdown content
      const text = await (result.data as Blob).text();
      expect(text).toContain('# Test Pattern');
      expect(text).toContain('**Sequence:**');
      expect(text).toContain('## Metadata:');
    });

    it('should export pattern as CSV', async () => {
      const options: ExportOptions = {
        ...baseOptions,
        format: 'text',
        textFormat: 'csv'
      };

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(true);
      expect(result.filename).toContain('.csv');
      
      // Verify CSV content
      const text = await (result.data as Blob).text();
      expect(text).toContain('Position,Emoji,Unicode');
      expect(text).toContain('1,"😀"');
    });

    it('should export pattern as PNG', async () => {
      const mockBlob = new Blob(['png data'], { type: 'image/png' });
      mockImageGenerator.generatePNG.mockResolvedValue(mockBlob);

      const options: ExportOptions = {
        ...baseOptions,
        format: 'png'
      };

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('png');
      expect(result.filename).toContain('.png');
      expect(result.data).toBe(mockBlob);
      expect(mockImageGenerator.generatePNG).toHaveBeenCalledWith(mockPattern, expect.any(Object));
    });

    it('should export pattern as SVG', async () => {
      const mockBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      mockImageGenerator.generateSVG.mockResolvedValue(mockBlob);

      const options: ExportOptions = {
        ...baseOptions,
        format: 'svg'
      };

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('svg');
      expect(result.filename).toContain('.svg');
      expect(result.data).toBe(mockBlob);
      expect(mockImageGenerator.generateSVG).toHaveBeenCalledWith(mockPattern, expect.any(Object));
    });

    it('should export pattern as PDF', async () => {
      const mockBlob = new Blob(['png data'], { type: 'image/png' });
      mockImageGenerator.generatePNG.mockResolvedValue(mockBlob);

      // Mock FileReader for blob to data URL conversion
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:image/png;base64,mockdata',
        onload: null as any,
        onerror: null as any
      };

      global.FileReader = jest.fn(() => mockFileReader) as any;

      const options: ExportOptions = {
        ...baseOptions,
        format: 'pdf',
        includeMetadata: true
      };

      // Simulate FileReader success
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({} as any);
        }
      }, 0);

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.filename).toContain('.pdf');
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should export pattern as JSON', async () => {
      const options: ExportOptions = {
        ...baseOptions,
        format: 'json',
        includeMetadata: true
      };

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.filename).toContain('.json');
      
      // Verify JSON content
      const text = await (result.data as Blob).text();
      const jsonData = JSON.parse(text);
      
      expect(jsonData.pattern.id).toBe(mockPattern.id);
      expect(jsonData.pattern.name).toBe(mockPattern.name);
      expect(jsonData.pattern.sequence).toEqual(mockPattern.sequence);
      expect(jsonData.metadata).toBeDefined();
      expect(jsonData.export.format).toBe('json');
    });

    it('should include metadata when requested', async () => {
      const options: ExportOptions = {
        ...baseOptions,
        format: 'json',
        includeMetadata: true
      };

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.patternId).toBe(mockPattern.id);
      expect(result.metadata?.patternName).toBe(mockPattern.name);
      expect(result.metadata?.format).toBe('json');
    });

    it('should handle export errors gracefully', async () => {
      const options: ExportOptions = {
        ...baseOptions,
        format: 'png'
      };

      mockImageGenerator.generatePNG.mockRejectedValue(new Error('Image generation failed'));

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image generation failed');
      expect(result.format).toBe('png');
    });

    it('should validate export options', async () => {
      const invalidOptions: ExportOptions = {
        ...baseOptions,
        quality: 150, // Invalid quality > 100
      };

      const result = await exportService.exportPattern(mockPattern, invalidOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quality must be between 0 and 100');
    });

    it('should validate custom dimensions', async () => {
      const invalidOptions: ExportOptions = {
        ...baseOptions,
        format: 'png',
        size: 'custom',
        dimensions: { width: 5000, height: 5000 } // Exceeds max size
      };

      const result = await exportService.exportPattern(mockPattern, invalidOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Custom dimensions cannot exceed 4096x4096 pixels');
    });

    it('should reject unsupported formats', async () => {
      const options = {
        ...baseOptions,
        format: 'unsupported' as any
      };

      const result = await exportService.exportPattern(mockPattern, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported export format');
    });
  });

  describe('filename generation', () => {
    it('should generate filename with pattern name', async () => {
      const options: ExportOptions = {
        format: 'text',
        quality: 90,
        size: 'medium',
        includeMetadata: false,
        backgroundColor: '#ffffff',
        transparentBackground: false
      };

      const result = await exportService.exportPattern(mockPattern, options);
      
      expect(result.filename).toMatch(/^Test_Pattern_\d{4}-\d{2}-\d{2}\.txt$/);
    });

    it('should sanitize pattern name for filename', async () => {
      const patternWithSpecialChars = {
        ...mockPattern,
        name: 'Test/Pattern\\With:Special*Chars?'
      };

      const options: ExportOptions = {
        format: 'text',
        quality: 90,
        size: 'medium',
        includeMetadata: false,
        backgroundColor: '#ffffff',
        transparentBackground: false
      };

      const result = await exportService.exportPattern(patternWithSpecialChars, options);
      
      expect(result.filename).toMatch(/^Test_Pattern_With_Special_Chars_\d{4}-\d{2}-\d{2}\.txt$/);
    });

    it('should use default name when pattern has no name', async () => {
      const unnamedPattern = {
        ...mockPattern,
        name: undefined
      };

      const options: ExportOptions = {
        format: 'text',
        quality: 90,
        size: 'medium',
        includeMetadata: false,
        backgroundColor: '#ffffff',
        transparentBackground: false
      };

      const result = await exportService.exportPattern(unnamedPattern, options);
      
      expect(result.filename).toMatch(/^pattern_\d{4}-\d{2}-\d{2}\.txt$/);
    });
  });

  describe('checkFormatAccess', () => {
    it('should allow basic formats for all users', () => {
      expect(ExportService.checkFormatAccess('beginner', 'text')).toBe(true);
      expect(ExportService.checkFormatAccess('beginner', 'png')).toBe(true);
      expect(ExportService.checkFormatAccess('beginner', 'json')).toBe(true);
    });

    it('should restrict SVG to intermediate+ users', () => {
      expect(ExportService.checkFormatAccess('beginner', 'svg')).toBe(false);
      expect(ExportService.checkFormatAccess('intermediate', 'svg')).toBe(true);
      expect(ExportService.checkFormatAccess('advanced', 'svg')).toBe(true);
      expect(ExportService.checkFormatAccess('expert', 'svg')).toBe(true);
    });

    it('should restrict PDF to advanced+ users', () => {
      expect(ExportService.checkFormatAccess('beginner', 'pdf')).toBe(false);
      expect(ExportService.checkFormatAccess('intermediate', 'pdf')).toBe(false);
      expect(ExportService.checkFormatAccess('advanced', 'pdf')).toBe(true);
      expect(ExportService.checkFormatAccess('expert', 'pdf')).toBe(true);
    });

    it('should reject unknown formats', () => {
      expect(ExportService.checkFormatAccess('expert', 'unknown' as any)).toBe(false);
    });
  });
});