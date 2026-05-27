# Task: Build NOVA New Features (Web Search, Image Generation, Prompt Templates)

## Summary
Built three major new features for the NOVA assistant project, integrated them into the app, and fixed the z-ai-web-dev-sdk usage pattern across all API routes.

## Files Created

### API Routes
- `/home/z/my-project/src/app/api/web-search/route.ts` - Web search API using z-ai-web-dev-sdk `functions.invoke('web_search')`
- `/home/z/my-project/src/app/api/image-gen/route.ts` - Image generation API using z-ai-web-dev-sdk `images.generations.create()`

### Components
- `/home/z/my-project/src/components/nova/web-search-view.tsx` - Full web search interface with search bar, results display, search history, and "Ask AI about results" feature
- `/home/z/my-project/src/components/nova/image-generation-view.tsx` - Image generation interface with prompt input, size selector, style presets, download, lightbox, and generation history
- `/home/z/my-project/src/components/nova/prompt-templates-view.tsx` - Prompt template library with 22 built-in templates across 6 categories, variable filling, custom template creation, and send-to-chat integration

## Files Modified

- `/home/z/my-project/src/lib/nova-store.ts` - Added 'websearch', 'imagegen', 'templates' to NovaView type
- `/home/z/my-project/src/components/nova/sidebar.tsx` - Added new nav items with icons (Globe, ImageIcon, LayoutList) under "AI" section
- `/home/z/my-project/src/app/page.tsx` - Added imports and ViewRenderer entries for new views, fixed duplicate imports
- `/home/z/my-project/src/app/api/chat/route.ts` - Fixed z-ai-web-dev-sdk usage from `zAi()` to `ZAI.create()` (was broken, falling through to fallback)

## Key Technical Details

### SDK Usage Fix
The z-ai-web-dev-sdk exports `ZAI` as default with `ZAI.create()` as async factory. The old `zAi()` pattern was not a function. Fixed all API routes to use:
```ts
const ZAI = (await import('z-ai-web-dev-sdk')).default
const ai = await ZAI.create()
```

### Web Search API
- GET `/api/web-search?query=...&num=10&recency_days=7`
- Uses `ai.functions.invoke('web_search', { query, num, recency_days })`
- Returns results with url, name, snippet, host_name, rank, date, favicon
- Verified working with real search results

### Image Generation API
- POST `/api/image-gen` with `{ prompt, size }`
- Supports sizes: 1024x1024, 768x1344, 1344x768, and more
- Returns `{ image: base64string }`

### Design System
All components follow NOVA's design system:
- Glass-card styling with `glass-card` class
- Gold accent colors (`text-nova-gold`, `gold-gradient-bg`, `gold-gradient-text`)
- Framer Motion animations (whileHover, whileTap, AnimatePresence)
- Consistent spacing and layout patterns
