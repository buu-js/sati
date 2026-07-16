import { describe, it, expect, vi, beforeEach } from "vitest"
import { OdooError } from "../src/errors"

describe("Odoo Client", () => {
  const mockConfig = {
    host: "https://mock-odoo.com"
  }

  const fetchMock = vi.fn()
  let createOdooClient: any

  beforeEach(async () => {
    vi.restoreAllMocks()
    fetchMock.mockReset()

    vi.stubGlobal("fetch", fetchMock)

    const module = await import("../src/client")
    createOdooClient = module.createOdooClient
  })

  const mockFetchSuccess = (
    data: any,
    cookieValue: string = "session_id=mock_session_123;"
  ) => {
    fetchMock.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ result: data }),
      headers: {
        get: vi.fn().mockReturnValue(cookieValue)
      }
    })
  }

  const mockFetchError = (errorMsg: string) => {
    fetchMock.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: { message: errorMsg } }),
      headers: {
        get: vi.fn().mockReturnValue(null)
      }
    })
  }

  describe("Authentication", () => {
    it("should successfully authenticate a user", async () => {
      const mockSessionData = {
        cookie: "session_id=mock_session_123;",
        username: "admin",
        name: "Admin User",
        uid: 1
      }
      mockFetchSuccess(mockSessionData)

      const client = createOdooClient(mockConfig)
      const credentials = { username: "admin", password: "password", db: "test_db" }

      const result = await client.login(credentials)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://mock-odoo.com/web/session/authenticate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: credentials
          })
        })
      )
      expect(result).toEqual(mockSessionData)
    })

    it("should throw an HTTPException if login/fetch returns an error", async () => {
      mockFetchError("Invalid credentials")

      const client = createOdooClient(mockConfig)

      await expect(
        client.login({ username: "wrong", password: "bad", db: "db" })
      ).rejects.toThrow(OdooError)
    })
  })

  describe("Model Methods (CRUD)", () => {
    let client: any
    let resModel: any

    beforeEach(() => {
      client = createOdooClient(mockConfig)
      client.refreshAuth({
        type: "session",
        cookie: "session_id=mock_session_123",
        username: "admin",
        name: "Admin",
        uid: 1
      })
      resModel = client.model("res.partner")
    })

    it("should throw 401 unauthenticated if auth is missing or invalid", async () => {
      const unauthClient = createOdooClient(mockConfig)
      const unauthModel = unauthClient.model("res.partner")

      await expect(unauthModel.findOne({ id: 1, fields: ["name"] })).rejects.toThrow(
        expect.objectContaining({ code: 401 })
      )
    })

    it("should handle create method correctly", async () => {
      mockFetchSuccess({ id: 42 })

      const result = await resModel.create({ body: { name: "John Doe" } })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://mock-odoo.com/web/dataset/call_kw",
        expect.objectContaining({
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
              model: "res.partner",
              method: "create",
              args: [{ name: "John Doe" }],
              kwargs: {}
            }
          })
        })
      )
      expect(result).toEqual({ id: 42 })
    })

    it("should handle findOne (read) method correctly", async () => {
      const mockRecord = { id: 1, name: "Alice" }
      mockFetchSuccess([mockRecord])

      const result = await resModel.findOne({ id: 1, fields: ["name"] })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://mock-odoo.com/web/dataset/call_kw",
        expect.objectContaining({
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
              model: "res.partner",
              method: "read",
              args: [[1], ["name"]],
              kwargs: {}
            }
          })
        })
      )
      expect(result).toEqual([mockRecord])
    })

    it("should handle findMany (search_read) method correctly", async () => {
      const mockRecords = [{ id: 1, name: "Alice" }]
      mockFetchSuccess(mockRecords)

      const result = await resModel.findMany({
        domain: [["is_company", "=", "true"]],
        fields: ["name"],
        limit: 10
      })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://mock-odoo.com/web/dataset/call_kw",
        expect.objectContaining({
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
              model: "res.partner",
              method: "search_read",
              kwargs: {
                domain: [["is_company", "=", "true"]],
                fields: ["name"],
                limit: 10
              },
              args: []
            }
          })
        })
      )
      expect(result).toEqual(mockRecords)
    })

    it("should handle update (write) method correctly", async () => {
      mockFetchSuccess(true)

      const result = await resModel.update({ id: 1, body: { name: "Updated Name" } })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://mock-odoo.com/web/dataset/call_kw",
        expect.objectContaining({
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
              model: "res.partner",
              method: "write",
              args: [[1], { name: "Updated Name" }],
              kwargs: {}
            }
          })
        })
      )
      expect(result).toBe(true)
    })

    it("should handle remove (unlink) method correctly", async () => {
      mockFetchSuccess(true)

      const result = await resModel.remove({ id: 1 })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://mock-odoo.com/web/dataset/call_kw",
        expect.objectContaining({
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
              model: "res.partner",
              method: "unlink",
              args: [[1]],
              kwargs: {}
            }
          })
        })
      )
      expect(result).toBe(true)
    })
  })
})
