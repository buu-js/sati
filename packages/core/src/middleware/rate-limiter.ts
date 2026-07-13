import { rateLimiter as limiter } from "hono-rate-limiter"
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { assert } from "@buujs/sati-utils"
import { Context } from "hono"

export type RateLimiterOptions = Omit<
  Parameters<typeof limiter>[0],
  "handler" | "keyGenerator" | "skip"
> & {
  limit?: number
  windowMs?: number
  skip?: (c: Context, ip: string) => boolean | Promise<boolean>
}

export const rateLimiter = (options: RateLimiterOptions) => {
  const { limit = 100, windowMs = 60_000, skip, ...rest } = options

  const _internal = limiter({
    ...rest,
    limit,
    windowMs,
    handler: async (c) => {
      throw new HTTPException(429, {
        message: `Too many requests from ${c.get("ip")}, please try again later`
      })
    },
    keyGenerator: (c) => {
      return `${c.get("ip")}:${c.req.path}`
    },
    skip: async (c) => {
      const ip = c.get("ip") as string
      if (skip) return skip(c, ip)
      return false
    }
  })

  return createMiddleware(async (ctx, next) => {
    const ip = ctx.get("ip")
    assert(!!ip, new HTTPException(500, { message: "IP Address missing" }))
    return _internal(ctx, next)
  })
}
