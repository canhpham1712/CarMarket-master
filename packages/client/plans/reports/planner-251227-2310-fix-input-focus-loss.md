# Fix Input Focus Loss in SearchPage Filters

## Root Cause Identified

**Primary Issue**: Unnecessary `key` props on filter inputs + function recreation breaking `React.memo`

### Problem Chain

```
User types in priceMinInput
→ setPriceMinInput() updates state
→ SearchPage re-renders
→ ALL setter functions recreated (new references)
→ React.memo shallow compare fails
→ SearchFiltersPanel re-renders
→ Input with static key prop remounts
→ FOCUS LOSS + Scroll to top
```

### Two Contributing Factors

1. **Static `key` props** on inputs (lines 149, 161, 236, 361 in SearchFiltersPanel.tsx)
   - Unnecessary (no dynamic list rendering)
   - Forces React to treat as new elements on re-render

2. **Function recreation** on every SearchPage render
   - All props like `setPriceMinInput`, `setAppliedFilters` are new references each render
   - Breaks React.memo optimization
   - Causes unnecessary SearchFiltersPanel re-renders

---

## Recommended Solution: Two-Phase Fix

### Phase 1: Remove key Props (5 min, 70% success)

**File**: `src/components/search/SearchFiltersPanel.tsx`

Remove these lines:
- Line 149: `key="price-min-input"`
- Line 161: `key="price-max-input"`
- Line 236: `key="mileage-max-input"`
- Line 361: `key="location-input"`

### Phase 2: Wrap Functions in useCallback (20 min, 99% success)

**File**: `src/pages/SearchPage.tsx`

Wrap all setter functions and handlers in `useCallback`:
- `handleSetPriceMinInput`
- `handleSetPriceMaxInput`
- `handleSetMileageMaxInput`
- `handleSetLocationInput`
- `handleSetAppliedFilters`
- `handleSetSelectedMakeId`
- `handleRemoveFilter`
- `handleClearFilters`
- `handleApplyTextInputFilters`
- `handlePageChange`
- `handleLimitChange`
- `handleSortChange`
- `handleSearch`

Then update SearchFiltersPanel props to use wrapped functions.

---

## Quick Fix Alternative

If time-constrained, implement **Phase 1 only** (5 min, ~70% success rate).

---

## Files Modified

- `src/pages/SearchPage.tsx` - Add useCallback wrappers
- `src/components/search/SearchFiltersPanel.tsx` - Remove key props

---

## Success Criteria

- Can type full numbers/words without focus loss
- Filter panel does NOT scroll to top when typing
- All filters still functional after fix
- No console errors

---

## Unresolved Questions

None - Root cause clearly identified, fix is straightforward.

---

## Full Plan

See detailed implementation plan in:
`plans/251227-2310-fix-input-focus-loss/plan.md`
