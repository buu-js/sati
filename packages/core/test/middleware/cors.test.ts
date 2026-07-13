import { describe, expect, it } from "vitest"
import { Hono } from "hono"
import { cors } from "../../src/middleware/cors"

describe("CORS Middleware", () => {
  const config = {
    wildcardDomain: "example.com",
    fallbackHost: "http://localhost:8081"
  }

  const createTargetApp = () => {
    const app = new Hono()
    app.use("*", cors(config))
    app.get("/test", (c) => c.text("success"))
    return app
  }

  it("should allow the exact wildcard domain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com")
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true")
  })

  it("should allow a valid subdomain of the wildcard domain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://app.example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.example.com"
    )
  })

  it("should allow a deeply nested subdomain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://staging.dev.example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://staging.dev.example.com"
    )
  })

  it("should allow HTTP protocol for local development if specified", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "http://example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com")
  })

  it("should allow the exact fallback host", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "http://localhost:8081" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8081")
  })

  it("should block a malicious domain suffixing the target domain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://example.com.attacker.com" }
    })

    // Expecting null/undefined because Hono omits the header when undefined is returned
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })

  it("should block a malicious domain prefixing the target domain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://fake-example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })

  it("should block completely unrelated domains", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://google.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })
})
