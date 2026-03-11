export interface RequestRecord {
  id: string
  timestamp: number
  model: string
  endpoint: 'messages' | 'chat-completions'
  status: 'success' | 'error'
  latencyMs: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  errorMessage?: string
  clientIp: string
  stream: boolean
}

interface ModelStats {
  totalRequests: number
  successCount: number
  errorCount: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  avgLatencyMs: number
  latencySum: number
}

interface HourBucket {
  requests: number
  tokens: number
}

export interface UsageSnapshot {
  uptime: number
  startedAt: string
  totalRequests: number
  successCount: number
  errorCount: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  avgLatencyMs: number
  models: Record<string, ModelStats>
  requestsByHour: Record<string, HourBucket>
  requestsByDay: Record<string, HourBucket>
  recentRequests: RequestRecord[]
}

const startedAt = Date.now()
const records: RequestRecord[] = []
const modelStats = new Map<string, ModelStats>()
const hourBuckets = new Map<string, HourBucket>()
const dayBuckets = new Map<string, HourBucket>()

const MAX_RECENT = 100

function hourKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:00`
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function recordRequest(record: RequestRecord): void {
  records.push(record)
  if (records.length > MAX_RECENT * 10) {
    records.splice(0, records.length - MAX_RECENT * 10)
  }

  const ms = modelStats.get(record.model) ?? {
    totalRequests: 0, successCount: 0, errorCount: 0,
    totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0,
    avgLatencyMs: 0, latencySum: 0,
  }
  ms.totalRequests++
  if (record.status === 'success') ms.successCount++
  else ms.errorCount++
  ms.totalInputTokens += record.inputTokens
  ms.totalOutputTokens += record.outputTokens
  ms.totalTokens += record.totalTokens
  ms.latencySum += record.latencyMs
  ms.avgLatencyMs = Math.round(ms.latencySum / ms.totalRequests)
  modelStats.set(record.model, ms)

  const hk = hourKey(record.timestamp)
  const hb = hourBuckets.get(hk) ?? { requests: 0, tokens: 0 }
  hb.requests++
  hb.tokens += record.totalTokens
  hourBuckets.set(hk, hb)

  const dk = dayKey(record.timestamp)
  const db = dayBuckets.get(dk) ?? { requests: 0, tokens: 0 }
  db.requests++
  db.tokens += record.totalTokens
  dayBuckets.set(dk, db)
}

export function getSnapshot(): UsageSnapshot {
  let totalRequests = 0, successCount = 0, errorCount = 0
  let totalInputTokens = 0, totalOutputTokens = 0, totalTokens = 0
  let latencySum = 0

  const modelsObj: Record<string, ModelStats> = {}
  for (const [model, ms] of modelStats) {
    modelsObj[model] = { ...ms }
    totalRequests += ms.totalRequests
    successCount += ms.successCount
    errorCount += ms.errorCount
    totalInputTokens += ms.totalInputTokens
    totalOutputTokens += ms.totalOutputTokens
    totalTokens += ms.totalTokens
    latencySum += ms.latencySum
  }

  const hourObj: Record<string, HourBucket> = {}
  for (const [k, v] of hourBuckets) hourObj[k] = { ...v }

  const dayObj: Record<string, HourBucket> = {}
  for (const [k, v] of dayBuckets) dayObj[k] = { ...v }

  return {
    uptime: Math.round((Date.now() - startedAt) / 1000),
    startedAt: new Date(startedAt).toISOString(),
    totalRequests,
    successCount,
    errorCount,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    avgLatencyMs: totalRequests > 0 ? Math.round(latencySum / totalRequests) : 0,
    models: modelsObj,
    requestsByHour: hourObj,
    requestsByDay: dayObj,
    recentRequests: records.slice(-MAX_RECENT).reverse(),
  }
}
