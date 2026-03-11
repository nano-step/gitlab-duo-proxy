import type { Response } from 'express'

interface MessageStart {
  type: 'message_start'
  message: {
    id: string
    type: 'message'
    role: 'assistant'
    content: []
    model: string
    stop_reason: null
    usage: { input_tokens: number; output_tokens: number }
  }
}

function generateId(): string {
  return `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function writeSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export async function generateAnthropicResponse(
  stream: Awaited<ReturnType<typeof import('ai').streamText>>,
  model: string,
): Promise<object> {
  const messageId = generateId()
  let fullText = ''
  let outputTokens = 0

  for await (const chunk of stream.textStream) {
    fullText += chunk
    outputTokens += Math.ceil(chunk.length / 4)
  }

  return {
    id: messageId,
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: fullText }],
    model,
    stop_reason: 'end_turn',
    usage: { input_tokens: 0, output_tokens: outputTokens },
  }
}

export async function streamToAnthropicSSE(
  res: Response,
  stream: Awaited<ReturnType<typeof import('ai').streamText>>,
  model: string,
): Promise<void> {
  const messageId = generateId()
  let outputTokens = 0

  // 1. message_start
  const messageStart: MessageStart = {
    type: 'message_start',
    message: {
      id: messageId,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      stop_reason: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  }
  writeSSE(res, 'message_start', messageStart)

  // 2. content_block_start
  writeSSE(res, 'content_block_start', {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  })

  // 3. Stream text deltas
  for await (const chunk of stream.textStream) {
    outputTokens += Math.ceil(chunk.length / 4)
    writeSSE(res, 'content_block_delta', {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: chunk },
    })
  }

  // 4. content_block_stop
  writeSSE(res, 'content_block_stop', {
    type: 'content_block_stop',
    index: 0,
  })

  // 5. message_delta
  writeSSE(res, 'message_delta', {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn' },
    usage: { output_tokens: outputTokens },
  })

  // 6. message_stop
  writeSSE(res, 'message_stop', { type: 'message_stop' })

  res.end()
}
