import "hono"
import { createMiddleware } from "hono/factory"
import { MailerTransporter } from "./type"

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
