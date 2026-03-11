import type { ModelMessage } from 'ai'

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
}

export interface OpenAITranslated {
  system?: string
  messages: ModelMessage[]
}

export function translateOpenAIRequest(req: OpenAIRequest): OpenAITranslated {
  const systemMessages = req.messages.filter((m) => m.role === 'system')
  const nonSystemMessages = req.messages.filter((m) => m.role !== 'system')

  const system = systemMessages.length > 0
    ? systemMessages.map((m) => m.content).join('\n\n')
    : undefined

  const messages: ModelMessage[] = nonSystemMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  return { system, messages }
}
