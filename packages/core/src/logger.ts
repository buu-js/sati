import { Context } from "hono"
import { getPath } from "hono/utils/url"
import pino from "pino"

export interface Logger {
  debug(message: string): void
  warn(message: string): void
  info(message: string): void
  error(error: Error, shouldLogStack?: boolean): void
  error(message: string, error?: unknown): void
  error(message: string): void
}

const baseLogger = pino({
  level: process.env.LOG_LEVEL || "info"
})

function resolveContext(context?: Context) {
  if (!context) return {}
  return {
    user: context.var.user?.name || "Anonymous",
    method: context.req.method,
    path: getPath(context.req.raw)
  }
}

function getPrefix(c?: Context): string {
  if (!c) return "System - "
  const binding = resolveContext(c)
  return `${binding.user} ${binding.method} - ${binding.path} - `
}

export function createLogger(ctx?: Context): Logger {
  const prefix = getPrefix(ctx)
  const logger = baseLogger.child(resolveContext(ctx))

  function error(arg1: unknown, arg2?: unknown): void {
    const isErr = arg1 instanceof Error
    const errorObj = isErr ? arg1 : arg2 instanceof Error ? arg2 : null
    const rawMessage = isErr ? arg1.message : String(arg1)
    const statusSuffix = (errorObj as any)?.status
      ? ` [${(errorObj as any).status}]`
      : ""
    const logText = `${prefix}${rawMessage}${statusSuffix}`
    const errPayload =
      arg2 === false && errorObj ? { ...errorObj, stack: undefined } : errorObj

    if (errPayload) {
      logger.error({ err: errPayload }, logText)
    } else {
      logger.error(logText)
    }
  }

  return {
    debug: (message: string) => logger.debug(`${prefix}${message}`),
    warn: (message: string) => logger.warn(`${prefix}${message}`),
    info: (message: string) => logger.info(`${prefix}${message}`),
    error
  }
}
