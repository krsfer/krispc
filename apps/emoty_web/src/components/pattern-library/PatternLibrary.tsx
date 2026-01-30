'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useUser } from '@/contexts/user-context';
import { useQuery } from '@tanstack/react-query';
import FeatureGate from '@/components/feature-gate';
import PatternCard from './PatternCard';
import PatternDetailModal from './PatternDetailModal';
import { SearchInput } from './filters/SearchInput';
import { TagFilter } from './filters/TagFilter';
import { EmptyState } from './EmptyState';
import { LoadingGrid } from './LoadingGrid';
import type { PatternWithDetails } from '@/db/types';

interface PatternLibraryProps {
  className?: string;
  initialPatterns?: PatternWithDetails[];
  onPatternLoad?: (pattern: PatternWithDetails) => void;
}

export type SortOption = 'name' | 'created_at' | 'view_count' | 'difficulty_rating';
export type ViewMode = 'grid' | 'list' | 'dense';

// API Fetcher
async function fetchPatterns(params: Record<string, string>): Promise<{ count: number, results: PatternWithDetails[] }> {
  const queryString = new URLSearchParams(params).toString();
  // Using the new Django API endpoint
  const response = await fetch(`/plexus/api/v1/patterns/?${queryString}`);

  if (!response.ok) {
    throw new Error('Failed to fetch patterns');
  }

  // Django DRF Returns { count: 10, next: "...", previous: "...", results: [...] }
  return response.json();
}

export default function PatternLibrary({
  className = '',
  onPatternLoad
}: PatternLibraryProps) {
  const { data: session } = useSession();
  const { user, actions } = useUser();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // View states
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());
  const [selectedPattern, setSelectedPattern] = useState<PatternWithDetails | null>(null);

  // TanStack Query for Data Fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['patterns', page, sortBy, searchQuery, selectedTags],
    queryFn: () => fetchPatterns({
      page: page.toString(),
      ordering: sortBy === 'created_at' ? '-created_at' : sortBy,
      search: searchQuery,
      // Pass tags if backend supports filtering by tags in 'search' or separate param
    }),
    enabled: !!session?.user?.id,
  });

  const patterns = data?.results || [];

  // Handlers
  const handlePatternLoad = (pattern: PatternWithDetails) => {
    onPatternLoad?.(pattern);
    actions.trackAction('load_pattern', { patternId: String(pattern.id) });
  };

  const togglePatternSelection = (patternId: string) => {
    setSelectedPatterns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patternId)) newSet.delete(patternId);
      else newSet.add(patternId);
      return newSet;
    });
  };

  // Keyboard Navigation (Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dense Row Renderer (Desktop)
  const renderDenseRow = (pattern: PatternWithDetails) => (
    <div
      key={String(pattern.id)}
      className={`d-flex align-items-center p-2 border-bottom hover-bg-light cursor-pointer ${selectedPatterns.has(String(pattern.id)) ? 'bg-light-primary' : ''}`}
      onClick={() => setSelectedPattern(pattern)}
      role="button"
      tabIndex={0}
    >
      <div className="form-check me-3" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          className="form-check-input"
          checked={selectedPatterns.has(String(pattern.id))}
          onChange={() => togglePatternSelection(String(pattern.id))}
        />
      </div>
      <div className="flex-grow-1 fw-medium text-truncate" style={{ maxWidth: '300px' }}>
        {pattern.name}
      </div>
      <div className="text-muted small me-3" style={{ width: '100px' }}>
        {new Date(pattern.created_at as unknown as string).toLocaleDateString()}
      </div>
      <div className="d-none d-md-block badge bg-secondary me-3">
        {pattern.difficulty_rating || '-'}/5
      </div>
      <div className="d-flex gap-2 ms-auto opacity-75">
        <button className="btn btn-sm btn-icon border-0" onClick={(e) => { e.stopPropagation(); setSelectedPattern(pattern); }}>
          <i className="bi bi-eye" />
        </button>
      </div>
    </div>
  );

  return (
    <div className={`pattern-library ${className}`}>
      {/* Responsive Header */}
      <div className="pattern-library-header mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
        <h2 className="h4 mb-0 d-flex align-items-center text-primary">
          <i className="bi bi-grid-3x3-gap me-2"></i>
          Pattern Library
        </h2>

        <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0 align-items-center">
          <div className="flex-grow-1" style={{ minWidth: '200px' }}>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search patterns..." />
          </div>

          <div className="btn-group shadow-sm">
            <button
              className={`btn btn-outline-secondary btn-sm ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
            >
              <i className="bi bi-grid-3x3-gap" />
            </button>
            <button
              className={`btn btn-outline-secondary btn-sm ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List View"
            >
              <i className="bi bi-list" />
            </button>
            <button
              className={`btn btn-outline-secondary btn-sm ${viewMode === 'dense' ? 'active' : ''}`}
              onClick={() => setViewMode('dense')}
              title="Dense View (Desktop)"
              aria-label="Dense Table View"
            >
              <i className="bi bi-table" />
            </button>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Sidebar Filters - Hidden on small mobile unless toggled (simplified for this task) */}
        <div className="col-12 col-lg-3 mb-4 d-none d-lg-block">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3 text-muted text-uppercase small fw-bold">Filters</h5>

              <div className="mb-4">
                <label className="form-label small fw-bold">Sort By</label>
                <select
                  className="form-select form-select-sm"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                >
                  <option value="created_at">Newest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="difficulty_rating">Difficulty</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">Tags</label>
                <TagFilter selectedTags={selectedTags} availableTags={[]} onChange={setSelectedTags} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-12 col-lg-9">
          {error && (
            <div className="alert alert-danger shadow-sm border-0">
              <i className="bi bi-exclamation-circle me-2"></i>
              Failed to load patterns from server.
            </div>
          )}

          {isLoading ? (
            <LoadingGrid count={8} viewMode={viewMode === 'dense' ? 'list' : viewMode} />
          ) : patterns.length === 0 ? (
            <EmptyState hasFilters={!!searchQuery} onClearFilters={() => setSearchQuery('')} />
          ) : (
            <>
              {viewMode === 'dense' ? (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-bottom fw-bold d-flex text-muted small text-uppercase">
                    <span className="ms-5 flex-grow-1">Name</span>
                    <span className="me-3" style={{ width: '100px' }}>Date</span>
                    <span className="me-3 d-none d-md-block">Rating</span>
                    <span style={{ width: 40 }}></span>
                  </div>
                  <div className="list-group list-group-flush">
                    {patterns.map(renderDenseRow)}
                  </div>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'row g-3' : 'list-group'}>
                  {patterns.map(pattern => (
                    <div key={String(pattern.id)} className={viewMode === 'grid' ? 'col-12 col-sm-6 col-md-4' : ''}>
                      <PatternCard
                        pattern={pattern}
                        viewMode={viewMode}
                        isSelected={selectedPatterns.has(String(pattern.id))}
                        onSelect={() => togglePatternSelection(String(pattern.id))}
                        onLoad={() => handlePatternLoad(pattern)}
                        onView={() => setSelectedPattern(pattern)}
                        onDelete={() => { }} // Placeholder
                        showSelection={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet (Offcanvas) */}
      {selectedPattern && (
        <div className="offcanvas offcanvas-bottom show h-75 d-lg-none rounded-top-4 shadow-lg" tabIndex={-1} style={{ display: 'block', visibility: 'visible' }}>
          <div className="offcanvas-header border-bottom">
            <h5 className="offcanvas-title text-truncate">{selectedPattern.name}</h5>
            <button type="button" className="btn-close" onClick={() => setSelectedPattern(null)}></button>
          </div>
          <div className="offcanvas-body p-0">
            <PatternDetailModal
              pattern={selectedPattern}
              onClose={() => setSelectedPattern(null)}
              // Provide minimal required props
              onLoad={() => handlePatternLoad(selectedPattern)}
              onDelete={() => { }}
              onUpdate={() => { }}
            />
          </div>
        </div>
      )}

      {/* Desktop Modal Backdrop & Modal */}
      {selectedPattern && (
        <>
          <div className="modal-backdrop fade show d-none d-lg-block"></div>
          <div className="d-none d-lg-block">
            <PatternDetailModal
              pattern={selectedPattern}
              onClose={() => setSelectedPattern(null)}
              onLoad={() => handlePatternLoad(selectedPattern)}
              onDelete={() => { }}
              onUpdate={() => { }}
            />
          </div>
        </>
      )}
    </div>
  );
}