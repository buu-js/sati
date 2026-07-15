import type nodemailer from "nodemailer"

export type BaseMailerConfig = {
  from: string
  principal: string
}

export type MailerTransporter = nodemailer.Transporter
export type MailerAdapter<T> = (config: T) => MailerTransporter
