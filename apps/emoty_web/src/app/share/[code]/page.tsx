'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PatternCanvas from '@/components/PatternCanvas';
import type { PatternState } from '@/types/pattern';

export default function SharedPatternPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [pattern, setPattern] = useState<PatternState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    const loadSharedPattern = async () => {
      if (!code || typeof code !== 'string') {
        setError('Invalid share code');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/share/${code}`);
        
        if (response.ok) {
          const data = await response.json();
          setPattern(data.pattern);
        } else if (response.status === 404) {
          setError('Share code not found or expired');
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load shared pattern');
        }
      } catch (err) {
        console.error('Error loading shared pattern:', err);
        setError('Failed to load shared pattern');
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedPattern();
  }, [code]);

  const handleCopyPattern = async () => {
    if (!pattern) return;

    setIsCopying(true);
    try {
      // Create a copy of the pattern without the original ID
      const patternCopy = {
        ...pattern,
        id: undefined,
        name: `${pattern.name} (Copy)`,
        createdAt: undefined,
        updatedAt: undefined,
        isFavorite: false,
      };

      // Here you would typically save to user's patterns
      // For now, we'll just copy to localStorage as a demo
      const savedPatterns = JSON.parse(localStorage.getItem('userPatterns') || '[]');
      const newPattern = {
        ...patternCopy,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      
      savedPatterns.push(newPattern);
      localStorage.setItem('userPatterns', JSON.stringify(savedPatterns));

      // Show success message
      alert('Pattern copied to your collection!');
      
      // Optionally redirect to user's patterns
      // router.push('/patterns');
    } catch (err) {
      console.error('Error copying pattern:', err);
      alert('Failed to copy pattern');
    } finally {
      setIsCopying(false);
    }
  };

  const handleShareCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      
      // Show temporary feedback
      const button = document.getElementById('share-code-btn');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          if (button) button.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy share code:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-8 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading shared pattern...</span>
            </div>
            <p className="mt-3 text-muted">Loading shared pattern...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-danger text-center">
              <i className="bi bi-exclamation-triangle display-4 mb-3"></i>
              <h4>Pattern Not Found</h4>
              <p className="mb-3">{error}</p>
              <div>
                <button 
                  className="btn btn-primary me-2"
                  onClick={() => router.push('/')}
                >
                  <i className="bi bi-house me-2"></i>
                  Go Home
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => router.back()}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pattern) {
    return null;
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">
                <i className="bi bi-share me-2 text-primary"></i>
                {pattern.name}
              </h1>
              <p className="text-muted mb-0">
                Shared Pattern • Code: <code>{code}</code>
              </p>
            </div>
            
            <div>
              <button
                id="share-code-btn"
                className="btn btn-outline-secondary me-2"
                onClick={handleShareCode}
              >
                <i className="bi bi-clipboard me-2"></i>
                Copy Code
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCopyPattern}
                disabled={isCopying}
              >
                {isCopying ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Copying...</span>
                    </span>
                    Copying...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i>
                    Copy to My Patterns
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pattern Display */}
          <div className="row">
            <div className="col-lg-8">
              <div className="card">
                <div className="card-body">
                  <PatternCanvas 
                    pattern={pattern}
                    size={400}
                    showGrid={false}
                    isInteractive={false}
                  />
                </div>
              </div>
            </div>

            <div className="col-lg-4 mt-4 mt-lg-0">
              {/* Pattern Info */}
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Pattern Details
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong>Size:</strong>
                    <span className="ms-2">{pattern.patternSize}×{pattern.patternSize}</span>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Mode:</strong>
                    <span className="ms-2 text-capitalize">{pattern.patternMode}</span>
                  </div>

                  <div className="mb-3">
                    <strong>Emojis:</strong>
                    <span className="ms-2">{pattern.sequence.length}</span>
                  </div>

                  {pattern.description && (
                    <div className="mb-3">
                      <strong>Description:</strong>
                      <p className="mt-1 mb-0 text-muted">{pattern.description}</p>
                    </div>
                  )}

                  {pattern.tags && pattern.tags.length > 0 && (
                    <div className="mb-3">
                      <strong>Tags:</strong>
                      <div className="mt-1">
                        {pattern.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="badge bg-secondary me-1 mb-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {pattern.metadata && (
                    <>
                      <div className="mb-3">
                        <strong>Complexity:</strong>
                        <span className="ms-2 text-capitalize">
                          {pattern.metadata.complexity}
                        </span>
                      </div>

                      {pattern.metadata.aiGenerated && (
                        <div className="mb-3">
                          <span className="badge bg-info">
                            <i className="bi bi-robot me-1"></i>
                            AI Generated
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Sequence Display */}
              <div className="card mt-3">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-list-ol me-2"></i>
                    Emoji Sequence
                  </h5>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-wrap gap-1">
                    {pattern.sequence.map((emoji, index) => (
                      <span
                        key={index}
                        className="d-inline-flex align-items-center justify-content-center"
                        style={{ 
                          width: '32px', 
                          height: '32px',
                          fontSize: '20px',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          backgroundColor: '#f8f9fa'
                        }}
                        title={`Position ${index + 1}: ${emoji}`}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}