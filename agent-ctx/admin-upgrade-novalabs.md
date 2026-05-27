# NOVA Admin Panel Upgrade & Fake Data Removal

## Task Summary
Replaced ALL remaining fake data in the NOVA assistant project and upgraded the admin panel with full user management, tier management, API keys management, and integration control.

## Changes Made

### 1. Crypto Route (`src/app/api/crypto/route.ts`)
- **Removed**: All hardcoded crypto prices (BTC, ETH, SOL, etc.)
- **Added**: CoinGecko free API as primary source
- **Added**: z-ai-web-dev-sdk web_search as fallback
- **Added**: Returns error status with empty data (not fake data) if both fail
- **Sparklines**: Uses CoinGecko 7-day sparkline data if available, or generates minimal 7-point sparkline from 24h change percentage

### 2. Plugin Engine (`src/lib/plugin-engine.ts`)
- **crypto-tracker**: Now calls `/api/crypto` for real prices
- **banking-portal**: Returns empty data (no fake banking data)
- **trading-bot**: Returns empty data (no fake trading data)
- **social-manager**: Returns "not connected" status (no fake analytics)
- **db-manager**: Calls `/api/admin/db-stats` for real DB stats
- **sys-monitor**: Calls `/api/system` for real system stats
- **code-gen**: Uses `/api/ai/chat` for code generation
- **openclaw**: Returns actual sync status from integrations API

### 3. Voice API (`src/app/api/voice/route.ts`)
- **Added**: More intent categories (navigate, search, create, delete, toggle, query_status, set_setting)
- **Added**: Fuzzy matching (keywords matched anywhere in command, not just exact match)
- **Added**: Confidence scoring based on keyword overlap, multi-word match bonus, position bonus
- **Added**: Suggested actions returned based on detected intent
- **Added**: matchedKeywords returned for debugging

### 4. Reasoning Engine (`src/lib/reasoning-engine.ts`)
- **Removed**: Artificial `setTimeout` delays (200ms for deep, 100ms for balanced)
- Reasoning now processes as fast as possible

### 5. Admin Users API
- **Created** `src/app/api/admin/users/route.ts`:
  - GET: List all users with pagination, search, role/tier filters
  - POST: Create new user with email, username, password, role, tier
- **Created** `src/app/api/admin/users/[id]/route.ts`:
  - GET: Get user details with sessions, API keys, usage count
  - PUT: Update user (role, tier, isActive, email, username, name)
  - DELETE: Delete user (with self-delete protection)

### 6. Admin Tiers API
- **Created** `src/app/api/admin/tiers/route.ts`:
  - GET: List all tier limits (auto-seeds 5 default tiers if empty)
- **Created** `src/app/api/admin/tiers/[tier]/route.ts`:
  - PUT: Update tier limits

### 7. Admin Panel (`src/components/nova/admin-view.tsx`)
- **Added new types**: AdminUser, TierInfo, GlobalApiKey
- **Added new tabs**: "Tiers" (Crown icon), "API Keys" (Key icon)
- **Users section** - Complete rewrite:
  - Fetches real users from `/api/admin/users`
  - Add User dialog (email, username, password, name, role, tier)
  - Edit User dialog (role, tier, active status)
  - Delete User dialog (with confirmation)
  - Toggle user active/inactive
  - Pagination
  - Access Control section retained
- **Tier Management section** - New:
  - Shows all 5 tiers with limits and permissions
  - Visual comparison table
  - Color-coded tier cards
- **API Keys Management section** - New:
  - Fetches real global API keys from `/api/admin/global-api-keys`
  - Add Key dialog (provider, API key, secret, base URL, min tier)
  - Toggle active/inactive
  - Delete keys
- **Removed fake integrations**: The catch block in fetchIntegrations now returns empty array instead of fake data
