type LogLevel = 'info' | 'warn' | 'error'

function formatMessage(level: LogLevel, tag: string, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString()
  const base = `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}`
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`
  }
  return base
}

export const logger = {
  info(tag: string, message: string, meta?: Record<string, unknown>) {
    console.log(formatMessage('info', tag, message, meta))
  },
  warn(tag: string, message: string, meta?: Record<string, unknown>) {
    console.warn(formatMessage('warn', tag, message, meta))
  },
  error(tag: string, message: string, meta?: Record<string, unknown>) {
    console.error(formatMessage('error', tag, message, meta))
  },
}
