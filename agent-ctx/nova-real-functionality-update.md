# Task: Convert NOVA Assistant Mock Data to Real Functionality

## Summary
Converted two major components from mock/hardcoded data to real functionality:

### 1. Password Vault — Real AES-256-GCM Encryption
**File**: `src/components/nova/password-vault-view.tsx`

Changes:
- Imported `encryptData`, `decryptData`, `verifyPassword`, `hashPassword` from `@/lib/encryption`
- Removed local `hashPassword` function (SHA-256 only) in favor of the library version
- **Master password verification** now uses `verifyPassword()` with constant-time comparison instead of simple SHA-256 hash comparison
- **Encryption on save**: When adding a password entry, the password field is encrypted using `encryptData(password, masterPassword)` before storing in the store
- **Decryption on view**: When the vault is unlocked, all passwords are decrypted using `decryptData()` and cached in a `decryptedPasswords` state map
- **Master password cached in ref**: `masterPasswordRef` (useRef) holds the master password in memory while vault is unlocked — not persisted
- **Lock Vault button**: Clears `masterPasswordRef` and `decryptedPasswords`, sets vault to locked state
- **Re-encrypt All button**: Re-encrypts all passwords with the current master password using the `updatePassword` store method
- **Encryption status badges**: Each entry shows "Encrypted" (green shield) or "Unencrypted" (amber shield) based on `isLikelyEncrypted()` heuristic
- **Security info**: Footer on locked screen shows "AES-256-GCM encryption · PBKDF2 key derivation"
- Auto-lock timer now calls `handleLockVault()` to properly clear cached data

**Store changes**: `src/lib/nova-store.ts`
- Added `updatePassword(id: string, updates: Partial<PasswordEntry>)` method for re-encryption support

### 2. Calculator/Converter — Real Exchange Rates
**Files**: 
- `src/app/api/exchange-rates/route.ts` (new)
- `src/components/nova/calculator-view.tsx` (updated)

**API Route** (`/api/exchange-rates`):
- Primary source: open.er-api.com (free, no API key required)
- Fallback 1: frankfurter.app (free, open source)
- Fallback 2: z-ai-web-dev-sdk web_search
- Final fallback: hardcoded rates
- In-memory cache with 10-minute TTL
- Returns rates, timestamp, source, and fallback flag

**Calculator View Changes**:
- Replaced hardcoded `CURRENCY_RATES` with `FALLBACK_RATES` as initial state
- Added `useEffect` to fetch real rates from `/api/exchange-rates` on mount
- Added "Refresh Rates" button with loading spinner
- Shows last updated timestamp with clock icon
- Shows live/cached status indicator (green "● Live" or amber "(cached)")
- Added currencies: USD, EUR, GBP, JPY, CNY, AED, SAR, INR, CAD, AUD, CHF (11 total)
- Rates display adapts decimal precision (2 for rates ≥ 1, 4 for rates < 1)
- **Conversion history**: Track saved conversions with from/to/amount/result/timestamp/type
- "Save to history" button on conversion result
- Toggle-able history panel with clear button
- Offline resilient: keeps last cached rates if API is unavailable

## Lint Status
✅ All files pass `bun run lint` with zero errors

## API Test
✅ `/api/exchange-rates` returns live rates successfully:
```json
{"rates":{"USD":1,"EUR":0.86185,"GBP":0.744636,"JPY":159.134707,...},"source":"open.er-api.com","fallback":false}
```
