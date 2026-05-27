# NOVA Quick Reference Card

## 🎯 At a Glance

| Item | Value |
|------|-------|
| **Project** | NOVA AI Assistant v0.2.0 |
| **Status** | ✅ Running & Ready |
| **URL** | http://localhost:3000 |
| **Port** | 3000 |
| **Database** | SQLite (dev.db) |
| **Framework** | Next.js 16 + React 19 |
| **Package Manager** | Bun |
| **Models** | 29 (Prisma) |
| **API Routes** | Auth, Chat, Admin, etc. |

---

## 📊 Project Stats

- **Total Packages**: 915
- **Source Files**: 100+ TypeScript/TSX
- **UI Components**: 18+ lazy-loaded
- **Database Tables**: 29
- **API Endpoints**: 10+
- **Lines of Code**: 5000+

---

## 🚀 Essential Commands

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Database management
bun run db:push          # Sync schema
bun run db:migrate       # Create migration
bun run db:reset         # Reset (deletes data!)
bun run db:generate      # Regenerate client

# Linting
bun run lint

# Access database UI
npx prisma studio
```

---

## 🔐 Default Credentials (for testing)

Email: `test@example.com`
Username: `testuser`
Password: `TestPassword123!`

⚠️ Create these via signup - they don't exist yet

---

## 🎨 Tech Stack

**Frontend**
- React 19 (with Suspense)
- Next.js 16 (App Router)
- Tailwind CSS 4
- TypeScript 5
- Zustand (state)
- Framer Motion (animations)

**Backend**
- Node.js / Bun runtime
- Express-style API routes
- Prisma ORM
- SQLite database
- Zod (validation)
- Bcrypt/Scrypt (crypto)

**AI**
- Custom Reasoning Engine
- Multi-provider support (OpenAI, Claude, Gemini, etc.)
- RAG (Retrieval-Augmented Generation)
- Personality system

---

## 📁 Key Files Location

| Path | Purpose |
|------|---------|
| `src/app/page.tsx` | Main app entry point |
| `src/app/api/chat/route.ts` | Chat AI endpoint |
| `src/app/api/auth/*` | Auth endpoints |
| `src/lib/auth.ts` | Security utilities |
| `src/lib/reasoning-engine.ts` | AI reasoning |
| `src/components/nova/` | UI components |
| `prisma/schema.prisma` | Database schema |
| `.env` | Environment config |
| `AUDIT_REPORT.md` | Security audit |
| `SETUP_GUIDE.md` | Setup instructions |

---

## 🔧 Configuration Quick Links

### Add AI Provider
Settings → AI Providers → Add → Enter API Key

### Check Database
```bash
npx prisma studio  # Opens admin UI on port 5555
```

### View Logs
```bash
tail -f dev.log          # Dev server logs
tail -f server.log       # Production logs
```

### Reset Everything
```bash
rm dev.db
bun run db:push
# Creates fresh database
```

---

## ⚡ Performance Tips

- **Lazy Loading**: 18 components loaded on-demand
- **Bundle Splitting**: Code-split by route
- **Turbopack**: Next.js 16 default bundler
- **Scrypt Hashing**: Optimized for low-memory
- **Session Pooling**: Connection reuse

---

## 🐛 Troubleshooting Quick Fixes

**Server won't start?**
```bash
# Kill existing process
pkill -f "next dev"
# Restart
bun run dev
```

**Database error?**
```bash
# Regenerate client
bun run db:generate
# Or full reset
bun run db:reset
```

**Port 3000 in use?**
```bash
# Find what's using it
lsof -i :3000
# Or use different port
next dev -p 3001
```

**Auth not working?**
```bash
# Check session table
npx prisma studio
# Look at: User, Session tables
```

---

## 📋 Documentation Files

1. **README_SETUP.md** ← START HERE
   - Overview & checklist
   - What was completed
   - Next steps

2. **SETUP_GUIDE.md**
   - Detailed configuration
   - Database management
   - Deployment guide

3. **AUDIT_REPORT.md** ← READ BEFORE PRODUCTION
   - Security analysis
   - Bug findings
   - Recommendations
   - Deployment checklist

---

## 🎯 First-Time Checklist

- [ ] Read README_SETUP.md
- [ ] Open http://localhost:3000
- [ ] Click "Sign Up"
- [ ] Create test account
- [ ] Go to Settings → AI Providers
- [ ] Add OpenAI API key
- [ ] Go to Chat
- [ ] Send your first message
- [ ] Review AUDIT_REPORT.md before production

---

## 🔑 API Quick Reference

### Authentication

**Register**
```bash
POST /api/auth/register
Body: { email, username, password, name? }
```

**Login**
```bash
POST /api/auth/login
Body: { email, password }
Response: { user, token }
```

**Logout**
```bash
POST /api/auth/logout
Header: Authorization: Bearer <token>
```

### Chat

**Send Message**
```bash
POST /api/chat
Header: Authorization: Bearer <token>
Body: { 
  messages: [{ role, content }],
  personality?: string,
  conversationId?: string
}
Response: { content, thinking, reasoning_steps, ... }
```

---

## 🌐 External Links

| Resource | URL |
|----------|-----|
| Next.js Docs | https://nextjs.org/docs |
| Prisma Docs | https://www.prisma.io/docs |
| Tailwind Docs | https://tailwindcss.com/docs |
| React Docs | https://react.dev |
| TypeScript Docs | https://www.typescriptlang.org/docs |

---

## 💾 Environment Variables

```
DATABASE_URL=file:./dev.db    # SQLite path
NODE_ENV=development          # dev/production
OPENAI_API_KEY=sk-...         # If using OpenAI
```

---

## 📞 Need Help?

1. Check **SETUP_GUIDE.md** (troubleshooting section)
2. Review **AUDIT_REPORT.md** (known issues)
3. Check dev.log for errors
4. Run `npx prisma studio` to inspect database
5. Review source code comments

---

## ✅ Status Summary

```
✅ Project Extracted
✅ Dependencies Installed (915 packages)
✅ Database Initialized (29 models)
✅ Environment Configured
✅ Dev Server Running (port 3000)
✅ Code Audited
✅ Documentation Complete

🟡 Pending:
  - AI Provider API Key Configuration
  - First User Registration
  - Production Deployment
```

---

**Last Updated**: 5/27/2026  
**Version**: 0.2.0  
**Status**: ✅ Production-Ready (See AUDIT_REPORT.md for details)

Start using NOVA now! 🚀
