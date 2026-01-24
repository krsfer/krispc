'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useUser } from '@/contexts/user-context';
import { FeatureGate } from '@/components/feature-gate';
import PatternCard from './PatternCard';
import PatternDetailModal from './PatternDetailModal';
import { SearchInput } from './filters/SearchInput';
import { TagFilter } from './filters/TagFilter';
import { DateRangePicker } from './filters/DateRangePicker';
import { FavoriteToggle } from './filters/FavoriteToggle';
import { AIGeneratedToggle } from './filters/AIGeneratedToggle';
import { ComplexitySlider } from './filters/ComplexitySlider';
import { BatchActions } from './actions/BatchActions';
import { EmptyState } from './EmptyState';
import { LoadingGrid } from './LoadingGrid';
import type { PatternWithDetails } from '@/db/types';

interface PatternLibraryProps {
  className?: string;
  initialPatterns?: PatternWithDetails[];
  onPatternLoad?: (pattern: PatternWithDetails) => void;
}

export type SortOption = 'name' | 'date' | 'popularity' | 'complexity';
export type ViewMode = 'grid' | 'list';

export default function PatternLibrary({ 
  className = '', 
  initialPatterns = [],
  onPatternLoad
}: PatternLibraryProps) {
  const { data: session } = useSession();
  const { user, actions } = useUser();
  
  // State management
  const [patterns, setPatterns] = useState<PatternWithDetails[]>(initialPatterns);
  const [filteredPatterns, setFilteredPatterns] = useState<PatternWithDetails[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());
  const [selectedPattern, setSelectedPattern] = useState<PatternWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(!initialPatterns.length);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ 
    start: null, 
    end: null 
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAIGeneratedOnly, setShowAIGeneratedOnly] = useState(false);
  const [complexityFilter, setComplexityFilter] = useState<number[]>([1, 4]);
  
  // View and sort options
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const PATTERNS_PER_PAGE = 12;

  // Fetch patterns from API
  const fetchPatterns = useCallback(async (pageNum: number = 1) => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: PATTERNS_PER_PAGE.toString(),
        sort: sortBy,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedTags.length && { tags: selectedTags.join(',') }),
        ...(showFavoritesOnly && { favorites: 'true' }),
        ...(showAIGeneratedOnly && { aiGenerated: 'true' }),
        ...(dateRange.start && { startDate: dateRange.start.toISOString() }),
        ...(dateRange.end && { endDate: dateRange.end.toISOString() }),
      });

      const response = await fetch(`/api/patterns?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patterns');
      }

      const data = await response.json();
      
      if (pageNum === 1) {
        setPatterns(data.patterns);
      } else {
        setPatterns(prev => [...prev, ...data.patterns]);
      }
      
      setHasMore(data.hasMore);
      setPage(pageNum);
      
      // Track pattern browse action
      await actions.trackAction('browse_patterns', { 
        filters: { 
          search: searchQuery, 
          tags: selectedTags,
          favorites: showFavoritesOnly,
          aiGenerated: showAIGeneratedOnly 
        } 
      });
    } catch (err) {
      console.error('Error fetching patterns:', err);
      setError('Failed to load patterns. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [session, sortBy, searchQuery, selectedTags, showFavoritesOnly, showAIGeneratedOnly, dateRange, actions]);

  // Filter patterns based on current filters
  useEffect(() => {
    let filtered = [...patterns];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p =>
        selectedTags.every(tag => p.tags?.includes(tag))
      );
    }

    // Apply complexity filter
    filtered = filtered.filter(p => {
      const complexity = p.difficulty_rating || 2;
      return complexity >= complexityFilter[0] && complexity <= complexityFilter[1];
    });

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(p => p.is_favorited);
    }

    // Apply AI generated filter
    if (showAIGeneratedOnly) {
      filtered = filtered.filter(p => p.is_ai_generated);
    }

    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(p => {
        const createdAt = new Date(p.created_at);
        if (dateRange.start && createdAt < dateRange.start) return false;
        if (dateRange.end && createdAt > dateRange.end) return false;
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popularity':
          return (b.view_count + b.like_count) - (a.view_count + a.like_count);
        case 'complexity':
          return (b.difficulty_rating || 2) - (a.difficulty_rating || 2);
        default:
          return 0;
      }
    });

    setFilteredPatterns(filtered);
  }, [patterns, searchQuery, selectedTags, complexityFilter, showFavoritesOnly, showAIGeneratedOnly, dateRange, sortBy]);

  // Initial load
  useEffect(() => {
    if (!initialPatterns.length && session?.user?.id) {
      fetchPatterns(1);
    }
  }, [session, initialPatterns.length]);

  // Handle pattern selection for batch operations
  const togglePatternSelection = useCallback((patternId: string) => {
    setSelectedPatterns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patternId)) {
        newSet.delete(patternId);
      } else {
        newSet.add(patternId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const selectAll = useCallback(() => {
    setSelectedPatterns(new Set(filteredPatterns.map(p => p.id)));
  }, [filteredPatterns]);

  // Handle clear selection
  const clearSelection = useCallback(() => {
    setSelectedPatterns(new Set());
  }, []);

  // Handle load more
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchPatterns(page + 1);
    }
  }, [isLoading, hasMore, page, fetchPatterns]);

  // Handle pattern actions
  const handlePatternLoad = useCallback((pattern: PatternWithDetails) => {
    onPatternLoad?.(pattern);
    actions.trackAction('load_pattern', { patternId: pattern.id });
  }, [onPatternLoad, actions]);

  const handlePatternDelete = useCallback(async (patternId: string) => {
    setPatterns(prev => prev.filter(p => p.id !== patternId));
    setFilteredPatterns(prev => prev.filter(p => p.id !== patternId));
    setSelectedPatterns(prev => {
      const newSet = new Set(prev);
      newSet.delete(patternId);
      return newSet;
    });
  }, []);

  const handleBatchDelete = useCallback(async (patternIds: string[]) => {
    setPatterns(prev => prev.filter(p => !patternIds.includes(p.id)));
    setFilteredPatterns(prev => prev.filter(p => !patternIds.includes(p.id)));
    clearSelection();
  }, [clearSelection]);

  // Get all unique tags from patterns
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    patterns.forEach(p => {
      p.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [patterns]);

  return (
    <div className={`pattern-library ${className}`}>
      {/* Header with search and view options */}
      <div className="pattern-library-header mb-4">
        <div className="row align-items-center">
          <div className="col-12 col-md-6 mb-3 mb-md-0">
            <h2 className="h4 mb-0">
              <i className="bi bi-grid-3x3-gap me-2"></i>
              Pattern Library
            </h2>
          </div>
          <div className="col-12 col-md-6">
            <div className="d-flex gap-2 justify-content-md-end">
              <FeatureGate feature="pattern_search">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search patterns..."
                  className="flex-grow-1"
                />
              </FeatureGate>
              
              <div className="btn-group" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`btn btn-outline-secondary ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <i className="bi bi-grid-3x3-gap"></i>
                </button>
                <button
                  type="button"
                  className={`btn btn-outline-secondary ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <i className="bi bi-list"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Filters sidebar */}
        <FeatureGate feature="advanced_search">
          <div className="col-12 col-lg-3 mb-4">
            <div className="pattern-filters card">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <i className="bi bi-funnel me-2"></i>
                  Filters
                </h5>
                
                <div className="filter-section mb-3">
                  <label className="form-label">Sort By</label>
                  <select 
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                  >
                    <option value="date">Date Created</option>
                    <option value="name">Name</option>
                    <option value="popularity">Popularity</option>
                    <option value="complexity">Complexity</option>
                  </select>
                </div>

                <div className="filter-section mb-3">
                  <FavoriteToggle
                    checked={showFavoritesOnly}
                    onChange={setShowFavoritesOnly}
                  />
                </div>

                <FeatureGate feature="ai_pattern_generation">
                  <div className="filter-section mb-3">
                    <AIGeneratedToggle
                      checked={showAIGeneratedOnly}
                      onChange={setShowAIGeneratedOnly}
                    />
                  </div>
                </FeatureGate>

                <div className="filter-section mb-3">
                  <TagFilter
                    selectedTags={selectedTags}
                    availableTags={availableTags}
                    onChange={setSelectedTags}
                  />
                </div>

                <div className="filter-section mb-3">
                  <ComplexitySlider
                    value={complexityFilter}
                    onChange={setComplexityFilter}
                  />
                </div>

                <FeatureGate feature="advanced_search">
                  <div className="filter-section mb-3">
                    <DateRangePicker
                      startDate={dateRange.start}
                      endDate={dateRange.end}
                      onChange={setDateRange}
                    />
                  </div>
                </FeatureGate>

                <button 
                  className="btn btn-outline-secondary btn-sm w-100"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTags([]);
                    setDateRange({ start: null, end: null });
                    setShowFavoritesOnly(false);
                    setShowAIGeneratedOnly(false);
                    setComplexityFilter([1, 4]);
                  }}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </FeatureGate>

        {/* Main content area */}
        <div className={`col-12 ${user?.userLevel !== 'beginner' ? 'col-lg-9' : ''}`}>
          {/* Batch actions toolbar */}
          <FeatureGate feature="batch_operations">
            {selectedPatterns.size > 0 && (
              <BatchActions
                selectedCount={selectedPatterns.size}
                totalCount={filteredPatterns.length}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                onBatchDelete={handleBatchDelete}
                selectedPatternIds={Array.from(selectedPatterns)}
              />
            )}
          </FeatureGate>

          {/* Error state */}
          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && patterns.length === 0 && (
            <LoadingGrid count={PATTERNS_PER_PAGE} viewMode={viewMode} />
          )}

          {/* Empty state */}
          {!isLoading && filteredPatterns.length === 0 && (
            <EmptyState
              hasFilters={!!searchQuery || selectedTags.length > 0 || showFavoritesOnly || showAIGeneratedOnly}
              onClearFilters={() => {
                setSearchQuery('');
                setSelectedTags([]);
                setShowFavoritesOnly(false);
                setShowAIGeneratedOnly(false);
                setComplexityFilter([1, 4]);
                setDateRange({ start: null, end: null });
              }}
            />
          )}

          {/* Pattern grid/list */}
          {filteredPatterns.length > 0 && (
            <>
              <div className={viewMode === 'grid' ? 'row g-3' : 'list-group'}>
                {filteredPatterns.slice(0, page * PATTERNS_PER_PAGE).map(pattern => (
                  <div 
                    key={pattern.id} 
                    className={viewMode === 'grid' ? 'col-12 col-sm-6 col-md-4' : ''}
                  >
                    <PatternCard
                      pattern={pattern}
                      viewMode={viewMode}
                      isSelected={selectedPatterns.has(pattern.id)}
                      onSelect={() => togglePatternSelection(pattern.id)}
                      onLoad={() => handlePatternLoad(pattern)}
                      onView={() => setSelectedPattern(pattern)}
                      onDelete={() => handlePatternDelete(pattern.id)}
                      showSelection={actions.checkFeatureAccess('batch_operations')}
                    />
                  </div>
                ))}
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="text-center mt-4">
                  <button
                    className="btn btn-outline-primary"
                    onClick={loadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </span>
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-down-circle me-2"></i>
                        Load More Patterns
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pattern detail modal */}
      {selectedPattern && (
        <PatternDetailModal
          pattern={selectedPattern}
          onClose={() => setSelectedPattern(null)}
          onLoad={() => handlePatternLoad(selectedPattern)}
          onDelete={() => {
            handlePatternDelete(selectedPattern.id);
            setSelectedPattern(null);
          }}
          onUpdate={(updatedPattern) => {
            setPatterns(prev => 
              prev.map(p => p.id === updatedPattern.id ? updatedPattern : p)
            );
            setSelectedPattern(updatedPattern);
          }}
        />
      )}
    </div>
  );
}