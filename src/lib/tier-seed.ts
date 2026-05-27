import { db } from '@/lib/db'

export const TIER_DEFINITIONS = [
  {
    tier: 'free',
    maxChatsPerDay: 50,
    maxImageGenPerDay: 5,
    maxWebSearchPerDay: 10,
    maxCodeExecPerDay: 10,
    maxStorageMB: 100,
    maxPlugins: 3,
    maxKnowledgeBase: 50,
    canUseGlobalAPIs: false,
    canCreatePlugins: false,
    canAccessAdmin: false,
    priority: 0,
  },
  {
    tier: 'basic',
    maxChatsPerDay: 200,
    maxImageGenPerDay: 20,
    maxWebSearchPerDay: 50,
    maxCodeExecPerDay: 30,
    maxStorageMB: 1024,
    maxPlugins: 10,
    maxKnowledgeBase: 500,
    canUseGlobalAPIs: false,
    canCreatePlugins: false,
    canAccessAdmin: false,
    priority: 1,
  },
  {
    tier: 'pro',
    maxChatsPerDay: 1000,
    maxImageGenPerDay: 100,
    maxWebSearchPerDay: 200,
    maxCodeExecPerDay: 100,
    maxStorageMB: 10240,
    maxPlugins: 25,
    maxKnowledgeBase: 2000,
    canUseGlobalAPIs: true,
    canCreatePlugins: false,
    canAccessAdmin: false,
    priority: 2,
  },
  {
    tier: 'enterprise',
    maxChatsPerDay: -1, // unlimited
    maxImageGenPerDay: -1,
    maxWebSearchPerDay: -1,
    maxCodeExecPerDay: -1,
    maxStorageMB: 51200,
    maxPlugins: -1,
    maxKnowledgeBase: -1,
    canUseGlobalAPIs: true,
    canCreatePlugins: true,
    canAccessAdmin: false,
    priority: 3,
  },
  {
    tier: 'unlimited',
    maxChatsPerDay: -1,
    maxImageGenPerDay: -1,
    maxWebSearchPerDay: -1,
    maxCodeExecPerDay: -1,
    maxStorageMB: -1,
    maxPlugins: -1,
    maxKnowledgeBase: -1,
    canUseGlobalAPIs: true,
    canCreatePlugins: true,
    canAccessAdmin: true,
    priority: 4,
  },
]

/**
 * Seed tier limits into the database.
 * Uses upsert to avoid conflicts on re-seed.
 */
export async function seedTierLimits() {
  for (const tierDef of TIER_DEFINITIONS) {
    await db.tierLimit.upsert({
      where: { tier: tierDef.tier },
      update: tierDef,
      create: tierDef,
    })
  }
}

/**
 * Get tier display info for UI.
 */
export function getTierInfo(tier: string) {
  const info: Record<string, { name: string; price: string; description: string; color: string }> = {
    free: {
      name: 'Free',
      price: '$0',
      description: 'Get started with NOVA basics',
      color: '#6b7280',
    },
    basic: {
      name: 'Basic',
      price: '$9.99/mo',
      description: 'Enhanced productivity for individuals',
      color: '#3b82f6',
    },
    pro: {
      name: 'Pro',
      price: '$24.99/mo',
      description: 'Professional power user features',
      color: '#8b5cf6',
    },
    enterprise: {
      name: 'Enterprise',
      price: '$99.99/mo',
      description: 'Unlimited for teams & organizations',
      color: '#f59e0b',
    },
    unlimited: {
      name: 'Unlimited',
      price: 'Admin Only',
      description: 'Full system access & administration',
      color: '#d4a574',
    },
  }
  return info[tier] || info.free
}
