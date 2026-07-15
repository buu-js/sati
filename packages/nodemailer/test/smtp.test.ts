import { describe, it, expect, vi, beforeEach } from "vitest"
import nodemailer from "nodemailer"
import { createSMTPMailer, type SMTPMailerConfig } from "../src/smtp"

// Mock nodemailer entirely
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({ sendMail: vi.fn() })
  }
}))

describe("createSMTPMailer", () => {
  const baseConfig: SMTPMailerConfig = {
    host: "smtp.example.com",
    from: "noreply@example.com",
    user: "user@example.com",
    principal: "My App Team",
    password: "securepassword",
    port: 587
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should configure transport for a development/non-production environment", () => {
    const config = { ...baseConfig, isProduction: false }

    createSMTPMailer(config)

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: {
          user: "user@example.com",
          pass: "securepassword"
        }
      },
      {
        from: '"My App Team" <noreply@example.com>'
      }
    )
  })

  it("should configure transport for a production environment with standard TLS ports", () => {
    const config = { ...baseConfig, isProduction: true, port: 587 }

    createSMTPMailer(config)

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      {
        host: "smtp.example.com",
        port: 587,
        requireTLS: true,
        secure: false, // 587 is STARTTLS, so secure is false initially
        tls: { rejectUnauthorized: false },
        auth: {
          user: "user@example.com",
          pass: "securepassword"
        }
      },
      {
        from: '"My App Team" <noreply@example.com>'
      }
    )
  })

  it("should set secure to true in production if port is 465 (SSL/TLS)", () => {
    const config = { ...baseConfig, isProduction: true, port: 465 }

    createSMTPMailer(config)

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        secure: true
      }),
      expect.any(Object)
    )
  })
})
