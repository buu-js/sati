import "hono"
import { GetConnInfo } from "hono/conninfo"
import { createMiddleware } from "hono/factory"

declare module "hono" {
  interface ContextVariableMap {
    ip: string
  }
}

interface IpOptions {
  getConnInfo: GetConnInfo
}

export const ip = (options: IpOptions) =>
  createMiddleware(async (c, next) => {
    const info = options.getConnInfo(c)
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.raw.headers.get("x-real-ip") ||
      info?.remote?.address ||
      "unknown"

    c.set("ip", ip)
    await next()
  })
