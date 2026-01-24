/**
 * Pattern Export Utilities
 *
 * Provides functions to export patterns in various formats:
 * - Text: Simple emoji sequence
 * - JSON: Full pattern data
 * - PNG: Rendered pattern as image
 */

import type { SavedPattern } from '@/types/pattern';
import { PatternGenerator } from '@/lib/utils/pattern-generator';

/**
 * Export pattern as plain text (emoji sequence)
 * @param pattern The pattern to export
 * @returns Emoji sequence as string
 */
export function exportAsText(pattern: SavedPattern): string {
  return pattern.sequence.join('');
}

/**
 * Export pattern as JSON with full metadata
 * @param pattern The pattern to export
 * @returns Pretty-printed JSON string
 */
export function exportAsJSON(pattern: SavedPattern): string {
  const exportData = {
    name: pattern.name,
    sequence: pattern.sequence,
    createdAt: pattern.createdAt.toISOString(),
    updatedAt: pattern.updatedAt.toISOString(),
    exportedAt: new Date().toISOString(),
    format: 'emoty-pattern-v1',
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Export pattern as PNG image
 * Uses canvas to render the concentric pattern
 * @param pattern The pattern to export
 * @param size Optional canvas size (default: 512)
 * @returns Promise resolving to PNG blob
 */
export async function exportAsPNG(
  pattern: SavedPattern,
  size: number = 512
): Promise<Blob> {
  // Generate the pattern grid
  const grid = PatternGenerator.generateConcentricPattern(pattern.sequence);

  if (grid.length === 0) {
    throw new Error('Cannot export empty pattern');
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Set canvas size
  canvas.width = size;
  canvas.height = size;

  // Calculate cell size
  const padding = size * 0.05; // 5% padding
  const availableSize = size - (padding * 2);
  const cellSize = availableSize / grid.length;

  // Draw white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Draw subtle grid lines
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;

  for (let i = 0; i <= grid.length; i++) {
    const pos = padding + (i * cellSize);
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(pos, padding);
    ctx.lineTo(pos, padding + availableSize);
    ctx.stroke();

    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(padding, pos);
    ctx.lineTo(padding + availableSize, pos);
    ctx.stroke();
  }

  // Draw emojis
  const fontSize = cellSize * 0.7;
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell = grid[row][col];
      if (cell.emoji) {
        const x = padding + (col * cellSize) + (cellSize / 2);
        const y = padding + (row * cellSize) + (cellSize / 2);

        // Highlight center cell
        if (cell.isCenter) {
          ctx.fillStyle = 'rgba(123, 97, 255, 0.1)';
          ctx.fillRect(
            padding + (col * cellSize) + 2,
            padding + (row * cellSize) + 2,
            cellSize - 4,
            cellSize - 4
          );
        }

        ctx.fillStyle = '#000000';
        ctx.fillText(cell.emoji, x, y);
      }
    }
  }

  // Add watermark/branding at bottom
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Made with Emoty', size - 10, size - 5);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create PNG blob'));
      }
    }, 'image/png');
  });
}

/**
 * Trigger file download in browser
 * @param content File content (string or blob)
 * @param filename Filename for download
 * @param mimeType MIME type of the content
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  let blob: Blob;

  if (content instanceof Blob) {
    blob = content;
  } else {
    blob = new Blob([content], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 * @param text Text to copy
 * @returns Promise resolving when copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Generate a safe filename from pattern name
 * @param name Pattern name
 * @param extension File extension
 * @returns Safe filename
 */
export function generateFilename(name: string, extension: string): string {
  // Remove special characters and replace spaces
  const safeName = name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50) || 'pattern';

  const timestamp = new Date().toISOString().slice(0, 10);
  return `emoty-${safeName}-${timestamp}.${extension}`;
}
