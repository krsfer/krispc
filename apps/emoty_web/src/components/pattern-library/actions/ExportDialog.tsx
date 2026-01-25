'use client';

import React, { useState } from 'react';
import { useUser, useFeatureAccess } from '@/contexts/user-context';
import type {
  ExportFormat,
  ExportOptions as NewExportOptions,
  BatchExportOptions,
  ExportSize,
  EXPORT_SIZE_PRESETS
} from '@/types/export';

interface ExportDialogProps {
  patternIds: string[];
  onClose: () => void;
  onExport?: (format: ExportFormat, options: NewExportOptions) => Promise<void>;
  onBatchExport?: (options: BatchExportOptions) => Promise<void>;
}

interface ExportProgress {
  isExporting: boolean;
  progress: number;
  current: string;
  errors: string[];
}

export function ExportDialog({
  patternIds,
  onClose,
  onExport,
  onBatchExport
}: ExportDialogProps) {
  const { user, actions } = useUser();
  const { hasAccess: hasAdvancedExport } = useFeatureAccess('advanced_export');
  const { hasAccess: hasBatchOperations } = useFeatureAccess('batch_operations');
  const { hasAccess: hasMultipleFormats } = useFeatureAccess('export_multiple_formats');
  
  // State for export options
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(['png']);
  const [isBatchMode, setIsBatchMode] = useState(patternIds.length > 1 && hasBatchOperations);
  const [options, setOptions] = useState<NewExportOptions>({
    format: 'png',
    quality: 90,
    size: 'medium',
    backgroundColor: '#ffffff',
    includeMetadata: true,
    includePadding: true,
    transparentBackground: false,
  });
  
  // State for batch options
  const [batchOptions, setBatchOptions] = useState<BatchExportOptions>({
    formats: ['png'],
    quality: 90,
    size: 'medium',
    backgroundColor: '#ffffff',
    includeMetadata: true,
    includePadding: true,
    transparentBackground: false,
    createZip: true,
    zipName: `emoty_patterns_${new Date().toISOString().slice(0, 10)}.zip`,
    includeManifest: true,
  });
  
  // Progress tracking
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
    current: '',
    errors: [],
  });

  // Available formats based on user level
  const availableFormats: { format: ExportFormat; label: string; icon: string; requiresLevel?: string }[] = [
    { format: 'text' as ExportFormat, label: 'Text', icon: 'bi-file-text' },
    { format: 'png' as ExportFormat, label: 'PNG Image', icon: 'bi-file-image' },
    { format: 'json' as ExportFormat, label: 'JSON Data', icon: 'bi-file-code' },
    { format: 'svg' as ExportFormat, label: 'SVG Vector', icon: 'bi-file-code', requiresLevel: 'intermediate' },
    { format: 'pdf' as ExportFormat, label: 'PDF Document', icon: 'bi-file-pdf', requiresLevel: 'advanced' },
  ].filter(formatOption => {
    if (!formatOption.requiresLevel) return true;
    return actions.checkFeatureAccess(getFeatureForFormat(formatOption.format));
  });
  
  // Get feature requirement for format
  const getFeatureForFormat = (format: ExportFormat): string => {
    const features: Record<ExportFormat, string> = {
      text: 'basic_export',
      png: 'basic_export',
      json: 'basic_export',
      svg: 'export_multiple_formats',
      pdf: 'advanced_export',
    };
    return features[format] || 'basic_export';
  };

  const handleExport = async () => {
    setExportProgress(prev => ({ ...prev, isExporting: true, errors: [] }));
    
    try {
      if (isBatchMode && onBatchExport) {
        // Batch export
        const finalBatchOptions: BatchExportOptions = {
          ...batchOptions,
          formats: selectedFormats,
        };
        
        await onBatchExport(finalBatchOptions);
      } else if (onExport) {
        // Single format export
        const finalOptions: NewExportOptions = {
          ...options,
          format: selectedFormats[0] || 'png',
        };
        
        // Export each pattern individually if not using new batch system
        for (let i = 0; i < patternIds.length; i++) {
          setExportProgress(prev => ({
            ...prev,
            progress: (i / patternIds.length) * 100,
            current: `Pattern ${i + 1} of ${patternIds.length}`,
          }));
          
          await onExport(finalOptions.format, finalOptions);
        }
      } else {
        // Use API directly if no callback provided
        await handleDirectExport();
      }
      
      // Track export action
      await actions.trackAction('export_pattern', {
        format: isBatchMode ? selectedFormats : [selectedFormats[0]],
        patternCount: patternIds.length,
        isBatch: isBatchMode,
      });
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress(prev => ({
        ...prev,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Export failed'],
      }));
    } finally {
      setExportProgress(prev => ({ ...prev, isExporting: false, progress: 0 }));
    }
  };
  
  // Direct API export when no callbacks provided
  const handleDirectExport = async () => {
    if (isBatchMode) {
      const response = await fetch('/api/export/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patternIds,
          options: { ...batchOptions, formats: selectedFormats },
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = batchOptions.zipName || 'export.zip';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Batch export failed');
      }
    } else {
      // Single pattern export
      for (const patternId of patternIds) {
        const response = await fetch('/api/export/pattern', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patternId,
            options: { ...options, format: selectedFormats[0] },
          }),
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const filename = response.headers.get('content-disposition')
            ?.match(/filename="(.+)"/)?.[1] || 'export';
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          throw new Error(`Export failed for pattern ${patternId}`);
        }
      }
    }
  };
  
  // Handle format selection
  const handleFormatToggle = (format: ExportFormat) => {
    if (isBatchMode && hasMultipleFormats) {
      setSelectedFormats(prev => 
        prev.includes(format)
          ? prev.filter(f => f !== format)
          : [...prev, format]
      );
      setBatchOptions(prev => ({ ...prev, formats: selectedFormats }));
    } else {
      setSelectedFormats([format]);
      setOptions(prev => ({ ...prev, format }));
    }
  };

  const getExportPreview = () => {
    const count = patternIds.length;
    if (isBatchMode) {
      const formatCount = selectedFormats.length;
      return `${count} pattern${count > 1 ? 's' : ''} × ${formatCount} format${formatCount > 1 ? 's' : ''} = ${count * formatCount} files`;
    } else {
      const format = selectedFormats[0] || 'png';
      const fileSize = format === 'png' ? 'Large' : format === 'svg' ? 'Medium' : format === 'pdf' ? 'Large' : 'Small';
      return `${count} pattern${count > 1 ? 's' : ''} • ${fileSize} file size`;
    }
  };

  return (
    <>
      {/* Modal backdrop */}
      <div 
        className="modal-backdrop fade show" 
        onClick={onClose}
        style={{ zIndex: 1040 }}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1}
        role="dialog"
        aria-labelledby="exportDialogTitle"
        aria-modal="true"
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exportDialogTitle">
                <i className="bi bi-download me-2"></i>
                Export Patterns
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              {/* Batch mode toggle */}
              {patternIds.length > 1 && hasBatchOperations && (
                <div className="mb-3">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="batchModeSwitch"
                      checked={isBatchMode}
                      onChange={(e) => setIsBatchMode(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="batchModeSwitch">
                      <strong>Batch Export Mode</strong>
                      <div className="small text-muted">
                        Export multiple formats and create ZIP archive
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Format selection */}
              <div className="mb-3">
                <label className="form-label">
                  Export Format{isBatchMode && hasMultipleFormats ? 's' : ''}
                  {isBatchMode && hasMultipleFormats && (
                    <small className="text-muted ms-2">(Select multiple)</small>
                  )}
                </label>
                
                {isBatchMode && hasMultipleFormats ? (
                  // Multiple format selection for batch mode
                  <div className="row">
                    {availableFormats.map(formatOption => (
                      <div key={formatOption.format} className="col-6 col-md-4 mb-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`format-${formatOption.format}`}
                            checked={selectedFormats.includes(formatOption.format)}
                            onChange={() => handleFormatToggle(formatOption.format)}
                          />
                          <label className="form-check-label" htmlFor={`format-${formatOption.format}`}>
                            <i className={`${formatOption.icon} me-2`}></i>
                            {formatOption.label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single format selection
                  <div className="btn-group w-100" role="group">
                    {availableFormats.slice(0, 3).map(formatOption => (
                      <React.Fragment key={formatOption.format}>
                        <input
                          type="radio"
                          className="btn-check"
                          name="format"
                          id={`format-${formatOption.format}`}
                          checked={selectedFormats[0] === formatOption.format}
                          onChange={() => handleFormatToggle(formatOption.format)}
                        />
                        <label 
                          className="btn btn-outline-primary" 
                          htmlFor={`format-${formatOption.format}`}
                        >
                          <i className={`${formatOption.icon} me-2`}></i>
                          {formatOption.label}
                        </label>
                      </React.Fragment>
                    ))}
                  </div>
                )}
                
                {/* Additional formats for single mode */}
                {!isBatchMode && availableFormats.length > 3 && (
                  <div className="mt-2">
                    <div className="btn-group w-100" role="group">
                      {availableFormats.slice(3).map(formatOption => (
                        <React.Fragment key={formatOption.format}>
                          <input
                            type="radio"
                            className="btn-check"
                            name="format"
                            id={`format-${formatOption.format}`}
                            checked={selectedFormats[0] === formatOption.format}
                            onChange={() => handleFormatToggle(formatOption.format)}
                          />
                          <label 
                            className="btn btn-outline-primary" 
                            htmlFor={`format-${formatOption.format}`}
                          >
                            <i className={`${formatOption.icon} me-2`}></i>
                            {formatOption.label}
                          </label>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Format requirements info */}
              {selectedFormats.some(format => format === 'svg' || format === 'pdf') && (
                <div className="alert alert-info small">
                  <i className="bi bi-info-circle me-2"></i>
                  {selectedFormats.includes('svg') && 'SVG export requires intermediate level. '}
                  {selectedFormats.includes('pdf') && 'PDF export requires advanced level.'}
                </div>
              )}

              {/* Size selection (for image formats) */}
              {(selectedFormats.includes('png') || selectedFormats.includes('svg')) && (
                <div className="mb-3">
                  <label className="form-label">Size</label>
                  <select
                    className="form-select"
                    value={isBatchMode ? batchOptions.size : options.size}
                    onChange={(e) => {
                      const newSize = e.target.value as ExportSize;
                      if (isBatchMode) {
                        setBatchOptions(prev => ({ ...prev, size: newSize }));
                      } else {
                        setOptions(prev => ({ ...prev, size: newSize }));
                      }
                    }}
                  >
                    <option value="small">Small (256×256)</option>
                    <option value="medium">Medium (512×512)</option>
                    <option value="large">Large (1024×1024)</option>
                    <option value="xlarge">X-Large (2048×2048)</option>
                    <option value="custom">Custom Size</option>
                  </select>
                </div>
              )}

              {/* Custom size inputs */}
              {((isBatchMode ? batchOptions.size : options.size) === 'custom') && 
               (selectedFormats.includes('png') || selectedFormats.includes('svg')) && (
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label">Width (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={
                        isBatchMode 
                          ? batchOptions.dimensions?.width || 512
                          : options.dimensions?.width || 512
                      }
                      onChange={(e) => {
                        const width = parseInt(e.target.value);
                        if (isBatchMode) {
                          setBatchOptions(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, width, height: prev.dimensions?.height || width }
                          }));
                        } else {
                          setOptions(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, width, height: prev.dimensions?.height || width }
                          }));
                        }
                      }}
                      min="100"
                      max="4096"
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Height (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={
                        isBatchMode 
                          ? batchOptions.dimensions?.height || 512
                          : options.dimensions?.height || 512
                      }
                      onChange={(e) => {
                        const height = parseInt(e.target.value);
                        if (isBatchMode) {
                          setBatchOptions(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, width: prev.dimensions?.width || height, height }
                          }));
                        } else {
                          setOptions(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, width: prev.dimensions?.width || height, height }
                          }));
                        }
                      }}
                      min="100"
                      max="4096"
                    />
                  </div>
                </div>
              )}

              {/* Quality setting */}
              {(selectedFormats.includes('png') || selectedFormats.includes('pdf')) && (
                <div className="mb-3">
                  <label className="form-label">
                    Quality: {isBatchMode ? batchOptions.quality : options.quality}%
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    min="50"
                    max="100"
                    value={isBatchMode ? batchOptions.quality : options.quality}
                    onChange={(e) => {
                      const quality = parseInt(e.target.value);
                      if (isBatchMode) {
                        setBatchOptions(prev => ({ ...prev, quality }));
                      } else {
                        setOptions(prev => ({ ...prev, quality }));
                      }
                    }}
                  />
                </div>
              )}

              {/* Background options */}
              {(selectedFormats.includes('png') || selectedFormats.includes('svg')) && (
                <div className="mb-3">
                  <label className="form-label">Background</label>
                  
                  {/* Transparent background option */}
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="transparentBackground"
                      checked={isBatchMode ? batchOptions.transparentBackground : options.transparentBackground}
                      onChange={(e) => {
                        if (isBatchMode) {
                          setBatchOptions(prev => ({ 
                            ...prev, 
                            transparentBackground: e.target.checked 
                          }));
                        } else {
                          setOptions(prev => ({ 
                            ...prev, 
                            transparentBackground: e.target.checked 
                          }));
                        }
                      }}
                    />
                    <label className="form-check-label" htmlFor="transparentBackground">
                      Transparent background
                    </label>
                  </div>
                  
                  {/* Background color picker */}
                  {!(isBatchMode ? batchOptions.transparentBackground : options.transparentBackground) && (
                    <div className="input-group">
                      <input
                        type="color"
                        className="form-control form-control-color"
                        value={isBatchMode ? batchOptions.backgroundColor : options.backgroundColor}
                        onChange={(e) => {
                          if (isBatchMode) {
                            setBatchOptions(prev => ({ 
                              ...prev, 
                              backgroundColor: e.target.value 
                            }));
                          } else {
                            setOptions(prev => ({ 
                              ...prev, 
                              backgroundColor: e.target.value 
                            }));
                          }
                        }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        value={isBatchMode ? batchOptions.backgroundColor : options.backgroundColor}
                        onChange={(e) => {
                          if (isBatchMode) {
                            setBatchOptions(prev => ({ 
                              ...prev, 
                              backgroundColor: e.target.value 
                            }));
                          } else {
                            setOptions(prev => ({ 
                              ...prev, 
                              backgroundColor: e.target.value 
                            }));
                          }
                        }}
                        placeholder="#ffffff"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Text format options */}
              {selectedFormats.includes('text') && (
                <div className="mb-3">
                  <label className="form-label">Text Format</label>
                  <select
                    className="form-select"
                    value={(isBatchMode ? batchOptions : options).textFormat || 'plain'}
                    onChange={(e) => {
                      const textFormat = e.target.value as 'plain' | 'markdown' | 'csv';
                      if (isBatchMode) {
                        setBatchOptions(prev => ({ ...prev, textFormat }));
                      } else {
                        setOptions(prev => ({ ...prev, textFormat }));
                      }
                    }}
                  >
                    <option value="plain">Plain Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="csv">CSV (with Unicode)</option>
                  </select>
                </div>
              )}

              {/* PDF options */}
              {selectedFormats.includes('pdf') && (
                <div className="mb-3">
                  <div className="row">
                    <div className="col-6">
                      <label className="form-label">Page Size</label>
                      <select
                        className="form-select"
                        value={(isBatchMode ? batchOptions : options).pageSize || 'A4'}
                        onChange={(e) => {
                          const pageSize = e.target.value as 'A4' | 'A3' | 'Letter' | 'Legal';
                          if (isBatchMode) {
                            setBatchOptions(prev => ({ ...prev, pageSize }));
                          } else {
                            setOptions(prev => ({ ...prev, pageSize }));
                          }
                        }}
                      >
                        <option value="A4">A4</option>
                        <option value="A3">A3</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Orientation</label>
                      <select
                        className="form-select"
                        value={(isBatchMode ? batchOptions : options).orientation || 'portrait'}
                        onChange={(e) => {
                          const orientation = e.target.value as 'portrait' | 'landscape';
                          if (isBatchMode) {
                            setBatchOptions(prev => ({ ...prev, orientation }));
                          } else {
                            setOptions(prev => ({ ...prev, orientation }));
                          }
                        }}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ZIP options for batch mode */}
              {isBatchMode && (
                <div className="mb-3">
                  <label className="form-label">ZIP Archive Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={batchOptions.zipName}
                    onChange={(e) => setBatchOptions(prev => ({ 
                      ...prev, 
                      zipName: e.target.value 
                    }))}
                    placeholder="emoty_patterns_export.zip"
                  />
                </div>
              )}

              {/* Common options */}
              <div className="mb-3">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeMetadata"
                    checked={isBatchMode ? batchOptions.includeMetadata : options.includeMetadata}
                    onChange={(e) => {
                      if (isBatchMode) {
                        setBatchOptions(prev => ({ 
                          ...prev, 
                          includeMetadata: e.target.checked 
                        }));
                      } else {
                        setOptions(prev => ({ 
                          ...prev, 
                          includeMetadata: e.target.checked 
                        }));
                      }
                    }}
                  />
                  <label className="form-check-label" htmlFor="includeMetadata">
                    Include pattern metadata
                  </label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includePadding"
                    checked={isBatchMode ? batchOptions.includePadding : options.includePadding}
                    onChange={(e) => {
                      if (isBatchMode) {
                        setBatchOptions(prev => ({ 
                          ...prev, 
                          includePadding: e.target.checked 
                        }));
                      } else {
                        setOptions(prev => ({ 
                          ...prev, 
                          includePadding: e.target.checked 
                        }));
                      }
                    }}
                  />
                  <label className="form-check-label" htmlFor="includePadding">
                    Include padding around pattern
                  </label>
                </div>

                {isBatchMode && (
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="includeManifest"
                      checked={batchOptions.includeManifest}
                      onChange={(e) => setBatchOptions(prev => ({ 
                        ...prev, 
                        includeManifest: e.target.checked 
                      }))}
                    />
                    <label className="form-check-label" htmlFor="includeManifest">
                      Include export manifest
                    </label>
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {exportProgress.isExporting && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted">{exportProgress.current}</span>
                    <span className="small text-muted">{Math.round(exportProgress.progress)}%</span>
                  </div>
                  <div className="progress">
                    <div 
                      className="progress-bar" 
                      role="progressbar"
                      style={{ width: `${exportProgress.progress}%` }}
                      aria-valuenow={exportProgress.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error display */}
              {exportProgress.errors.length > 0 && (
                <div className="alert alert-danger">
                  <div className="d-flex align-items-start">
                    <i className="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
                    <div className="flex-grow-1">
                      <strong>Export Errors:</strong>
                      <ul className="mb-0 mt-1">
                        {exportProgress.errors.map((error, index) => (
                          <li key={index} className="small">{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation errors */}
              {selectedFormats.length === 0 && (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Please select at least one export format.
                </div>
              )}

              {/* Export preview */}
              <div className="alert alert-info">
                <div className="d-flex align-items-center">
                  <i className="bi bi-info-circle me-2"></i>
                  <div>
                    <strong>Export Preview:</strong><br />
                    <small className="text-muted">{getExportPreview()}</small>
                    {isBatchMode && batchOptions.createZip && (
                      <><br /><small className="text-muted">Files will be packaged in a ZIP archive</small></>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={exportProgress.isExporting}
              >
                {exportProgress.isExporting ? 'Exporting...' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExport}
                disabled={exportProgress.isExporting || selectedFormats.length === 0}
              >
                {exportProgress.isExporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Exporting...</span>
                    </span>
                    Exporting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-download me-2"></i>
                    {isBatchMode 
                      ? `Batch Export (${selectedFormats.length} formats)`
                      : `Export ${patternIds.length} Pattern${patternIds.length > 1 ? 's' : ''}`
                    }
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}