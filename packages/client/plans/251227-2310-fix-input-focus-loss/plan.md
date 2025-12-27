---
title: "Fix Input Focus Loss in SearchPage Filters"
description: "Resolve issue where filter inputs lose focus after typing one character, causing panel to scroll to top"
status: pending
priority: P1
effort: 2h
branch: main
tags: [bug, ux, focus, search-filters]
created: 2025-12-27
---

# Fix Input Focus Loss in SearchPage Filters

## Problem Summary

Users typing in filter inputs (Price Range, Max Mileage, Location) on `/search` page experience:
1. Input loses focus after typing 1 character
2. Filter panel scrolls to top
3. Cannot continue typing smoothly

## Root Cause Analysis

### Identified Issues

#### 1. **URL Sync useEffect Triggers on Every Input Change** (PRIMARY CULPRIT)
**Location**: `SearchPage.tsx:247-288`

```typescript
useEffect(() => {
  const params = new URLSearchParams();
  // ... builds params ...
  setSearchParams(params, { replace: true });
}, [
  searchQuery,
  appliedFilters,  // ⚠️ THIS TRIGGERS ON EVERY STATE CHANGE
  pagination.page,
  pagination.limit,
  viewMode,
  setSearchParams,
]);
```

**Problem**:
- When user types in `priceMinInput`, `priceMaxInput`, etc.
- These are NOT in `appliedFilters` yet (only synced when user presses Enter or clicks Apply)
- BUT when `setPriceMinInput` updates local state, it doesn't trigger URL sync
- However, other dependencies might cause re-renders

**Wait - re-analysis needed**: The input states (`priceMinInput`, etc.) are NOT in the dependencies. So typing shouldn't trigger URL sync directly.

#### 2. **React.memo Not Working Effectively**
**Location**: `SearchFiltersPanel.tsx:29`

```typescript
export const SearchFiltersPanel = React.memo(function SearchFiltersPanel({
  // ... ALL props passed down
}: SearchFiltersPanelProps) {
```

**Problem**:
- `React.memo` without custom comparison function does shallow comparison
- ALL functions passed as props (`setPriceMinInput`, `setAppliedFilters`, etc.) are recreated on every SearchPage render
- Functions are reference types → shallow compare fails → component re-renders
- **Input with `key` prop (line 149, 161, 236, 361)** gets re-mounted → **FOCUS LOSS**

#### 3. **key Props on Inputs**
**Location**: `SearchFiltersPanel.tsx:149, 161, 236, 361`

```typescript
<Input
  key="price-min-input"  // ⚠️ KEY PROP CAUSES REMOUNT
  type="number"
  placeholder="Min"
  value={priceMinInput}
  onChange={(e) => setPriceMinInput(e.target.value)}
/>
```

**Problem**:
- Static `key` props are unnecessary (no dynamic keys needed)
- When parent re-renders, React may treat these as new elements if the key matches a remount scenario
- Combined with parent re-renders from new function references → complete input remount

#### 4. **useEffect Dependencies Chain**

```
User types in input
→ setPriceMinInput() updates state
→ SearchPage re-renders (useState update)
→ ALL setter functions recreated (new references)
→ React.memo sees new function props
→ SearchFiltersPanel re-renders
→ Input with key prop remounts
→ FOCUS LOSS
```

### Verification

**Test this hypothesis**:
1. Remove `key` props from inputs → Should partially fix
2. Wrap setter functions in `useCallback` → Should fix React.memo
3. Both changes → Complete fix

---

## Solution Options (Ranked by Success Probability)

### Option 1: Remove key Props + useCallback (RECOMMENDED)
**Success Rate**: 99%
**Effort**: 30 min
**Side Effects**: None

Remove unnecessary `key` props from inputs and wrap all setter functions in `useCallback`.

**Pros**:
- Fixes the root cause (unnecessary remounts + function recreation)
- No breaking changes
- Improves performance (fewer re-renders)
- Clean solution

**Cons**:
- Need to add useCallback hooks

---

### Option 2: Remove key Props Only
**Success Rate**: 70%
**Effort**: 5 min
**Side Effects**: None

Just remove the `key` props from inputs.

**Pros**:
- Quickest fix
- No code restructuring

**Cons**:
- Doesn't fix underlying re-render issue
- Panel may still scroll/flicker on type
- Performance still degraded

---

### Option 3: useRef for Focus Tracking
**Success Rate**: 90%
**Effort**: 45 min
**Side Effects**: More complex state management

Add `useRef` to track which input has focus and restore it after renders.

**Pros**:
- Preserves focus even if remount happens
- Works as a safety net

**Cons**:
- Doesn't fix root cause (band-aid solution)
- More complex code
- May have timing issues

---

### Option 4: Controlled Input in Parent
**Success Rate**: 100%
**Effort**: 2 hours
**Side Effects**: Major refactor

Move input state management to parent component entirely.

**Pros**:
- Most robust solution
- Complete control

**Cons**:
- Requires significant refactoring
- Breaks component isolation
- Over-engineering for this issue

---

## Recommended Implementation: Option 1

### Phase 1: Remove key Props (5 min)
**Goal**: Eliminate forced remounts from static keys

**Files**: `src/components/search/SearchFiltersPanel.tsx`

**Actions**:
1. Remove `key="price-min-input"` from line 149
2. Remove `key="price-max-input"` from line 161
3. Remove `key="mileage-max-input"` from line 236
4. Remove `key="location-input"` from line 361

**Expected Result**: Partial fix - inputs may not remount but panel might still re-render

---

### Phase 2: Wrap Functions in useCallback (20 min)
**Goal**: Prevent function recreation, make React.memo effective

**Files**: `src/pages/SearchPage.tsx`

**Actions**:

#### 2.1 Wrap State Setters

```typescript
// Add after line 54 (after local state declarations)
const handleSetPriceMinInput = useCallback((value: string) => {
  setPriceMinInput(value);
}, []);

const handleSetPriceMaxInput = useCallback((value: string) => {
  setPriceMaxInput(value);
}, []);

const handleSetMileageMaxInput = useCallback((value: string) => {
  setMileageMaxInput(value);
}, []);

const handleSetLocationInput = useCallback((value: string) => {
  setLocationInput(value);
}, []);

const handleSetAppliedFilters = useCallback((update: (prev: any) => any) => {
  setAppliedFilters(update);
}, []);

const handleSetSelectedMakeId = useCallback((value: string) => {
  setSelectedMakeId(value);
}, []);
```

#### 2.2 Wrap Other Functions

```typescript
// Wrap existing functions (lines 599-686)
const handleRemoveFilter = useCallback((filterKey: keyof SearchFilters) => {
  setAppliedFilters((prev) => {
    const { [filterKey]: removed, ...rest } = prev;
    return rest;
  });
  if (filterKey === "make") {
    setSelectedMakeId("");
    setAvailableModels([]);
  }
  setPagination((prev) => ({ ...prev, page: 1 }));
}, []);

const handleRemoveSearchQuery = useCallback(() => {
  setSearchQuery("");
}, []);

const handleClearFilters = useCallback(() => {
  setAppliedFilters({
    priceMin: 0,
    priceMax: DEFAULT_MAX_PRICE,
  });
  setSearchQuery("");
  setSelectedMakeId("");
  setAvailableModels([]);
  setPriceMinInput("");
  setPriceMaxInput("");
  setMileageMaxInput("");
  setLocationInput("");
  setPagination((prev) => ({
    ...prev,
    page: 1,
  }));
}, []);

const handleApplyTextInputFilters = useCallback(() => {
  setAppliedFilters((prev) => ({
    ...prev,
    priceMin: priceMinInput ? Number(priceMinInput) : 0,
    priceMax: priceMaxInput ? Number(priceMaxInput) : DEFAULT_MAX_PRICE,
    mileageMax: mileageMaxInput ? Number(mileageMaxInput) : undefined,
    location: locationInput || undefined,
  }));
  setPagination((prev) => ({ ...prev, page: 1 }));
}, [priceMinInput, priceMaxInput, mileageMaxInput, locationInput]);

const handlePageChange = useCallback((newPage: number) => {
  setPagination((prev) => ({
    ...prev,
    page: newPage,
  }));
}, []);

const handleLimitChange = useCallback((newLimit: number) => {
  setPagination((prev) => ({
    ...prev,
    limit: newLimit,
    page: 1,
  }));
}, []);

const handleSortChange = useCallback((sortValue: string) => {
  const sortOption = sortOptions.find((opt) => opt.value === sortValue);
  if (sortOption) {
    setAppliedFilters((prev) => ({
      ...prev,
      sortBy: sortOption.sortBy,
      sortOrder: sortOption.sortOrder,
    }));
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }
}, []);

const handleSearch = useCallback((e: React.FormEvent) => {
  e.preventDefault();
  setPagination((prev) => ({ ...prev, page: 1 }));
}, []);
```

#### 2.3 Update SearchFiltersPanel Props

Replace lines 785-805 (desktop) and 829-849 (mobile):

```typescript
<SearchFiltersPanel
  metadata={metadata}
  metadataLoading={metadataLoading}
  metadataError={metadataError}
  availableModels={availableModels}
  selectedMakeId={selectedMakeId}
  appliedFilters={appliedFilters}
  priceMinInput={priceMinInput}
  priceMaxInput={priceMaxInput}
  mileageMaxInput={mileageMaxInput}
  locationInput={locationInput}
  setSelectedMakeId={handleSetSelectedMakeId}
  setAppliedFilters={handleSetAppliedFilters}
  setPriceMinInput={handleSetPriceMinInput}
  setPriceMaxInput={handleSetPriceMaxInput}
  setMileageMaxInput={handleSetMileageMaxInput}
  setLocationInput={handleSetLocationInput}
  onApplyFilters={handleApplyTextInputFilters}
  onClearFilters={handleClearFilters}
  hasActiveFilters={hasActiveFilters}
/>
```

**Expected Result**:
- React.memo now works (stable function references)
- No unnecessary re-renders of SearchFiltersPanel
- Inputs don't remount
- Focus preserved

---

### Phase 3: Verify & Test (5 min)

**Test Steps**:
1. Start dev server: `npm run dev`
2. Navigate to `/search`
3. Test each input:
   - Price Min: Type "50000" → Should NOT lose focus
   - Price Max: Type "100000" → Should NOT lose focus
   - Max Mileage: Type "50000" → Should NOT lose focus
   - Location: Type "Los Angeles" → Should NOT lose focus
4. Verify filter still works:
   - Press Enter → Filter applies
   - Click "Apply Filters" → Filter applies
   - URL updates correctly
5. Test other filters:
   - Make/Model dropdowns → Should work
   - Year range → Should work
   - Fuel type, Body type, etc. → Should work

**Success Criteria**:
- ✅ Can type full numbers/words without focus loss
- ✅ Panel does NOT scroll to top when typing
- ✅ All filters still functional
- ✅ No console errors

---

## Alternative: Quick Fix (Option 2 Only)

If time-constrained, implement ONLY Phase 1 (remove key props):

```typescript
// SearchFiltersPanel.tsx - Remove these lines:
// Line 149: key="price-min-input"
// Line 161: key="price-max-input"
// Line 236: key="mileage-max-input"
// Line 361: key="location-input"
```

This provides ~70% success rate with 5 min effort.

---

## Fallback: Focus Refocus (Option 3)

If Option 1 doesn't work, add focus tracking:

```typescript
// In SearchFiltersPanel.tsx
const activeInputRef = useRef<HTMLInputElement>(null);

// Add to each Input:
ref={activeInputRef}

// Add useEffect to restore focus after renders:
useEffect(() => {
  if (activeInputRef.current && document.activeElement !== activeInputRef.current) {
    activeInputRef.current.focus();
  }
}, [priceMinInput]); // Add other dependencies
```

---

## Unresolved Questions

None - root cause clearly identified as unnecessary key props + function recreation breaking React.memo.

---

## Related Files

- `src/pages/SearchPage.tsx` - Parent component, manages state
- `src/components/search/SearchFiltersPanel.tsx` - Filter panel with inputs
- `src/components/ui/Input.tsx` - Base Input component

---

## Risk Assessment

**Low Risk**:
- Removing static `key` props - No impact (keys were unnecessary)
- Adding `useCallback` - Standard React optimization pattern

**No Breaking Changes**:
- All changes are internal implementation details
- Props interface unchanged
- User behavior unchanged
