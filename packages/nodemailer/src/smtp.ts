import nodemailer from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import { MailerAdapter, type BaseMailerConfig } from "./type"

export type SMTPMailerConfig = {
  host: string
  from: string
  user: string
  principal: string
  password: string
  port: number
  isProduction?: boolean
} & BaseMailerConfig

export const createSMTPMailer: MailerAdapter<SMTPMailerConfig> = (config) => {
  const opt: SMTPTransport.Options = config.isProduction
    ? {
        requireTLS: true,
        secure: config.port === 465,
        tls: { rejectUnauthorized: false },
        auth: {
          user: config.user,
          pass: config.password
        }
      }
    : {
        secure: false,
        auth: {
          pass: config.password,
          user: config.user
        }
      }

  const transportOptions = {
    host: config.host,
    port: config.port,
    ...opt
  }

  return nodemailer.createTransport(transportOptions, {
    from: `"${config.principal}" <${config.from}>`
  })
}
