// All GitLab Duo models from gitlab-ai-provider v5.0.0
// Format: duo-chat-* → Anthropic/OpenAI backend
export const DUO_MODELS: Record<string, { provider: string, model: string }> = {
  // Anthropic models
  'duo-chat-opus-4-6': { provider: 'anthropic', model: 'claude-opus-4-6' },
  'duo-chat-sonnet-4-6': { provider: 'anthropic', model: 'claude-sonnet-4-6' },
  'duo-chat-opus-4-5': { provider: 'anthropic', model: 'claude-opus-4-5-20251101' },
  'duo-chat-sonnet-4-5': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  'duo-chat-haiku-4-5': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  // OpenAI models
  'duo-chat-gpt-5-1': { provider: 'openai', model: 'gpt-5.1-2025-11-13' },
  'duo-chat-gpt-5-2': { provider: 'openai', model: 'gpt-5.2-2025-12-11' },
  'duo-chat-gpt-5-mini': { provider: 'openai', model: 'gpt-5-mini-2025-08-07' },
  'duo-chat-gpt-5-codex': { provider: 'openai', model: 'gpt-5-codex' },
  'duo-chat-gpt-5-2-codex': { provider: 'openai', model: 'gpt-5.2-codex' },
  'duo-chat-gpt-5-3-codex': { provider: 'openai', model: 'gpt-5.3-codex' },
}

// Map common model names → duo-chat model IDs
// Accepts: Anthropic names, OpenAI names, short aliases, and duo-chat names (passthrough)
const ALIAS_MAP: Record<string, string> = {
  // Anthropic aliases
  'claude-opus-4-6': 'duo-chat-opus-4-6',
  'claude-opus-4.6': 'duo-chat-opus-4-6',
  'opus-4-6': 'duo-chat-opus-4-6',
  'opus': 'duo-chat-opus-4-6',
  'claude-sonnet-4-6': 'duo-chat-sonnet-4-6',
  'claude-sonnet-4.6': 'duo-chat-sonnet-4-6',
  'sonnet-4-6': 'duo-chat-sonnet-4-6',
  'claude-opus-4-5': 'duo-chat-opus-4-5',
  'claude-opus-4.5': 'duo-chat-opus-4-5',
  'opus-4-5': 'duo-chat-opus-4-5',
  'claude-sonnet-4-5': 'duo-chat-sonnet-4-5',
  'claude-sonnet-4.5': 'duo-chat-sonnet-4-5',
  'sonnet-4-5': 'duo-chat-sonnet-4-5',
  'sonnet': 'duo-chat-sonnet-4-5',
  'claude-haiku-4-5': 'duo-chat-haiku-4-5',
  'claude-haiku-4.5': 'duo-chat-haiku-4-5',
  'haiku-4-5': 'duo-chat-haiku-4-5',
  'haiku': 'duo-chat-haiku-4-5',
  // Exact Anthropic model IDs (sent by Claude Code / Shannon)
  'claude-haiku-4-5-20251001': 'duo-chat-haiku-4-5',
  'claude-sonnet-4-5-20250929': 'duo-chat-sonnet-4-5',
  'claude-opus-4-5-20251101': 'duo-chat-opus-4-5',
  'claude-sonnet-4-20250514': 'duo-chat-sonnet-4-6',
  'claude-opus-4-20250512': 'duo-chat-opus-4-6',
  // OpenAI aliases
  'gpt-5.1': 'duo-chat-gpt-5-1',
  'gpt-5-1': 'duo-chat-gpt-5-1',
  'gpt-5.2': 'duo-chat-gpt-5-2',
  'gpt-5-2': 'duo-chat-gpt-5-2',
  'gpt-5-mini': 'duo-chat-gpt-5-mini',
  'gpt-5.2-codex': 'duo-chat-gpt-5-2-codex',
  'gpt-5-2-codex': 'duo-chat-gpt-5-2-codex',
  'gpt-5-codex': 'duo-chat-gpt-5-codex',
  'gpt-5.3-codex': 'duo-chat-gpt-5-3-codex',
  'gpt-5-3-codex': 'duo-chat-gpt-5-3-codex',
  'codex': 'duo-chat-gpt-5-2-codex',
}

export function mapModel(input: string): string {
  // Direct duo-chat name → passthrough
  if (input.startsWith('duo-chat-')) return input
  // Alias lookup
  return ALIAS_MAP[input] || input
}

export function getAvailableModels(): string[] {
  return Object.keys(DUO_MODELS)
}

export function getAliases(): string[] {
  return Object.keys(ALIAS_MAP)
}
