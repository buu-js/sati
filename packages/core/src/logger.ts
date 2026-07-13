import { Context } from "hono"
import { getPath } from "hono/utils/url"
import pino from "pino"

const baseLogger = pino({
  level: process.env.LOG_LEVEL || "info"
})

function resolveContext(context?: Context) {
  if (!context) return { scope: "system" }
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

export function createLogger(ctx?: Context) {
  const prefix = getPrefix(ctx)
  const logger = baseLogger.child(resolveContext(ctx))
  return {
    debug: (message: string) => logger.debug(`${prefix}${message}`),
    warn: (message: string) => logger.warn(`${prefix}${message}`),
    info: (message: string) => logger.info(`${prefix}${message}`),
    error: (o: unknown, stack = false) => {
      const error =
        o instanceof Error
          ? (o as Error)
          : { message: `${o}`, name: "Error", stack: "" }
      //@ts-expect-error ignore error.status
      const message = `${prefix}${error.message} [${error?.status || error?.name}]${
        !stack
          ? ""
          : `
${error.stack}`
      }`

      logger.error(`${message}`)
    }
  }
}
