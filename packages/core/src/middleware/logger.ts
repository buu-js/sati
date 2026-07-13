import "hono"
import { createMiddleware } from "hono/factory"
import { createLogger } from "../logger"

declare module "hono" {
  interface ContextVariableMap {
    logger: ReturnType<typeof createLogger>
  }
}

export const logger = () =>
  createMiddleware(async (c, next) => {
    const logger = createLogger(c)
    c.set("logger", logger)
    await next()
  })
