# NOVA AI Assistant - Complete Setup Guide

## ✅ What's Been Done

1. **Extracted Project** - All files moved to root directory
2. **Dependencies Installed** - 915 packages via Bun
3. **Database Initialized** - SQLite database created with 29 tables
4. **Environment Setup** - `.env` file configured with DATABASE_URL
5. **Dev Server Running** - Next.js server active on port 3000
6. **Code Audit Complete** - Issues identified and documented (see AUDIT_REPORT.md)

---

## 🚀 Getting Started

### Access the Application
- **URL**: http://localhost:3000
- **Status**: ✅ Running and accessible
- **Initial State**: Loading auth screen (no users yet)

### Create Your First Account
The app requires registration. You can test it with:
```
Email: test@example.com
Username: testuser
Password: TestPassword123!
```

---

## 🔑 Key Features of NOVA

### Core AI Capabilities
- **Multi-Provider AI Support**: OpenAI, Anthropic, Google, Cohere, Mistral, etc.
- **Reasoning Engine**: Local query analysis and intent detection
- **Personality System**: Nova, Athena, Aria, Zeus personalities
- **Knowledge Base**: Store and retrieve custom knowledge
- **Chat Interface**: Full conversation history with persistence

### Enterprise Features
- **Authentication**: Secure registration, login, sessions
- **Tier-Based Access**: Free, Basic, Pro, Enterprise tiers
- **Usage Limits**: Track chat, image generation, web search limits
- **Audit Logging**: Complete activity history
- **Admin Dashboard**: User management, tier limits, feature flags

### Advanced Modules
- 🎙️ Voice Interface
- 📝 Note Taking
- ✓ Task Management
- 📅 Calendar
- 💾 Password Vault
- 🔌 Plugin System
- 🤖 Automation
- 🎨 Image Generation
- 📊 Data Visualization
- ⚙️ Settings & Integrations

---

## 🛠️ Configuration Guide

### Adding AI Provider API Keys

1. **Go to Settings** → **AI Providers**
2. **Add New Provider**:
   - Select provider (OpenAI, Claude, etc.)
   - Paste your API key
   - Optional: Custom base URL
   - Mark as default

### Alternative: Global API Keys (Admin Only)
```bash
# Via API (requires admin token)
curl -X POST http://localhost:3000/api/admin/api-keys \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "apiKey": "sk-...",
    "isActive": true,
    "minTier": "free"
  }'
```

### Database Management

**Reset Database** (⚠️ Deletes all data):
```bash
bun run db:reset
```

**Create Migration**:
```bash
bun run db:migrate
```

**Regenerate Prisma Client**:
```bash
bun run db:generate
```

**View Database**:
```bash
# Using Prisma Studio
npx prisma studio
```

---

## 🔍 Project Structure

```
/vercel/share/v0-project/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/ → User signup
│   │   │   │   ├── login/    → User login
│   │   │   │   └── logout/   → Session cleanup
│   │   │   ├── chat/         → Main AI endpoint
│   │   │   ├── admin/        → Admin endpoints
│   │   │   └── ...
│   │   ├── page.tsx          → Main app
│   │   └── layout.tsx        → Root layout
│   ├── lib/
│   │   ├── auth.ts           → Auth utilities & security
│   │   ├── db.ts             → Prisma client config
│   │   ├── reasoning-engine.ts → AI reasoning logic
│   │   ├── ai-providers.ts   → Provider configs
│   │   ├── nova-store.ts     → Zustand state
│   │   └── auth-context.tsx  → React auth provider
│   └── components/nova/      → 18+ UI components
├── prisma/
│   └── schema.prisma         → Database schema (29 models)
├── dev.db                    → SQLite database
├── .env                      → Environment variables
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

---

## 📊 Database Models

### User Management
- **User** - Core user data
- **Session** - Active sessions
- **UserApiKey** - User's stored API keys
- **GlobalApiKey** - System-wide API keys
- **AuditLog** - Activity history

### AI & Conversations
- **Conversation** - Chat threads
- **Message** - Individual messages
- **KnowledgeEntry** - Custom knowledge base
- **AIRule** - AI behavior rules
- **AIActionApproval** - Action approval queue

### Tier & Usage
- **TierLimit** - Tier configurations
- **UsageRecord** - Usage tracking
- **FeatureFlag** - Feature toggles

### System
- **Plugin** - Installed plugins
- **Automation** - Auto-rules
- **IntegrationSource** - External integrations
- **Task** - Todo items
- **Note** - User notes
- **PasswordEntry** - Encrypted passwords

---

## 🔐 Security Notes

### ✅ Implemented
- Password hashing with scrypt (salted)
- Session management with token expiry
- Timing-safe comparison functions
- Audit logging for all actions
- Role-based access control
- IP address tracking
- Rate limiting framework

### ⚠️ Before Production
1. Enable HTTPS only
2. Set secure cookie flags
3. Implement CORS policy
4. Add request rate limiting middleware
5. Enable database encryption
6. Set up monitoring/alerting
7. Regular security audits
8. Backup strategy

---

## 🐛 Known Issues & Fixes

### Issue 1: WebSocket Example Error
**Status**: Non-critical (example code)
**Location**: `my-project/examples/websocket/frontend.tsx:45`
**Fix**: Already documented in AUDIT_REPORT.md

### Issue 2: ESLint Warnings
**Status**: Non-critical (legacy files)
**Count**: 21 warnings
**Fix**: Ignore or update legacy example scripts

### Issue 3: Thinking Templates
**Status**: Low priority
**Location**: `src/app/api/chat/route.ts:7`
**Improvement**: Generate from actual reasoning steps

---

## 📈 Performance Tips

1. **Enable Production Mode**:
   ```bash
   NODE_ENV=production bun run build
   bun run start
   ```

2. **Database Optimization**:
   - Add indexes on frequently queried fields
   - Archive old conversations
   - Set data retention policy

3. **Caching**:
   - Cache knowledge entries (15 min)
   - Cache tier limits (1 hour)
   - Implement request deduplication

4. **Monitoring**:
   - Track API response times
   - Monitor database performance
   - Alert on error rates

---

## 🧪 Testing the API

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPassword123!"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Test Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "personality": "nova"
  }'
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Review AUDIT_REPORT.md
- [ ] Set strong DATABASE_URL
- [ ] Configure all required env vars
- [ ] Set up AI provider credentials
- [ ] Enable HTTPS
- [ ] Set up backups
- [ ] Configure monitoring
- [ ] Run security audit

### During Deployment
- [ ] Run `bun run build`
- [ ] Verify build completes
- [ ] Test all auth flows
- [ ] Test chat functionality
- [ ] Monitor error logs
- [ ] Check performance

### Post-Deployment
- [ ] Monitor usage metrics
- [ ] Check error logs daily
- [ ] Verify backups are working
- [ ] Set up alerting

---

## 📞 Troubleshooting

### Server Won't Start
```bash
# Check port 3000
lsof -i :3000

# Check .env file
cat .env

# Check database
ls -la dev.db
```

### Database Errors
```bash
# Reset database
bun run db:reset

# Generate client
bun run db:generate

# Check schema
npx prisma validate
```

### Auth Issues
- Clear browser cookies
- Check session table: `bun run db:execute "SELECT * FROM Session;"`
- Verify password hashing: Check hash format `scrypt:hex:hex`

### Chat Not Working
- Check AI provider credentials
- Verify authentication token
- Check chat API logs
- Test with fallback reasoning engine

---

## 📚 Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Docs**: https://react.dev

---

## 🎯 Next Steps

1. **Customize Branding**:
   - Update colors in `src/app/layout.tsx`
   - Add logo to `public/`
   - Update metadata

2. **Add AI Providers**:
   - Set up OpenAI API key
   - Configure in settings
   - Test chat functionality

3. **Extend Knowledge Base**:
   - Add custom knowledge entries
   - Train AI on your data
   - Set up RAG system

4. **Deploy to Production**:
   - Set up Vercel project
   - Configure environment variables
   - Deploy: `git push`

---

**Setup Date**: 5/27/2026  
**Status**: ✅ Ready for Development  
**Next Review**: After first production deployment

For detailed technical information, see **AUDIT_REPORT.md**
