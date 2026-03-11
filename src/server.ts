import express from 'express'
import { createGitLab } from 'gitlab-ai-provider'
import { streamText } from 'ai'
import { mapModel, getAvailableModels, getAliases, DUO_MODELS } from './models.js'
import { translateMessages, extractSystem, type AnthropicRequest } from './translate.js'
import { streamToAnthropicSSE, generateAnthropicResponse } from './stream.js'
import { translateOpenAIRequest, type OpenAIRequest } from './openai-translate.js'
import { streamToOpenAISSE, generateOpenAIResponse } from './openai-stream.js'
import { recordRequest, getSnapshot, type RequestRecord } from './usage.js'
import { dashboardHTML } from './dashboard.js'

const app = express()
app.use(express.json({ limit: '50mb' }))

const PORT = parseInt(process.env.PORT || '3456', 10)
const HOST = process.env.HOST || '0.0.0.0'
const GITLAB_INSTANCE_URL = process.env.GITLAB_INSTANCE_URL || 'https://gitlab.com'
const PROXY_API_KEY = process.env.PROXY_API_KEY

function log(message: string): void {
  const timestamp = new Date().toISOString()
  process.stdout.write(`[${timestamp}] ${message}\n`)
}

function extractClientKey(req: express.Request): string | undefined {
  const apiKey = req.headers['x-api-key']
  if (typeof apiKey === 'string') return apiKey

  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)

  return undefined
}

function requireProxyAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!PROXY_API_KEY) {
    next()
    return
  }

  const clientKey = extractClientKey(req)
  if (clientKey === PROXY_API_KEY) {
    next()
    return
  }

  log(`Auth rejected from ${req.ip} — invalid or missing proxy key`)
  res.status(401).json({
    type: 'error',
    error: { type: 'authentication_error', message: 'Invalid or missing proxy API key' },
  })
}

function getGitLabToken(): string | undefined {
  return process.env.GITLAB_TOKEN
}

function sendError(res: express.Response, status: number, message: string): void {
  res.status(status).json({
    type: 'error',
    error: { type: 'api_error', message },
  })
}

function trackRequest(
  req: express.Request,
  endpoint: RequestRecord['endpoint'],
  model: string,
  stream: boolean,
  startTime: number,
  result: { inputTokens?: number; outputTokens?: number; error?: string },
): void {
  const latencyMs = Date.now() - startTime
  const outputTokens = result.outputTokens ?? 0
  const inputTokens = result.inputTokens ?? 0
  recordRequest({
    id: `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    model,
    endpoint,
    status: result.error ? 'error' : 'success',
    latencyMs,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    errorMessage: result.error,
    clientIp: req.ip ?? 'unknown',
    stream,
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

app.post('/v1/messages', requireProxyAuth, async (req, res) => {
  const token = getGitLabToken()
  if (!token) {
    sendError(res, 401, 'Missing GITLAB_TOKEN in server configuration')
    return
  }

  const body = req.body as AnthropicRequest
  if (!body.messages || !Array.isArray(body.messages)) {
    sendError(res, 400, 'Invalid request: messages array required')
    return
  }

  const requestedModel = body.model || 'claude-sonnet-4-5'
  const duoModel = mapModel(requestedModel)
  const startTime = Date.now()

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

    if (body.stream === false) {
      const response = await generateAnthropicResponse(result, requestedModel) as { usage?: { output_tokens?: number } }
      const outputTokens = (response.usage?.output_tokens) ?? 0
      trackRequest(req, 'messages', duoModel, false, startTime, { outputTokens })
      res.json(response)
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    await streamToAnthropicSSE(res, result, requestedModel)
    trackRequest(req, 'messages', duoModel, true, startTime, { outputTokens: 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log(`Error: ${message}`)
    trackRequest(req, 'messages', duoModel, body.stream !== false, startTime, { error: message })
    if (!res.headersSent) {
      sendError(res, 500, message)
    }
  }
})

app.post('/v1/chat/completions', requireProxyAuth, async (req, res) => {
  const token = getGitLabToken()
  if (!token) {
    res.status(401).json({ error: { message: 'Missing GITLAB_TOKEN in server configuration', type: 'invalid_request_error' } })
    return
  }

  const body = req.body as OpenAIRequest
  if (!body.messages || !Array.isArray(body.messages)) {
    res.status(400).json({ error: { message: 'messages array required', type: 'invalid_request_error' } })
    return
  }

  const requestedModel = body.model || 'sonnet'
  const duoModel = mapModel(requestedModel)
  const startTime = Date.now()

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
      trackRequest(req, 'chat-completions', duoModel, false, startTime, {
        outputTokens: completion.usage.completion_tokens,
      })
      res.json(completion)
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const streamResult = await streamToOpenAISSE(res, result, requestedModel)
    trackRequest(req, 'chat-completions', duoModel, true, startTime, {
      outputTokens: streamResult.outputTokens,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log(`Error: ${message}`)
    trackRequest(req, 'chat-completions', duoModel, body.stream !== false, startTime, { error: message })
    if (!res.headersSent) {
      res.status(500).json({ error: { message, type: 'api_error' } })
    }
  }
})

app.get('/dashboard/api/stats', (_req, res) => {
  res.json(getSnapshot())
})

app.get('/dashboard/api/models', (_req, res) => {
  const models = Object.entries(DUO_MODELS).map(([id, info]) => ({
    id,
    provider: info.provider,
    backendModel: info.model,
    stats: getSnapshot().models[id] ?? null,
  }))
  res.json({ models, aliases: getAliases() })
})

app.get('/dashboard', (_req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(dashboardHTML)
})

app.listen(PORT, HOST, () => {
  log(`GitLab Duo Proxy listening on http://${HOST}:${PORT}`)
  log(`Proxy auth: ${PROXY_API_KEY ? 'ENABLED' : 'DISABLED (no PROXY_API_KEY set)'}`)
  log(`Available models: ${getAvailableModels().join(', ')}`)
})
