import { Hono } from "hono"
import { compress } from "hono/compress"
import { cors } from "./middleware/cors"
import { errorHandler } from "./middleware/error-handler"
import { ip } from "./middleware/ip"
import { logger } from "./middleware/logger"
import { rateLimiter } from "./middleware/rate-limiter"
import { secureHeaders } from "hono/secure-headers"
import type { MiddlewareHandler } from "hono"

export interface MiddlewareFactory {
  compress: typeof compress
  secureHeaders: typeof secureHeaders
  cors: typeof cors
  ip: typeof ip
  logger: typeof logger
  rateLimiter: typeof rateLimiter
}

export interface CreateSatiOptions {
  middlewares: (
    m: MiddlewareFactory
  ) => (MiddlewareHandler<any, any, any> | undefined)[]
}

export function createSati(options: CreateSatiOptions) {
  const instance = new Hono()

  const m: MiddlewareFactory = {
    compress,
    secureHeaders,
    cors,
    ip,
    logger,
    rateLimiter
  }

  const selected = options.middlewares(m)

  selected.forEach((middleware) => {
    if (middleware) instance.use(middleware)
  })

  instance.onError(errorHandler)

  return instance
}
