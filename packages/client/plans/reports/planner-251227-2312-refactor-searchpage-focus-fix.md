# Plan Report: Refactor SearchPage & Fix Focus Loss

## Summary

Đã tạo kế hoạch chi tiết refactor SearchPage.tsx (1195 dòng) và fix lỗi mất focus input.

## Root Cause Identified

**Focus loss gây ra bởi:**
1. **Key props** trong SearchFiltersPanel.tsx (lines 149, 161, 236, 361)
2. **useEffect URL sync** trigger re-render mỗi lần state thay đổi
3. Thiếu useCallback cho setter functions

## Solution Approach

### Part 1: Fix Focus Loss (Priority CRITICAL)
- Remove key props từ Input components
- Wrap setters trong useCallback
- Verification: Type test trong Price/Mileage/Location fields

### Part 2: Refactor Components
Target: Giảm SearchPage.tsx từ 1195 → <500 dòng

**Component tree:**
```
SearchPage (~200 lines)
├── SearchBar (NEW, 150 lines)
├── SearchFiltersPanel (EXIST, fix keys)
├── SearchResultsHeader (NEW, 80 lines)
├── ActiveFiltersDisplay (NEW, 120 lines)
├── SearchResultsGrid (NEW, 100 lines)
├── SearchResultsMap (NEW, 50 lines)
└── SearchPagination (NEW, 120 lines)
```

## Implementation Phases (8 phases, ~8h)

| Phase | Task | Lines Extracted | Duration |
|-------|------|-----------------|----------|
| 1 | Fix focus loss | N/A | 1h |
| 2 | Extract SearchBar | 694-778 | 1.5h |
| 3 | Extract SearchResultsHeader | 858-920 | 1h |
| 4 | Extract ActiveFiltersDisplay | 922-996 | 1h |
| 5 | Extract SearchResultsGrid | 1024-1092 | 1h |
| 6 | Extract SearchResultsMap | 1000-1021 | 0.5h |
| 7 | Extract SearchPagination | 1095-1187 | 1h |
| 8 | Clean up SearchPage | N/A | 1.5h |

## Rollback Strategy

- Commit sau mỗi phase thành công
- Git tag: `phase-1-focus-fix`, `phase-2-searchbar`, etc.
- Quick rollback per component nếu broken

## Verification Checklist

Tất cả items phải pass:
- [ ] Focus loss fixed (typing in Price/Mileage/Location)
- [ ] All features work (search, filters, sort, pagination, map)
- [ ] Line count < 500
- [ ] No console errors
- [ ] React DevTools shows minimal re-renders

## Files

**Plan:** `/Users/khoa2807/development/carmarket3/CarMarket-master/packages/client/plans/251227-2312-refactor-searchpage-and-fix-focus/plan.md`

**Next Steps:**
1. Review plan với team
2. Bắt đầu Phase 1 (fix focus loss)
3. Test kỹ sau mỗi phase
4. Monitor performance metrics
