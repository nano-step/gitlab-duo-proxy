import type { Response } from 'express'

function generateId(): string {
  return `chatcmpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

interface OpenAIChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string }
    finish_reason: string | null
  }>
}

export async function streamToOpenAISSE(
  res: Response,
  stream: Awaited<ReturnType<typeof import('ai').streamText>>,
  model: string,
): Promise<{ outputTokens: number }> {
  const id = generateId()
  const created = Math.floor(Date.now() / 1000)
  let outputTokens = 0

  const writeChunk = (chunk: OpenAIChunk): void => {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`)
  }

  writeChunk({
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
  })

  for await (const text of stream.textStream) {
    outputTokens += Math.ceil(text.length / 4)
    writeChunk({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
    })
  }

  writeChunk({
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  })

  res.write('data: [DONE]\n\n')
  res.end()

  return { outputTokens }
}

export interface OpenAICompletion {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message: { role: 'assistant'; content: string }
    finish_reason: 'stop'
  }>
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export async function generateOpenAIResponse(
  stream: Awaited<ReturnType<typeof import('ai').streamText>>,
  model: string,
): Promise<OpenAICompletion> {
  let content = ''
  for await (const text of stream.textStream) {
    content += text
  }

  const completionTokens = Math.ceil(content.length / 4)

  return {
    id: generateId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 0,
      completion_tokens: completionTokens,
      total_tokens: completionTokens,
    },
  }
}
