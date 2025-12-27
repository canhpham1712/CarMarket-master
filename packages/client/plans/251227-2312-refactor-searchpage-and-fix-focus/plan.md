---
title: "Refactor SearchPage & Fix Input Focus Loss"
description: "Split SearchPage.tsx (1195 lines) into focused components and fix input focus loss issue caused by key props and unnecessary re-renders."
status: pending
priority: P1
effort: 8h
branch: main
tags: [refactor, bug-fix, search-page, performance]
created: 2025-12-27
---

## Problem Statement

**Current Issues:**
1. **SearchPage.tsx**: 1195 lines, too large, hard to maintain
2. **Input Focus Loss**: Typing in Price/Mileage/Location inputs loses focus after each keystroke
3. **Performance**: Unnecessary re-renders caused by URL sync useEffect

**Root Cause Analysis:**
```typescript
// SearchFiltersPanel.tsx lines 149, 161, 236, 361
<Input key="price-min-input" ... />  // ❌ Key prop causes remount on parent render
<Input key="price-max-input" ... />
<Input key="mileage-max-input" ... />
<Input key="location-input" ... />

// SearchPage.tsx lines 247-288
useEffect(() => {
  // Syncs URL on EVERY state change
  setSearchParams(params, { replace: true });
}, [searchQuery, appliedFilters, pagination.page, pagination.limit, viewMode]);
```

**Why Focus Loss Happens:**
1. User types → `setPriceMinInput()` called
2. State change triggers useEffect (line 247)
3. `setSearchParams()` causes parent re-render
4. `key="price-min-input"` causes Input to remount (destroy + recreate)
5. Focus lost

---

## Component Tree After Refactoring

```
SearchPage ( orchestration only, ~200 lines)
├── SearchBar (search input + suggestions)
├── SearchFiltersPanel (already exists, remove key props)
├── SearchResultsHeader (results count + sort + view toggle)
├── ActiveFiltersDisplay (filter chips + clear all)
├── SearchResultsGrid (list view with CarCards)
├── SearchResultsMap (map view wrapper)
└── SearchPagination (page controls + limit selector)
```

**File Structure:**
```
src/pages/
└── SearchPage.tsx (~200 lines)

src/components/search/
├── SearchFiltersPanel.tsx (EXIST, remove keys, ~380 lines)
├── SearchBar.tsx (NEW, ~150 lines)
├── SearchResultsHeader.tsx (NEW, ~80 lines)
├── ActiveFiltersDisplay.tsx (NEW, ~120 lines)
├── SearchResultsGrid.tsx (NEW, ~100 lines)
├── SearchResultsMap.tsx (NEW, ~50 lines)
└── SearchPagination.tsx (NEW, ~120 lines)
```

---

## Implementation Plan

### Phase 1: Fix Focus Loss (DO FIRST, 1h)
**Priority: CRITICAL** - Fix bug before refactoring to verify fix works.

#### Step 1.1: Remove Key Props from SearchFiltersPanel
**File:** `src/components/search/SearchFiltersPanel.tsx`

```diff
- <Input key="price-min-input" type="number" placeholder="Min" ... />
+ <Input type="number" placeholder="Min" id="price-min-input" ... />

- <Input key="price-max-input" type="number" placeholder="Max" ... />
+ <Input type="number" placeholder="Max" id="price-max-input" ... />

- <Input key="mileage-max-input" type="number" ... />
+ <Input type="number" id="mileage-max-input" ... />

- <Input key="location-input" type="text" ... />
+ <Input type="text" id="location-input" ... />
```

**Verification:**
1. Type in Price Min field - focus should stay
2. Type in Mileage field - focus should stay
3. Type in Location field - focus should stay

#### Step 1.2: Wrap Setters in useCallback (SearchPage)
**File:** `src/pages/SearchPage.tsx`

```typescript
// Add after line 67 (before return)
const setSelectedMakeIdCb = useCallback(setSelectedMakeId, []);
const setAppliedFiltersCb = useCallback(setAppliedFilters, []);
const setPriceMinInputCb = useCallback(setPriceMinInput, []);
const setPriceMaxInputCb = useCallback(setPriceMaxInput, []);
const setMileageMaxInputCb = useCallback(setMileageMaxInput, []);
const setLocationInputCb = useCallback(setLocationInput, []);
```

**Verification:** Check React DevTools - SearchFiltersPanel should NOT re-render on input change.

---

### Phase 2: Extract SearchBar Component (1.5h)

#### Step 2.1: Create SearchBar.tsx
**New File:** `src/components/search/SearchBar.tsx`

```typescript
interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestions: any[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onSearch: (e: React.FormEvent) => void;
  onSuggestionClick: (id: string) => void;
}

export const SearchBar = React.memo(({ ... }: SearchBarProps) => {
  // Lines 694-778 from SearchPage.tsx
  // Include searchContainerRef logic
});
```

**Extract:**
- Lines 694-778 (search form + suggestions dropdown)
- Lines 323-326 (handleSuggestionClick)
- Lines 303-321 (suggestions fetch useEffect)

#### Step 2.2: Update SearchPage.tsx
```diff
- // Lines 694-778
- <form onSubmit={handleSearch} ...>
+ <SearchBar
+   searchQuery={searchQuery}
+   setSearchQuery={setSearchQuery}
+   suggestions={suggestions}
+   showSuggestions={showSuggestions}
+   setShowSuggestions={setShowSuggestions}
+   onSearch={handleSearch}
+   onSuggestionClick={handleSuggestionClick}
+ />
```

**Verification:**
1. Search bar appears correctly
2. Suggestions work when typing
3. Clicking suggestion navigates to car detail
4. Click outside closes suggestions

---

### Phase 3: Extract SearchResultsHeader (1h)

#### Step 3.1: Create SearchResultsHeader.tsx
**New File:** `src/components/search/SearchResultsHeader.tsx`

```typescript
interface SearchResultsHeaderProps {
  loading: boolean;
  total: number;
  searchQuery: string;
  sortOptions: any[];
  currentSort: string;
  onSortChange: (value: string) => void;
  viewMode: 'list' | 'map';
  onViewModeChange: (mode: 'list' | 'map') => void;
  hasActiveFilters: boolean;
}

export const SearchResultsHeader = React.memo(({ ... }: SearchResultsHeaderProps) => {
  // Lines 858-920 from SearchPage.tsx
});
```

**Extract:**
- Lines 858-920 (results count + sort + view toggle buttons)

#### Step 3.2: Update SearchPage.tsx
```diff
+ <SearchResultsHeader
+   loading={loading}
+   total={pagination.total}
+   searchQuery={searchQuery}
+   sortOptions={sortOptions}
+   currentSort={getCurrentSortValue()}
+   onSortChange={handleSortChange}
+   viewMode={viewMode}
+   onViewModeChange={(mode) => {
+     setViewMode(mode);
+     const params = new URLSearchParams(searchParams);
+     params.set("view", mode);
+     setSearchParams(params, { replace: true });
+   }}
+   hasActiveFilters={hasActiveFilters()}
+ />
```

**Verification:**
1. Results count displays correctly
2. Sort dropdown works
3. List/Map toggle switches views
4. URL updates when switching views

---

### Phase 4: Extract ActiveFiltersDisplay (1h)

#### Step 4.1: Create ActiveFiltersDisplay.tsx
**New File:** `src/components/search/ActiveFiltersDisplay.tsx`

```typescript
interface ActiveFiltersDisplayProps {
  searchQuery: string;
  appliedFilters: SearchFilters;
  onRemoveSearchQuery: () => void;
  onRemoveFilter: (key: keyof SearchFilters) => void;
  onClearFilters: () => void;
}

export const ActiveFiltersDisplay = React.memo(({ ... }: ActiveFiltersDisplayProps) => {
  // Lines 922-996 from SearchPage.tsx
});
```

**Extract:**
- Lines 922-996 (filter chips + clear all)
- Lines 599-613 (removeFilter, removeSearchQuery helpers)

#### Step 4.2: Update SearchPage.tsx
```diff
+ <ActiveFiltersDisplay
+   searchQuery={searchQuery}
+   appliedFilters={appliedFilters}
+   onRemoveSearchQuery={removeSearchQuery}
+   onRemoveFilter={removeFilter}
+   onClearFilters={clearFilters}
+ />
```

**Verification:**
1. Active filter chips appear when filters applied
2. Clicking X on chip removes filter
3. "Clear All" button removes all filters
4. Chips disappear when no filters

---

### Phase 5: Extract SearchResultsGrid (1h)

#### Step 5.1: Create SearchResultsGrid.tsx
**New File:** `src/components/search/SearchResultsGrid.tsx`

```typescript
interface SearchResultsGridProps {
  listings: ListingDetail[];
  loading: boolean;
  user?: any;
  onFavoriteChange: (listingId: string, isFavorite: boolean) => void;
}

export const SearchResultsGrid = React.memo(({ ... }: SearchResultsGridProps) => {
  // Lines 1024-1092 from SearchPage.tsx (loading skeleton + grid + empty state)
});
```

**Extract:**
- Lines 1024-1092 (loading state + car grid + empty state)

#### Step 5.2: Update SearchPage.tsx
```diff
+ <SearchResultsGrid
+   listings={listings}
+   loading={loading}
+   user={user}
+   onFavoriteChange={(listingId, isFavorite) => {
+     setListings(prev => prev.map(l =>
+       l.id === listingId
+         ? { ...l, favoriteCount: isFavorite ? l.favoriteCount + 1 : Math.max(0, l.favoriteCount - 1) }
+         : l
+     ));
+   }}
+ />
```

**Verification:**
1. Loading skeletons appear when fetching
2. Car cards render correctly
3. Empty state shows when no results
4. Favorite toggle updates count

---

### Phase 6: Extract SearchResultsMap (0.5h)

#### Step 6.1: Create SearchResultsMap.tsx
**New File:** `src/components/search/SearchResultsMap.tsx`

```typescript
interface SearchResultsMapProps {
  listings: ListingDetail[];
  loading: boolean;
  onMarkerClick: (listing: ListingDetail) => void;
}

export const SearchResultsMap = React.memo(({ ... }: SearchResultsMapProps) => {
  // Lines 1000-1021 from SearchPage.tsx
});
```

**Extract:**
- Lines 1000-1021 (map view with loading state)

#### Step 6.2: Update SearchPage.tsx
```diff
+ {viewMode === 'map' && (
+   <SearchResultsMap
+     listings={mapListings}
+     loading={mapLoading}
+     onMarkerClick={(listing) => navigate(`/cars/${listing.id}`)}
+   />
+ )}
```

**Verification:**
1. Map displays correctly
2. Markers show for all listings
3. Clicking marker navigates to detail
4. Loading state shows

---

### Phase 7: Extract SearchPagination (1h)

#### Step 7.1: Create SearchPagination.tsx
**New File:** `src/components/search/SearchPagination.tsx`

```typescript
interface SearchPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const SearchPagination = React.memo(({ ... }: SearchPaginationProps) => {
  // Lines 1095-1187 from SearchPage.tsx
});
```

**Extract:**
- Lines 1095-1187 (pagination controls + limit selector)

#### Step 7.2: Update SearchPage.tsx
```diff
+ <SearchPagination
+   page={pagination.page}
+   limit={pagination.limit}
+   total={pagination.total}
+   totalPages={pagination.totalPages}
+   onPageChange={handlePageChange}
+   onLimitChange={handleLimitChange}
+ />
```

**Verification:**
1. Pagination numbers display correctly
2. Clicking page numbers changes page
3. Prev/Next buttons work
4. Limit selector changes items per page

---

### Phase 8: Clean Up SearchPage.tsx (1.5h)

#### Step 8.1: Consolidate SearchPage
After extracting all components, SearchPage.tsx should:
- Keep state management
- Keep useEffect hooks for data fetching
- Keep URL sync logic
- Keep metadata/queries logic
- Remove all JSX that was extracted

**Target:** Under 500 lines

#### Step 8.2: Optimize Re-renders
```typescript
// Wrap all callback functions in useCallback
const handleSearch = useCallback((e: React.FormEvent) => {
  e.preventDefault();
  setPagination((prev) => ({ ...prev, page: 1 }));
}, []);

const handleSortChange = useCallback((sortValue: string) => {
  const sortOption = sortOptions.find((opt) => opt.value === sortValue);
  if (sortOption) {
    setAppliedFilters((prev) => ({
      ...prev,
      sortBy: sortOption.sortBy,
      sortOrder: sortOption.sortOrder,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }
}, [sortOptions]);
```

**Verification:**
1. Run `wc -l src/pages/SearchPage.tsx` - should be < 500
2. All features work as before
3. No console errors
4. React DevTools shows minimal re-renders

---

## Rollback Plan

If something breaks after extraction:

### Quick Rollback (Per Component)
```bash
# After each phase, if broken:
git diff src/components/search/NewComponent.tsx
git checkout src/components/search/NewComponent.tsx
git checkout src/pages/SearchPage.tsx
# Revert to working state
```

### Full Rollback
```bash
git checkout HEAD -- src/pages/SearchPage.tsx
rm -rf src/components/search/SearchBar.tsx
rm -rf src/components/search/SearchResultsHeader.tsx
# ... delete all new components
```

**Checkpoint Strategy:**
- Commit after each successful phase
- Tag: `phase-1-focus-fix`, `phase-2-searchbar`, etc.

---

## Testing Checklist

### Focus Loss Bug
- [ ] Type in Price Min - focus stays
- [ ] Type in Price Max - focus stays
- [ ] Type in Mileage - focus stays
- [ ] Type in Location - focus stays
- [ ] Press Enter to apply filters - works

### SearchBar Component
- [ ] Search input appears
- [ ] Type text - suggestions appear
- [ ] Click suggestion - navigates correctly
- [ ] Click outside - suggestions close
- [ ] Press Enter - submits search

### SearchResultsHeader
- [ ] Results count displays
- [ ] Sort dropdown works
- [ ] List/Map toggle works
- [ ] URL updates on view change

### ActiveFiltersDisplay
- [ ] Filter chips appear when filters active
- [ ] Click X on chip - removes filter
- [ ] Click "Clear All" - removes all filters
- [ ] Chips hide when no filters

### SearchResultsGrid
- [ ] Loading skeletons show
- [ ] Car cards render
- [ ] Empty state shows
- [ ] Favorite toggle updates count

### SearchResultsMap
- [ ] Map displays correctly
- [ ] Markers show for listings
- [ ] Click marker - navigates to detail

### SearchPagination
- [ ] Page numbers display correctly
- [ ] Click page - changes page
- [ ] Prev/Next buttons work
- [ ] Limit selector changes items per page

### Overall SearchPage
- [ ] URL params sync correctly
- [ ] Browser back/forward works
- [ ] Mobile responsive (filters drawer)
- [ ] Desktop filters work
- [ ] All filters apply correctly
- [ ] No console errors
- [ ] Line count < 500

---

## Unresolved Questions

1. Should we move URL sync logic to a custom hook? (`useSearchQuerySync`)
2. Should we use React Query for caching search results?
3. Should `appliedFilters` be in a Zustand store instead of component state?
4. Is the mobile filters drawer animation smooth enough?
5. Should we add loading skeletons for map view too?

---

## Success Metrics

- [x] SearchPage.tsx under 500 lines (from 1195)
- [x] Input focus loss fixed (100% - no focus loss)
- [x] No console errors/warnings
- [x] All existing features work
- [x] Code is more maintainable (smaller components)
- [x] React DevTools shows <5 re-renders per interaction
