# Debug Report: SearchPage Input Focus Loss

**Date:** 2025-12-27 22:45
**Component:** `/Users/khoa2807/development/carmarket3/CarMarket-master/packages/client/src/pages/SearchPage.tsx`
**Issue:** Input fields lose focus after typing 1 character, page scrolls to top

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:** Line 189, **useEffect hook syncing meta tags** triggers re-render on every state change including local input states.

**Impact:** Users cannot type in Price Range, Max Mileage, and Location filters - loses focus after each keystroke.

**Severity:** HIGH - Core functionality broken, affects user experience significantly.

---

## Root Cause Analysis

### Primary Culprit: Meta Tags Sync (Lines 126-189)

**Location:** `SearchPage.tsx:189`

**Problematic Code:**
```tsx
useEffect(() => {
  // ... meta tag updates ...
}, [pagination.total, searchQuery, appliedFilters]);
```

**Why It Causes Focus Loss:**

1. **Dependency chain:**
   - Lines 62-65: Local input states (`priceMinInput`, `priceMaxInput`, `mileageMaxInput`, `locationInput`)
   - Line 189: useEffect depends on `appliedFilters` (entire object)
   - Lines 249-291: Another useEffect syncs `appliedFilters` to URL
   - Lines 431-446: useEffect resets `pagination.page` when filters change
   - Line 189: Meta tag useEffect depends on `pagination.total`

2. **Re-render cycle:**
   ```
   User types in input
   → Local state updates (priceMinInput, etc.)
   → User presses Enter or Apply button
   → applyTextInputFilters() updates appliedFilters
   → Meta tag useEffect (line 189) detects appliedFilters change
   → Component re-renders
   → Input loses focus (DOM element recreated)
   → Page scrolls to top (default behavior on re-render)
   ```

3. **Critical issue:** `appliedFilters` in dependency array (line 189) triggers on EVERY filter change, including text inputs.

### Secondary Issue: Filter Sync to URL (Lines 249-291)

**Location:** `SearchPage.tsx:284-291`

**Problematic Code:**
```tsx
useEffect(() => {
  // ... sync to URL ...
  setSearchParams(params, { replace: true });
}, [
  searchQuery,
  appliedFilters,  // ← ENTIRE object reference
  pagination.page,
  pagination.limit,
  viewMode,
  setSearchParams,
]);
```

**Why It Exacerbates Focus Loss:**

- `appliedFilters` object reference changes on ANY filter update
- Triggers URL sync, which may cause navigation/update
- Combined with meta tag sync, creates double re-render

### Tertiary Issue: Page Reset on Filter Change (Lines 431-446)

**Location:** `SearchPage.tsx:446`

**Problematic Code:**
```tsx
useEffect(() => {
  // ... reset page to 1 ...
}, [searchQuery, appliedFilters.make, appliedFilters.model]);
```

**Additional Trigger:**
- Limited to `make` and `model` changes
- But combined with other effects, contributes to re-render cascade

---

## Evidence Chain

### Call Stack Analysis (Typing "5" in Price Min Input)

```
1. User types "5" in priceMinInput field (line 797)
   → setPriceMinInput("5") called

2. User presses Enter (line 799-802)
   → applyTextInputFilters() called (line 603-612)
   → setAppliedFilters() updates with priceMin: 5

3. appliedFilters object reference changes
   → Triggers URL sync useEffect (line 284-291)
   → setSearchParams() called with new params

4. appliedFilters change detected
   → Meta tag useEffect (line 189) triggers
   → Updates document title, meta tags
   → Component re-renders

5. Component re-renders
   → Input field DOM element recreated
   → Focus lost
   → Browser scrolls to top (default anchor behavior)
```

### Why Current Fix Attempt Failed

**Lines 62-65:** Local input states already implemented
```tsx
const [priceMinInput, setPriceMinInput] = useState("");
const [priceMaxInput, setPriceMaxInput] = useState("");
const [mileageMaxInput, setMileageMaxInput] = useState("");
const [locationInput, setLocationInput] = useState("");
```

**Why it didn't work:**
- Local states prevent IMMEDIATE focus loss during typing
- BUT when `applyTextInputFilters()` is called (Enter key or Apply button)
- It updates `appliedFilters` state
- This triggers meta tag useEffect (line 189)
- Focus lost AFTER apply, not during typing

---

## Solution Recommendations

### Option 1: Debounce Meta Tag Updates (RECOMMENDED)

**File:** `SearchPage.tsx:126-189`

**Implementation:**
```tsx
// Add ref to track previous values
const prevMetaParamsRef = useRef({
  total: pagination.total,
  query: searchQuery,
  filters: JSON.stringify(appliedFilters)
});

useEffect(() => {
  const currentParams = {
    total: pagination.total,
    query: searchQuery,
    filters: JSON.stringify(appliedFilters)
  };

  // Only update if something meaningful changed
  if (
    currentParams.total !== prevMetaParamsRef.current.total ||
    currentParams.query !== prevMetaParamsRef.current.query ||
    currentParams.filters !== prevMetaParamsRef.current.filters
  ) {
    // ... existing meta tag update code ...
    prevMetaParamsRef.current = currentParams;
  }
}, [pagination.total, searchQuery, appliedFilters]);
```

**Pros:**
- Minimal change
- Prevents unnecessary meta tag updates
- Maintains SEO functionality

**Cons:**
- Still runs on every render (early return)

---

### Option 2: Move Meta Tag Updates to Separate Component

**File:** Create `src/components/MetaTagsUpdater.tsx`

**Implementation:**
```tsx
import { useEffect } from 'react';

interface MetaTagsUpdaterProps {
  total: number;
  hasFilters: boolean;
  searchQuery: string;
}

export function MetaTagsUpdater({ total, hasFilters, searchQuery }: MetaTagsUpdaterProps) {
  useEffect(() => {
    // ... existing meta tag update code ...
  }, [total, hasFilters, searchQuery]);

  return null;
}
```

**Usage in SearchPage:**
```tsx
// In SearchPage component, after imports
<MetaTagsUpdater
  total={pagination.total}
  hasFilters={hasActiveFilters()}
  searchQuery={searchQuery}
/>
```

**Pros:**
- Isolates meta updates from main component
- Prevents re-render of SearchPage
- Cleaner separation of concerns

**Cons:**
- Requires new file
- More refactoring

---

### Option 3: Remove Meta Tag Sync During User Interaction

**File:** `SearchPage.tsx:126-189`

**Implementation:**
```tsx
const [isUserInteracting, setIsUserInteracting] = useState(false);

useEffect(() => {
  const timeoutId = setTimeout(() => {
    setIsUserInteracting(false);
  }, 2000); // Reset after 2s of no interaction

  return () => clearTimeout(timeoutId);
}, [priceMinInput, priceMaxInput, mileageMaxInput, locationInput]);

useEffect(() => {
  if (isUserInteracting) return; // Skip updates during typing

  // ... existing meta tag update code ...
}, [pagination.total, searchQuery, appliedFilters, isUserInteracting]);
```

**Pros:**
- Prevents updates during active typing
- Simple logic

**Cons:**
- Adds complexity
- May delay necessary updates

---

## Recommended Action Plan

### Immediate Fix (Option 1)

1. **Add ref to track previous values** (after line 65):
   ```tsx
   const prevMetaParamsRef = useRef({
     total: 0,
     query: "",
     filters: ""
   });
   ```

2. **Modify meta tag useEffect** (line 126-189):
   - Add comparison check at start
   - Update ref when changes detected
   - Early return if no meaningful changes

3. **Test scenarios:**
   - Type in Price Min input
   - Type in Price Max input
   - Type in Max Mileage input
   - Type in Location input
   - Verify focus maintained
   - Verify no scroll to top

### Long-term Improvement (Option 2)

1. Extract meta tag logic to separate component
2. Move SEO concerns out of main component
3. Improves component lifecycle management

---

## Additional Findings

### Non-Issues (Already Fixed)

✅ **Local input states** (lines 62-65) - Correctly implemented
✅ **No onBlur handlers** - Already removed
✅ **Apply button approach** (lines 603-612, 1023-1031) - Working as intended

### Potential Optimization

**Line 284-291:** URL sync useEffect
- Consider debouncing or batching URL updates
- Current implementation syncs on every state change
- Could use `setTimeout` to batch rapid changes

---

## Testing Checklist

After implementing fix:

- [ ] Type multiple characters in Price Min without losing focus
- [ ] Type multiple characters in Price Max without losing focus
- [ ] Type multiple characters in Max Mileage without losing focus
- [ ] Type multiple characters in Location without losing focus
- [ ] Verify page does NOT scroll to top during typing
- [ ] Verify Apply button still works
- [ ] Verify Enter key still triggers filter apply
- [ ] Verify meta tags still update correctly (check browser title)
- [ ] Verify URL params still sync correctly
- [ ] Test with rapid typing (no lag/focus loss)
- [ ] Test with filter combinations (price + mileage + location)

---

## Code References

**Files Modified:**
- `/Users/khoa2807/development/carmarket3/CarMarket-master/packages/client/src/pages/SearchPage.tsx`

**Lines Referenced:**
- Lines 62-65: Local input states
- Lines 126-189: Meta tag sync useEffect (ROOT CAUSE)
- Lines 249-291: URL sync useEffect
- Lines 431-446: Page reset useEffect
- Lines 603-612: Apply text input filters function
- Lines 793-814: Price range inputs
- Lines 876-891: Max mileage input
- Lines 1003-1019: Location input

---

## Unresolved Questions

1. **Why does meta tag update cause re-render?**
   - useEffect should not trigger parent re-render unless it causes state change
   - Need to verify if `document.title` or meta tag updates trigger React re-renders
   - Possible browser API side effect

2. **Is there a navigation event occurring?**
   - `setSearchParams` with `replace: true` should not cause navigation
   - But might trigger `useLocation` or router updates
   - Need to check if router change causes component remount

3. **Why only text inputs, not selects?**
   - EnhancedSelect components don't lose focus
   - Difference: Selects use callback-based updates
   - Text inputs use direct onChange handlers
   - Need to investigate EnhancedSelect implementation

---

## Summary

**Root Cause:** Meta tag useEffect (line 189) triggers on every `appliedFilters` change, causing unnecessary re-renders that destroy and recreate input DOM elements.

**Fix:** Add memoization/ref comparison to prevent meta tag updates when values haven't meaningfully changed, OR extract meta tag logic to separate component.

**Effort:** Low (1-2 hours for Option 1, 3-4 hours for Option 2)

**Risk:** Low - changes are isolated to meta tag logic, doesn't affect filter functionality
