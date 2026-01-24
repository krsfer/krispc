import type { PatternState, GridCell } from '@/types/pattern';
import type { ExportDimensions, ExportOptions } from '@/types/export';

interface ImageGeneratorOptions extends ExportOptions {
  dimensions: ExportDimensions;
}

export class ImageGenerator {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;

  constructor() {
    this.initializeCanvas();
  }

  /**
   * Initialize canvas for image generation
   */
  private initializeCanvas(): void {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      
      if (this.context) {
        // Enable anti-aliasing for better quality
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = 'high';
      }
    }
  }

  /**
   * Generate PNG image of the pattern
   */
  async generatePNG(pattern: PatternState, options: ImageGeneratorOptions): Promise<Blob> {
    if (!this.canvas || !this.context) {
      throw new Error('Canvas not available - running in non-browser environment');
    }

    // Set canvas dimensions
    this.canvas.width = options.dimensions.width;
    this.canvas.height = options.dimensions.height;

    // Clear canvas and set background
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!options.transparentBackground) {
      this.context.fillStyle = options.backgroundColor;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Generate grid cells from pattern
    const gridCells = this.generateGridCells(pattern);
    
    // Calculate layout parameters
    const padding = options.includePadding ? Math.floor(options.dimensions.width * 0.1) : 0;
    const availableSize = Math.min(
      options.dimensions.width - 2 * padding,
      options.dimensions.height - 2 * padding
    );
    
    const gridSize = pattern.patternSize;
    const cellSize = Math.floor(availableSize / gridSize);
    const totalGridSize = cellSize * gridSize;
    
    // Center the grid
    const startX = padding + (options.dimensions.width - 2 * padding - totalGridSize) / 2;
    const startY = padding + (options.dimensions.height - 2 * padding - totalGridSize) / 2;

    // Set font for emoji rendering
    const fontSize = Math.floor(cellSize * 0.8); // 80% of cell size
    this.context.font = `${fontSize}px "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    // Draw pattern based on mode
    if (pattern.patternMode === 'concentric') {
      this.drawConcentricPattern(gridCells, startX, startY, cellSize, gridSize);
    } else {
      this.drawSequentialPattern(pattern.sequence, startX, startY, cellSize, gridSize);
    }

    // Draw grid lines if requested (for debugging/editing modes)
    if (options.includeMetadata) {
      this.drawGridLines(startX, startY, cellSize, gridSize);
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject(new Error('Canvas not available'));
        return;
      }

      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate PNG'));
          }
        },
        'image/png',
        options.quality / 100
      );
    });
  }

  /**
   * Generate SVG image of the pattern
   */
  async generateSVG(pattern: PatternState, options: ImageGeneratorOptions): Promise<Blob> {
    const { width, height } = options.dimensions;
    const padding = options.includePadding ? Math.floor(width * 0.1) : 0;
    const availableSize = Math.min(width - 2 * padding, height - 2 * padding);
    
    const gridSize = pattern.patternSize;
    const cellSize = Math.floor(availableSize / gridSize);
    const totalGridSize = cellSize * gridSize;
    
    // Center the grid
    const startX = padding + (width - 2 * padding - totalGridSize) / 2;
    const startY = padding + (height - 2 * padding - totalGridSize) / 2;

    // Generate grid cells
    const gridCells = this.generateGridCells(pattern);

    // Start building SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add background if not transparent
    if (!options.transparentBackground) {
      svg += `<rect width="${width}" height="${height}" fill="${options.backgroundColor}"/>`;
    }

    // Add styles
    svg += `<style>
      .emoji { 
        font-family: "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif;
        font-size: ${Math.floor(cellSize * 0.8)}px;
        text-anchor: middle;
        dominant-baseline: middle;
      }
    </style>`;

    // Add emojis
    if (pattern.patternMode === 'concentric') {
      gridCells.forEach(cell => {
        const x = startX + (cell.col * cellSize) + (cellSize / 2);
        const y = startY + (cell.row * cellSize) + (cellSize / 2);
        svg += `<text x="${x}" y="${y}" class="emoji">${cell.emoji}</text>`;
      });
    } else {
      // Sequential pattern - arrange in grid
      pattern.sequence.forEach((emoji, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const x = startX + (col * cellSize) + (cellSize / 2);
        const y = startY + (row * cellSize) + (cellSize / 2);
        svg += `<text x="${x}" y="${y}" class="emoji">${emoji}</text>`;
      });
    }

    // Add grid lines if metadata included
    if (options.includeMetadata) {
      svg += '<g stroke="#cccccc" stroke-width="1" opacity="0.3">';
      for (let i = 0; i <= gridSize; i++) {
        const pos = startX + i * cellSize;
        svg += `<line x1="${pos}" y1="${startY}" x2="${pos}" y2="${startY + totalGridSize}"/>`;
      }
      for (let i = 0; i <= gridSize; i++) {
        const pos = startY + i * cellSize;
        svg += `<line x1="${startX}" y1="${pos}" x2="${startX + totalGridSize}" y2="${pos}"/>`;
      }
      svg += '</g>';
    }

    svg += '</svg>';

    // Convert to blob
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  /**
   * Generate grid cells from pattern for concentric layouts
   */
  private generateGridCells(pattern: PatternState): GridCell[] {
    const cells: GridCell[] = [];
    const gridSize = pattern.patternSize;
    const center = Math.floor(gridSize / 2);

    if (pattern.patternMode === 'concentric') {
      // For concentric patterns, we need to map sequence to concentric rings
      let sequenceIndex = 0;
      
      // Start from center and work outward
      for (let layer = 0; layer < Math.ceil(gridSize / 2); layer++) {
        if (sequenceIndex >= pattern.sequence.length) break;
        
        if (layer === 0) {
          // Center cell
          cells.push({
            emoji: pattern.sequence[sequenceIndex] || '⭕',
            row: center,
            col: center,
            layer,
            isCenter: true,
          });
          sequenceIndex++;
        } else {
          // Ring around center
          const positions = this.getConcentricRingPositions(center, layer);
          positions.forEach(pos => {
            if (sequenceIndex < pattern.sequence.length) {
              cells.push({
                emoji: pattern.sequence[sequenceIndex] || '⭕',
                row: pos.row,
                col: pos.col,
                layer,
                isCenter: false,
              });
              sequenceIndex++;
            }
          });
        }
      }
    } else {
      // Sequential pattern - fill grid left to right, top to bottom
      pattern.sequence.forEach((emoji, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        if (row < gridSize && col < gridSize) {
          cells.push({
            emoji,
            row,
            col,
            layer: Math.max(Math.abs(row - center), Math.abs(col - center)),
            isCenter: row === center && col === center,
          });
        }
      });
    }

    return cells;
  }

  /**
   * Get positions for a concentric ring at given layer
   */
  private getConcentricRingPositions(center: number, layer: number): Array<{ row: number; col: number }> {
    const positions: Array<{ row: number; col: number }> = [];
    
    // Calculate bounds for this layer
    const minRow = center - layer;
    const maxRow = center + layer;
    const minCol = center - layer;
    const maxCol = center + layer;

    // Top edge (left to right)
    for (let col = minCol; col <= maxCol; col++) {
      positions.push({ row: minRow, col });
    }

    // Right edge (top to bottom, excluding corners)
    for (let row = minRow + 1; row <= maxRow - 1; row++) {
      positions.push({ row, col: maxCol });
    }

    // Bottom edge (right to left, excluding right corner)
    if (maxRow > minRow) {
      for (let col = maxCol; col >= minCol; col--) {
        positions.push({ row: maxRow, col });
      }
    }

    // Left edge (bottom to top, excluding corners)
    if (maxCol > minCol) {
      for (let row = maxRow - 1; row >= minRow + 1; row--) {
        positions.push({ row, col: minCol });
      }
    }

    return positions;
  }

  /**
   * Draw concentric pattern on canvas
   */
  private drawConcentricPattern(
    gridCells: GridCell[],
    startX: number,
    startY: number,
    cellSize: number,
    gridSize: number
  ): void {
    if (!this.context) return;

    gridCells.forEach(cell => {
      const x = startX + (cell.col * cellSize) + (cellSize / 2);
      const y = startY + (cell.row * cellSize) + (cellSize / 2);
      
      // Highlight center cell
      if (cell.isCenter) {
        this.context!.save();
        this.context!.globalAlpha = 0.2;
        this.context!.fillStyle = '#007bff';
        this.context!.fillRect(
          startX + cell.col * cellSize,
          startY + cell.row * cellSize,
          cellSize,
          cellSize
        );
        this.context!.restore();
      }
      
      this.context!.fillText(cell.emoji, x, y);
    });
  }

  /**
   * Draw sequential pattern on canvas
   */
  private drawSequentialPattern(
    sequence: string[],
    startX: number,
    startY: number,
    cellSize: number,
    gridSize: number
  ): void {
    if (!this.context) return;

    sequence.forEach((emoji, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      if (row < gridSize && col < gridSize) {
        const x = startX + (col * cellSize) + (cellSize / 2);
        const y = startY + (row * cellSize) + (cellSize / 2);
        this.context!.fillText(emoji, x, y);
      }
    });
  }

  /**
   * Draw grid lines for debugging/editing
   */
  private drawGridLines(
    startX: number,
    startY: number,
    cellSize: number,
    gridSize: number
  ): void {
    if (!this.context) return;

    this.context.save();
    this.context.strokeStyle = '#cccccc';
    this.context.lineWidth = 1;
    this.context.globalAlpha = 0.3;

    // Draw vertical lines
    for (let i = 0; i <= gridSize; i++) {
      const x = startX + i * cellSize;
      this.context.beginPath();
      this.context.moveTo(x, startY);
      this.context.lineTo(x, startY + gridSize * cellSize);
      this.context.stroke();
    }

    // Draw horizontal lines
    for (let i = 0; i <= gridSize; i++) {
      const y = startY + i * cellSize;
      this.context.beginPath();
      this.context.moveTo(startX, y);
      this.context.lineTo(startX + gridSize * cellSize, y);
      this.context.stroke();
    }

    this.context.restore();
  }

  /**
   * Optimize emoji rendering for high quality exports
   */
  private optimizeForQuality(quality: number): void {
    if (!this.context) return;

    // Adjust settings based on quality
    if (quality >= 90) {
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'high';
    } else if (quality >= 70) {
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'medium';
    } else {
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'low';
    }
  }

  /**
   * Calculate optimal font size for given cell size
   */
  private calculateOptimalFontSize(cellSize: number, emoji: string): number {
    // Base size is 80% of cell size
    let fontSize = Math.floor(cellSize * 0.8);
    
    // Adjust for complex emojis (those with multiple code points)
    const codePointCount = Array.from(emoji).length;
    if (codePointCount > 1) {
      fontSize = Math.floor(fontSize * 0.9); // Slightly smaller for complex emojis
    }
    
    // Ensure minimum readable size
    return Math.max(fontSize, 12);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.canvas = null;
    this.context = null;
  }
}