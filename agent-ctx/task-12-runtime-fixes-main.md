# Task 12: Fix Runtime Errors and Permission Issues

## Summary
Fixed critical runtime bugs and permission issues across multiple NOVA components.

## Changes Made

### 1. Knowledge View (knowledge-view.tsx)
- **Critical fix**: Reordered `userKnowledgeEntries` useMemo before `documents` and `searchResults` — it was previously referenced before definition (temporal dead zone crash)
- **Bug fix**: Changed `matchedIds.has(e)` to `matchedIds.has(e.id)` in displayedEntries memo
- **Feature**: Implemented actual userId-based filtering instead of always returning true
- **Feature**: Added `userId: user?.id` to newly created knowledge entries

### 2. Settings View (settings-view.tsx)
- Added `useAuth` import and `isAdmin` check
- Added `adminOnly` property to SETTINGS_TABS (Updates, Integrations, Advanced, Sync)
- Created `visibleTabs` memo to filter admin-only tabs from non-admin users
- Added Lock icon badge on admin-only tabs
- Made "Go to Admin Panel" button admin-only

### 3. Nova Store (nova-store.ts)
- Added optional `userId` field to `KnowledgeEntry` interface

### 4. Admin View (admin-view.tsx) — Verified OK
- Already has isAdmin check before rendering
- All API calls use authFetch

### 5. Sidebar (sidebar.tsx) — Verified OK
- Already filters admin-only items with `!item.adminOnly || isAdmin`

## Lint Result
All changes pass ESLint with zero errors.
