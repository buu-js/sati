import "hono"
import { createMiddleware } from "hono/factory"
import { createOdooClient } from "./client"
import { OdooConfig } from "./types"
import { OdooError } from "./errors"
import { HTTPException } from "hono/http-exception"
import { Context } from "hono"

export type OdooRefreshAuth = (
  c: Context,
  client: ReturnType<typeof createOdooClient>
) => Promise<void> | void

declare module "hono" {
  interface ContextVariableMap {
    odoo: ReturnType<typeof createOdooClient>
  }
}

export const odoo = (config: OdooConfig, onRefreshAuth: OdooRefreshAuth) =>
  createMiddleware(async (c, next) => {
    const client = createOdooClient(config)
    if (onRefreshAuth) await onRefreshAuth(c, client)
    c.set("odoo", client)

    try {
      await next()
    } catch (error) {
      if (error instanceof OdooError) {
        const status = error.code === 401 ? 401 : 400

        throw new HTTPException(status, {
          message: error.message,
          cause: error
        })
      }

      throw error
    }
  })
