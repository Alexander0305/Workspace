/**
 * NOVA Feature Flags Seed Data
 *
 * Comprehensive list of all NOVA features — both existing and planned.
 * Used to populate the database on first run or when flags are missing.
 */

export interface FeatureFlagSeed {
  key: string
  name: string
  description: string
  category: string
  enabled: boolean
  configurable: boolean
  requiresRestart: boolean
  sortOrder: number
}

export const FEATURE_FLAGS_SEED: FeatureFlagSeed[] = [
  // ── AI & Reasoning ──────────────────────────────
  { key: 'ai.chat', name: 'AI Chat', description: 'Enable AI-powered chat responses', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 1 },
  { key: 'ai.reasoning', name: 'Reasoning Engine', description: 'Enable multi-step reasoning with deductive, inductive, abductive, and analogical patterns', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 2 },
  { key: 'ai.deep_reasoning', name: 'Deep Reasoning', description: 'Enable deep multi-path reasoning mode for complex queries', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 3 },
  { key: 'ai.adaptive_learning', name: 'Adaptive Learning', description: 'Learn from user behavior patterns and preferences', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 4 },
  { key: 'ai.smart_suggestions', name: 'Smart Suggestions', description: 'AI-generated suggestions based on usage patterns', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 5 },
  { key: 'ai.auto_learn', name: 'Auto-Learn from Chat', description: 'Extract and save knowledge from conversations automatically', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 6 },
  { key: 'ai.confidence_scores', name: 'Confidence Scores', description: 'Display confidence badges on AI responses', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 7 },
  { key: 'ai.llm_training', name: 'LLM Training', description: 'Local language model training and vocabulary building', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 8 },
  { key: 'ai.knowledge_rag', name: 'Knowledge RAG', description: 'Retrieval Augmented Generation using knowledge base', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 9 },
  { key: 'ai.sentiment_analysis', name: 'Sentiment Analysis', description: 'Analyze sentiment and emotion in user messages', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 10 },
  { key: 'ai.summarization', name: 'Text Summarization', description: 'AI-powered text and document summarization', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 11 },
  { key: 'ai.translation', name: 'Language Translation', description: 'Translate text between languages using AI', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 12 },
  { key: 'ai.code_generation', name: 'Code Generation', description: 'AI-powered code generation and assistance', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 13 },
  { key: 'ai.image_understanding', name: 'Image Understanding', description: 'Analyze and describe images with AI vision', category: 'AI & Reasoning', enabled: true, configurable: true, requiresRestart: false, sortOrder: 14 },

  // ── Voice & Audio ──────────────────────────────
  { key: 'voice.recognition', name: 'Voice Recognition', description: 'Offline speech-to-text using Web Speech API', category: 'Voice & Audio', enabled: true, configurable: true, requiresRestart: false, sortOrder: 20 },
  { key: 'voice.tts', name: 'Text-to-Speech', description: 'Convert AI responses to speech', category: 'Voice & Audio', enabled: true, configurable: true, requiresRestart: false, sortOrder: 21 },
  { key: 'voice.wake_word', name: 'Wake Word Detection', description: 'Listen for wake word to activate NOVA', category: 'Voice & Audio', enabled: false, configurable: true, requiresRestart: false, sortOrder: 22 },
  { key: 'voice.noise_cancellation', name: 'Noise Cancellation', description: 'Filter background noise during voice input', category: 'Voice & Audio', enabled: false, configurable: true, requiresRestart: false, sortOrder: 23 },

  // ── Productivity ──────────────────────────────
  { key: 'productivity.tasks', name: 'Task Manager', description: 'Create, manage, and track tasks', category: 'Productivity', enabled: true, configurable: true, requiresRestart: false, sortOrder: 30 },
  { key: 'productivity.calendar', name: 'Calendar', description: 'Schedule and manage events', category: 'Productivity', enabled: true, configurable: true, requiresRestart: false, sortOrder: 31 },
  { key: 'productivity.notes', name: 'Notes', description: 'Create and organize notes', category: 'Productivity', enabled: true, configurable: true, requiresRestart: false, sortOrder: 32 },
  { key: 'productivity.focus_timer', name: 'Focus Timer', description: 'Pomodoro-style focus sessions with ambient noise', category: 'Productivity', enabled: true, configurable: true, requiresRestart: false, sortOrder: 33 },
  { key: 'productivity.automations', name: 'Workflow Automations', description: 'Create automated workflows with triggers and actions', category: 'Productivity', enabled: true, configurable: true, requiresRestart: false, sortOrder: 34 },
  { key: 'productivity.knowledge_base', name: 'Knowledge Base', description: 'Personal knowledge management system', category: 'Productivity', enabled: true, configurable: true, requiresRestart: false, sortOrder: 35 },
  { key: 'productivity.command_palette', name: 'Command Palette', description: 'Quick access to all features via keyboard shortcut', category: 'Productivity', enabled: true, configurable: true, requiresRestart: false, sortOrder: 36 },

  // ── Finance & Trading ──────────────────────────
  { key: 'finance.banking', name: 'Banking Portal', description: 'Manage bank accounts and transactions', category: 'Finance & Trading', enabled: true, configurable: true, requiresRestart: false, sortOrder: 40 },
  { key: 'finance.crypto', name: 'Crypto Portfolio', description: 'Track cryptocurrency holdings and prices', category: 'Finance & Trading', enabled: true, configurable: true, requiresRestart: false, sortOrder: 41 },
  { key: 'finance.trading', name: 'Trading Dashboard', description: 'Monitor active trades and P&L', category: 'Finance & Trading', enabled: true, configurable: true, requiresRestart: false, sortOrder: 42 },
  { key: 'finance.crypto_api', name: 'Live Crypto Prices', description: 'Fetch real-time cryptocurrency prices from web', category: 'Finance & Trading', enabled: true, configurable: true, requiresRestart: false, sortOrder: 43 },
  { key: 'finance.currency_converter', name: 'Currency Converter', description: 'Convert between currencies with live rates', category: 'Finance & Trading', enabled: true, configurable: true, requiresRestart: false, sortOrder: 44 },

  // ── Social & Communication ────────────────────
  { key: 'social.twitter', name: 'Twitter/X Integration', description: 'Connect and manage Twitter/X account', category: 'Social & Communication', enabled: true, configurable: true, requiresRestart: false, sortOrder: 50 },
  { key: 'social.github', name: 'GitHub Integration', description: 'Connect and manage GitHub account', category: 'Social & Communication', enabled: true, configurable: true, requiresRestart: false, sortOrder: 51 },
  { key: 'social.linkedin', name: 'LinkedIn Integration', description: 'Connect and manage LinkedIn account', category: 'Social & Communication', enabled: true, configurable: true, requiresRestart: false, sortOrder: 52 },
  { key: 'social.slack', name: 'Slack Integration', description: 'Connect and manage Slack workspace', category: 'Social & Communication', enabled: true, configurable: true, requiresRestart: false, sortOrder: 53 },

  // ── Development ──────────────────────────────
  { key: 'dev.code_playground', name: 'Code Playground', description: 'Write and execute code in sandboxed environment', category: 'Development', enabled: true, configurable: true, requiresRestart: false, sortOrder: 60 },
  { key: 'dev.plugin_system', name: 'Plugin System', description: 'Install and manage plugins', category: 'Development', enabled: true, configurable: true, requiresRestart: false, sortOrder: 61 },
  { key: 'dev.api_generator', name: 'API Generator', description: 'Auto-generate API endpoints', category: 'Development', enabled: false, configurable: true, requiresRestart: false, sortOrder: 62 },
  { key: 'dev.css_customizer', name: 'CSS Customizer', description: 'Live CSS editing and theming', category: 'Development', enabled: true, configurable: true, requiresRestart: false, sortOrder: 63 },

  // ── Security & Privacy ────────────────────────
  { key: 'security.encryption', name: 'End-to-End Encryption', description: 'Encrypt all data at rest using AES-256-GCM', category: 'Security & Privacy', enabled: true, configurable: true, requiresRestart: false, sortOrder: 70 },
  { key: 'security.password_vault', name: 'Password Vault', description: 'Encrypted password management', category: 'Security & Privacy', enabled: true, configurable: true, requiresRestart: false, sortOrder: 71 },
  { key: 'security.backup_encryption', name: 'Backup Encryption', description: 'Encrypt backups with AES-256', category: 'Security & Privacy', enabled: true, configurable: true, requiresRestart: false, sortOrder: 72 },
  { key: 'security.two_factor', name: 'Two-Factor Authentication', description: 'Require 2FA for admin access', category: 'Security & Privacy', enabled: false, configurable: true, requiresRestart: false, sortOrder: 73 },
  { key: 'security.audit_logging', name: 'Audit Logging', description: 'Log all admin and security actions', category: 'Security & Privacy', enabled: true, configurable: true, requiresRestart: false, sortOrder: 74 },

  // ── System ──────────────────────────────────
  { key: 'system.auto_update', name: 'Auto Update Check', description: 'Automatically check for NOVA updates', category: 'System', enabled: true, configurable: true, requiresRestart: false, sortOrder: 80 },
  { key: 'system.cross_sync', name: 'Cross-Platform Sync', description: 'Sync data across devices', category: 'System', enabled: false, configurable: true, requiresRestart: true, sortOrder: 81 },
  { key: 'system.dark_mode', name: 'Dark Mode', description: 'Dark theme for the interface', category: 'System', enabled: true, configurable: true, requiresRestart: false, sortOrder: 82 },
  { key: 'system.debug_mode', name: 'Debug Mode', description: 'Show verbose logging and system internals', category: 'System', enabled: false, configurable: true, requiresRestart: false, sortOrder: 83 },
  { key: 'system.experimental', name: 'Experimental Features', description: 'Enable features that are still in development', category: 'System', enabled: false, configurable: true, requiresRestart: false, sortOrder: 84 },
  { key: 'system.onboarding', name: 'Onboarding Wizard', description: 'Show first-run onboarding experience', category: 'System', enabled: true, configurable: true, requiresRestart: false, sortOrder: 85 },

  // ── Personalities ──────────────────────────────
  { key: 'personality.nova', name: 'Nova Personality', description: 'Professional & precise personality', category: 'Personalities', enabled: true, configurable: true, requiresRestart: false, sortOrder: 90 },
  { key: 'personality.athena', name: 'Athena Personality', description: 'Wise & analytical personality', category: 'Personalities', enabled: true, configurable: true, requiresRestart: false, sortOrder: 91 },
  { key: 'personality.aria', name: 'Aria Personality', description: 'Creative & expressive personality', category: 'Personalities', enabled: true, configurable: true, requiresRestart: false, sortOrder: 92 },
  { key: 'personality.zeus', name: 'Zeus Personality', description: 'Assertive & decisive personality', category: 'Personalities', enabled: true, configurable: true, requiresRestart: false, sortOrder: 93 },

  // ── Advanced AI Features ──────────────────────
  { key: 'ai.agent_mode', name: 'Agent Mode', description: 'Allow AI to execute multi-step tasks autonomously', category: 'Advanced AI', enabled: false, configurable: true, requiresRestart: false, sortOrder: 100 },
  { key: 'ai.web_search', name: 'Web Search', description: 'Search the web for real-time information', category: 'Advanced AI', enabled: true, configurable: true, requiresRestart: false, sortOrder: 101 },
  { key: 'ai.image_generation', name: 'Image Generation', description: 'Generate images from text descriptions', category: 'Advanced AI', enabled: true, configurable: true, requiresRestart: false, sortOrder: 102 },
  { key: 'ai.memory', name: 'Persistent Memory', description: 'Remember context across conversations', category: 'Advanced AI', enabled: true, configurable: true, requiresRestart: false, sortOrder: 103 },
  { key: 'ai.self_reflection', name: 'Self-Reflection', description: 'AI can reflect on and improve its own responses', category: 'Advanced AI', enabled: false, configurable: true, requiresRestart: false, sortOrder: 104 },
  { key: 'ai.tool_use', name: 'Tool Use', description: 'Allow AI to use tools like calculator, file manager, etc.', category: 'Advanced AI', enabled: true, configurable: true, requiresRestart: false, sortOrder: 105 },
  { key: 'ai.prompt_templates', name: 'Prompt Templates', description: 'Pre-built prompt templates for common tasks', category: 'Advanced AI', enabled: true, configurable: true, requiresRestart: false, sortOrder: 106 },
]

/** Lookup map keyed by feature flag key */
export const FEATURE_FLAG_MAP = new Map(FEATURE_FLAGS_SEED.map(f => [f.key, f]))

/** All unique categories in sort-order */
export const FEATURE_CATEGORIES = [...new Set(FEATURE_FLAGS_SEED.map(f => f.category))]

/** Total count of seed flags */
export const FEATURE_FLAGS_COUNT = FEATURE_FLAGS_SEED.length
