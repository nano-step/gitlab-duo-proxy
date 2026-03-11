import type { ModelMessage } from 'ai'

interface AnthropicContentBlock {
  type: 'text'
  text: string
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

export interface AnthropicRequest {
  model: string
  messages: AnthropicMessage[]
  system?: string | AnthropicContentBlock[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
}

export function extractSystem(system: string | AnthropicContentBlock[] | undefined): string | undefined {
  if (!system) return undefined
  if (typeof system === 'string') return system
  if (Array.isArray(system)) {
    return system
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n\n')
  }
  return undefined
}

function extractText(content: string | AnthropicContentBlock[]): string {
  if (typeof content === 'string') {
    return content
  }
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

export function translateMessages(messages: AnthropicMessage[]): ModelMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: extractText(msg.content),
  }))
}
