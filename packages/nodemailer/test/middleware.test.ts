import { describe, it, expect, vi } from "vitest"
import { Hono } from "hono"
import { mailer } from "../src"
import type { MailerTransporter } from "../src/types"

describe("Mailer Middleware", () => {
  // 1. Create a minimal mock of MailerTransporter
  const mockTransporter = {
    sendMail: vi.fn()
  } as unknown as MailerTransporter

  it("should inject the mailer transporter into the Hono context", async () => {
    const app = new Hono()

    // Variable to capture the transporter inside the route
    let capturedMailer: MailerTransporter | undefined

    // 2. Register the middleware and a test route
    app.use("*", mailer(mockTransporter))
    app.get("/test", (c) => {
      capturedMailer = c.var.mailer // Access using augmented type
      return c.text("success")
    })

    // 3. Dispatch a mock request to the Hono app
    const res = await app.request("/test")

    // 4. Assertions
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("success")
    expect(capturedMailer).toBe(mockTransporter)
  })

  it("should call the next middleware/handler in the chain", async () => {
    const app = new Hono()
    const nextSpy = vi.fn()

    app.use("*", mailer(mockTransporter))
    app.get("/test", (c) => {
      nextSpy()
      return c.text("ok")
    })

    await app.request("/test")

    // Verifies that 'next()' was awaited and called successfully
    expect(nextSpy).toHaveBeenCalledTimes(1)
  })
})
