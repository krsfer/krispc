# Emoty Export System

A comprehensive export system for the Emoty web application that handles multiple file formats, batch operations, and pattern sharing with progressive feature unlocking.

## Features

### 🎯 Core Export Functionality
- **Multiple Formats**: Text, PNG, SVG, PDF, JSON
- **Canvas-based Rendering**: High-quality emoji pattern images
- **Batch Processing**: Export multiple patterns simultaneously
- **ZIP Archive Creation**: Convenient packaging for batch exports
- **Share Codes**: Generate shareable links for patterns

### 🔒 Progressive Feature Unlocking
- **Beginner**: Text, PNG, JSON export
- **Intermediate**: SVG export, batch operations (5 patterns), share codes
- **Advanced**: PDF export, larger batches (20 patterns)
- **Expert**: Unlimited operations, all features

### ⚡ Performance Optimized
- **Memory Efficient**: Streaming operations for large batches
- **Queue-based Processing**: Non-blocking concurrent exports
- **Canvas Optimization**: Anti-aliasing and quality settings
- **Compression**: Efficient pattern data compression for sharing

## Architecture

```
src/lib/export/
├── export-service.ts      # Core export functionality
├── image-generator.ts     # Canvas-based image rendering  
├── share-codes.ts         # Share code generation & management
├── batch-processor.ts     # Batch export processing
└── index.ts              # Public API exports
```

## API Endpoints

```
POST /api/export/pattern   # Single pattern export
POST /api/export/batch     # Batch pattern export
POST /api/share/create     # Generate share code
GET  /api/share/[code]     # Retrieve shared pattern
GET  /api/share/user       # User's share codes
```

## Usage Examples

### Single Pattern Export

```typescript
import { ExportService } from '@/lib/export';

const exportService = new ExportService();

// Export as PNG
const result = await exportService.exportPattern(pattern, {
  format: 'png',
  size: 'large',
  quality: 90,
  backgroundColor: '#ffffff',
  includeMetadata: true,
  includePadding: true,
});

if (result.success && result.data instanceof Blob) {
  // Download the file
  const url = URL.createObjectURL(result.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Batch Export with Progress Tracking

```typescript
import { BatchProcessor } from '@/lib/export';

const processor = new BatchProcessor();

const result = await processor.processBatch(
  patterns,
  {
    formats: ['png', 'svg', 'json'],
    createZip: true,
    size: 'medium',
    quality: 85,
    includeManifest: true,
  },
  (progress) => {
    console.log(`Progress: ${progress.completed}/${progress.total}`);
    console.log(`Current: ${progress.current}`);
  }
);

if (result.success && result.zipFile) {
  // Download ZIP file
  const url = URL.createObjectURL(result.zipFile);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'emoty_patterns_export.zip';
  a.click();
  URL.revokeObjectURL(url);
}
```

### Generate Share Code

```typescript
import { ShareCodeService } from '@/lib/export';

const shareData = await ShareCodeService.generateShareCode(
  pattern,
  userId,
  {
    expirationDays: 30,
    includeMetadata: true,
    compress: true,
  }
);

console.log(`Share code: ${shareData.code}`);
console.log(`Share URL: ${shareData.url}`);
```

### Retrieve Shared Pattern

```typescript
import { ShareCodeService } from '@/lib/export';

const pattern = await ShareCodeService.getPatternFromShareCode('ABC12345');

if (pattern) {
  // Use the pattern
  console.log(`Retrieved: ${pattern.name}`);
} else {
  console.log('Share code not found or expired');
}
```

## Export Options

### Common Options
```typescript
interface ExportOptions {
  format: ExportFormat;              // 'text' | 'png' | 'svg' | 'pdf' | 'json'
  size: ExportSize;                  // 'small' | 'medium' | 'large' | 'xlarge' | 'custom'
  dimensions?: ExportDimensions;     // Custom width/height for 'custom' size
  quality: number;                   // 0-100, mainly for PNG/PDF
  backgroundColor: string;           // Background color for images
  includeMetadata: boolean;          // Include pattern metadata
  includePadding: boolean;           // Add padding around pattern
  transparentBackground?: boolean;   // For PNG/SVG
}
```

### Format-Specific Options
```typescript
// PDF options
{
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
}

// Text options
{
  textFormat?: 'plain' | 'markdown' | 'csv';
  includePositions?: boolean;
}
```

### Batch Export Options
```typescript
interface BatchExportOptions extends ExportOptions {
  formats: ExportFormat[];          // Multiple formats to export
  createZip: boolean;               // Create ZIP archive
  zipName?: string;                 // Custom ZIP filename
  includeManifest: boolean;         // Include export manifest
}
```

## Share Code System

### Features
- **8-character alphanumeric codes** (excluding confusing chars)
- **Compression**: Efficient pattern data storage
- **Expiration**: Optional time-based expiration
- **View tracking**: Monitor share code usage
- **Quota system**: Per-level limits on active codes

### Database Schema
```sql
CREATE TABLE share_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(8) UNIQUE NOT NULL,
  pattern_id UUID REFERENCES patterns(id),
  user_id UUID REFERENCES users(id),
  pattern_data JSONB NOT NULL,
  view_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Usage Quotas
- **Beginner**: No share codes
- **Intermediate**: 5 active codes
- **Advanced**: 15 active codes  
- **Expert**: Unlimited codes

## Image Generation

### Canvas Rendering
- **High-quality emoji fonts**: Segoe UI Emoji, Noto Color Emoji, Apple Color Emoji
- **Anti-aliasing**: Configurable quality settings
- **Grid layouts**: Support for concentric and sequential patterns
- **Custom dimensions**: Up to 4096×4096 pixels
- **Memory efficient**: Proper canvas cleanup

### Supported Formats
- **PNG**: Raster images with transparency support
- **SVG**: Vector graphics with scalability
- **PDF**: Multi-page documents with metadata

## Error Handling

### Comprehensive Error Recovery
- **Graceful degradation**: Continue processing other items on individual failures
- **Detailed error reporting**: Specific error messages for debugging
- **Retry mechanisms**: Automatic retry for transient failures
- **Resource cleanup**: Proper disposal of canvas and memory resources

### Error Types
- **Validation errors**: Invalid options or parameters
- **Permission errors**: Insufficient user level access
- **Processing errors**: Canvas/rendering failures  
- **Network errors**: API communication issues
- **Quota errors**: Exceeded user limits

## Performance Considerations

### Memory Management
- **Canvas disposal**: Proper cleanup after image generation
- **Streaming exports**: Process large batches without memory buildup
- **Compression**: Efficient pattern data compression
- **Concurrent limits**: Prevent system overload with concurrency limits

### Processing Optimization
- **Batch chunking**: Process items in smaller chunks
- **Progress callbacks**: Non-blocking progress reporting
- **Queue management**: Efficient task scheduling
- **Caching**: Reuse generated assets when appropriate

## Security & Privacy

### Data Protection
- **Local processing**: Images generated client-side when possible
- **Minimal data sharing**: Only necessary pattern data in share codes
- **Expiration enforcement**: Automatic cleanup of expired codes
- **User consent**: Clear indication of what data is shared

### Access Control
- **Progressive permissions**: Feature access based on user level
- **Ownership validation**: Users can only share their own patterns
- **Quota enforcement**: Prevent abuse with usage limits
- **Input validation**: Sanitize all user inputs

## Dependencies

### Core Dependencies
- **jsPDF**: PDF generation
- **JSZip**: ZIP archive creation
- **pako**: Data compression for share codes

### Browser APIs
- **Canvas API**: Image rendering
- **Clipboard API**: Copy share codes/URLs
- **File API**: Blob creation and download

## Testing

### Unit Tests
- Export service functionality
- Image generation accuracy
- Share code generation and retrieval
- Batch processing logic

### Integration Tests
- API endpoint functionality
- Database operations
- Canvas rendering quality
- Error handling scenarios

### Manual Testing
- Cross-browser compatibility
- Performance under load
- User experience flows
- Accessibility compliance

## Future Enhancements

### Planned Features
- **Real-time collaboration**: Shared pattern editing
- **Template system**: Pre-made pattern templates
- **Analytics**: Export usage statistics
- **Watermarking**: Optional branding for exports

### Performance Improvements
- **WebAssembly**: Faster image processing
- **Service Workers**: Background processing
- **IndexedDB**: Client-side pattern caching
- **CDN integration**: Faster asset delivery

## Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Run database migrations: `npm run db:migrate`
3. Start development server: `npm run dev`

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Jest testing framework

### Pull Request Process
1. Add tests for new features
2. Update documentation
3. Ensure all tests pass
4. Request review from team members

## License

This export system is part of the Emoty Web Application and follows the project's licensing terms.