import "hono"
import { createMiddleware } from "hono/factory"
import { MailerTransporter } from "./types"

declare module "hono" {
  interface ContextVariableMap {
    mailer: MailerTransporter
  }
}

export const mailer = (transporter: MailerTransporter) =>
  createMiddleware(async (c, next) => {
    c.set("mailer", transporter)
    await next()
  })

export * from "./types"
