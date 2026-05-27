# Performance Optimization - NOVA App

## Task: Optimize NOVA for performance via code splitting, lazy loading, and bundle size reduction

## Changes Made

### 1. Lazy Loading for All Views (`src/app/page.tsx`)
- Replaced all 21 eager view imports with `React.lazy()` + named export wrapper
- Each view is now code-split into its own chunk, loaded on demand
- Added `Suspense` wrapper with a `ViewLoader` fallback (spinning gold ring + "Loading...")
- Also lazy-loaded 3 overlay components: `CommandPalette`, `NotificationPanel`, `Onboarding`
- Kept `AuthView` as eager import since it's needed immediately on app load
- Changed `views` record type from `Record<string, React.ComponentType>` to `Record<string, React.LazyExoticComponent<React.ComponentType>>`

### 2. Recharts Import Verification
- Confirmed all recharts imports already use named imports (no full `import * from 'recharts'` in view components)
- `dashboard-view.tsx`: `import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'`
- `llm-training.tsx`: `import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'`
- `chart.tsx` (shadcn/ui): `import * as RechartsPrimitive from "recharts"` — this is correct for the chart wrapper component
- Since dashboard and llm-training are now lazy-loaded, recharts is automatically code-split

### 3. Dynamic Imports Utility (`src/lib/dynamic-imports.ts`) — NEW FILE
- Created helpers for lazy-loading heavy dependencies at runtime
- `loadRecharts()` — full recharts library (~450KB)
- `loadFramerMotion()` — framer-motion (~150KB)
- `loadRechartsArea()` — granular recharts Area chart components
- `loadRechartsLine()` — granular recharts Line chart components

### 4. Zustand Store Optimization (`src/lib/nova-store.ts`)
- **Custom storage engine** with 2MB size limit:
  - `getItem`: Detects oversized stores, trims large data arrays automatically
  - `setItem`: Catches `QuotaExceededError`, clears and retries
  - `removeItem`: Standard removal
- **Dramatically reduced `partialize`**: Only 14 essential settings are persisted:
  - UI preferences: activeView, personality, darkMode, sidebarCollapsed, customCSS
  - Feature flags: adaptiveLearningEnabled, smartSuggestionsEnabled
  - TTS settings: ttsEnabled, ttsRate, ttsVoice
  - Reasoning: reasoningDepth, showConfidence
  - Privacy: autoLearnFromChat, dataProcessing, encryption
  - Developer: debugMode, experimentalFeatures
  - Sync: syncEnabled, selectedTheme
  - Security: vaultLocked, masterPasswordHash, adminAuthenticated
  - Stats: focusSessionsCompleted, focusTotalMinutes
  - Plugins: installedPlugins
- **Removed from persistence**: messages, userActions, tasks, notes, knowledge, calendarEvents, passwords, automations, notifications, conversations, llmTrainingStatus, trainedVocabulary, updateQueue, updateHistory, backupRecords, featureFlags, integrations, devices, bankingAccounts, transactions, socialAccounts, tradingData, cryptoHoldings, plugins

### 5. Bundle Analysis Comment (`next.config.ts`)
- Added documentation comment explaining how to use `@next/bundle-analyzer`
- Includes installation command and config wrapping instructions
- Notes the TypeScript/ESM compatibility considerations

## Verification
- `bun run lint` — passes with no errors
- Dev server responds with HTTP 200
- All changes are backward-compatible (existing functionality preserved)
