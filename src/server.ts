import express from 'express'
import { createGitLab } from 'gitlab-ai-provider'
import { streamText } from 'ai'
import { mapModel, getAvailableModels, getAliases, DUO_MODELS } from './models.js'
import { translateMessages, extractSystem, type AnthropicRequest } from './translate.js'
import { streamToAnthropicSSE } from './stream.js'
import { translateOpenAIRequest, type OpenAIRequest } from './openai-translate.js'
import { streamToOpenAISSE, generateOpenAIResponse } from './openai-stream.js'

const app = express()
app.use(express.json({ limit: '50mb' }))

const PORT = parseInt(process.env.PORT || '3456', 10)
const HOST = process.env.HOST || '0.0.0.0'
const GITLAB_INSTANCE_URL = process.env.GITLAB_INSTANCE_URL || 'https://gitlab.com'

function log(message: string): void {
  const timestamp = new Date().toISOString()
  process.stdout.write(`[${timestamp}] ${message}\n`)
}

function extractToken(req: express.Request): string | undefined {
  const apiKey = req.headers['x-api-key']
  if (typeof apiKey === 'string') return apiKey

  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)

  return process.env.GITLAB_TOKEN
}

function sendError(res: express.Response, status: number, message: string): void {
  res.status(status).json({
    type: 'error',
    error: { type: 'api_error', message },
  })
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/v1/models', (_req, res) => {
  const models = Object.entries(DUO_MODELS).map(([id, info]) => ({
    id,
    provider: info.provider,
    backend_model: info.model,
  }))
  res.json({ models, aliases: getAliases() })
})

app.post('/v1/messages', async (req, res) => {
  const token = extractToken(req)
  if (!token) {
    sendError(res, 401, 'Missing GitLab token')
    return
  }

  const body = req.body as AnthropicRequest
  if (!body.messages || !Array.isArray(body.messages)) {
    sendError(res, 400, 'Invalid request: messages array required')
    return
  }

  const requestedModel = body.model || 'claude-sonnet-4-5'
  const duoModel = mapModel(requestedModel)

  try {
    const gitlab = createGitLab({ apiKey: token, instanceUrl: GITLAB_INSTANCE_URL })
    const messages = translateMessages(body.messages)

    const result = streamText({
      model: gitlab(duoModel),
      messages,
      system: extractSystem(body.system),
      maxOutputTokens: body.max_tokens,
      temperature: body.temperature,
    })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    await streamToAnthropicSSE(res, result, requestedModel)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log(`Error: ${message}`)
    if (!res.headersSent) {
      sendError(res, 500, message)
    }
  }
})

app.post('/v1/chat/completions', async (req, res) => {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: { message: 'Missing GitLab token', type: 'invalid_request_error' } })
    return
  }

  const body = req.body as OpenAIRequest
  if (!body.messages || !Array.isArray(body.messages)) {
    res.status(400).json({ error: { message: 'messages array required', type: 'invalid_request_error' } })
    return
  }

  const requestedModel = body.model || 'sonnet'
  const duoModel = mapModel(requestedModel)

  try {
    const gitlab = createGitLab({ apiKey: token, instanceUrl: GITLAB_INSTANCE_URL })
    const { system, messages } = translateOpenAIRequest(body)

    const result = streamText({
      model: gitlab(duoModel),
      messages,
      system,
      maxOutputTokens: body.max_tokens,
      temperature: body.temperature,
    })

    if (body.stream === false) {
      const completion = await generateOpenAIResponse(result, requestedModel)
      res.json(completion)
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    await streamToOpenAISSE(res, result, requestedModel)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log(`Error: ${message}`)
    if (!res.headersSent) {
      res.status(500).json({ error: { message, type: 'api_error' } })
    }
  }
})

app.listen(PORT, HOST, () => {
  log(`GitLab Duo Proxy listening on http://${HOST}:${PORT}`)
  log(`Available models: ${getAvailableModels().join(', ')}`)
})
