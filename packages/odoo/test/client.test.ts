import { describe, it, expect, vi, beforeEach } from "vitest"
import { OdooError } from "../src/errors"

describe("Odoo Client", () => {
  const mockConfig = { host: "https://mock-odoo.com" }

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
    cookieValue = "session_id=mock_session_123;"
  ) => {
    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ result: data }),
      headers: { get: vi.fn().mockReturnValue(cookieValue) }
    })
  }

  const mockFetchError = (errorMsg: string) => {
    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ error: { message: errorMsg } }),
      headers: { get: vi.fn().mockReturnValue(null) }
    })
  }

  const createAuthenticatedClient = () => {
    const client = createOdooClient(mockConfig)
    client.setAuth({
      cookie: "session_id=mock_session_123",
      username: "admin",
      name: "Admin",
      uid: 1
    })
    return client
  }

  describe("login()", () => {
    it("should return user info and cookie on success", async () => {
      mockFetchSuccess({ username: "admin", name: "Admin User", uid: 1 })

      const client = createOdooClient(mockConfig)
      const result = await client.login({
        login: "admin",
        password: "password",
        db: "test_db"
      })

      expect(result).toEqual({
        cookie: "session_id=mock_session_123;",
        username: "admin",
        name: "Admin User",
        uid: 1
      })
    })

    it("should POST to /web/session/authenticate with correct body", async () => {
      mockFetchSuccess({ username: "admin", name: "Admin User", uid: 1 })

      const client = createOdooClient(mockConfig)
      await client.login({ login: "admin", password: "secret", db: "mydb" })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://mock-odoo.com/web/session/authenticate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: { login: "admin", password: "secret", db: "mydb" }
          })
        })
      )
    })

    it("should throw OdooError when the server returns an error response", async () => {
      mockFetchError("Invalid credentials")

      const client = createOdooClient(mockConfig)

      await expect(
        client.login({ login: "wrong", password: "bad", db: "db" })
      ).rejects.toThrow(OdooError)
    })
  })

  describe("setAuth()", () => {
    it("should enable authenticated exec calls after being set", async () => {
      mockFetchSuccess([{ id: 1, name: "Test" }])

      const client = createOdooClient(mockConfig)
      client.setAuth({ cookie: "session_id=abc", username: "u", name: "U", uid: 2 })

      const result = await client
        .model("res.partner")
        .findOne({ id: 1, fields: ["name"] })
      expect(result).toEqual([{ id: 1, name: "Test" }])
    })

    it("should reject exec calls before setAuth is called", async () => {
      const client = createOdooClient(mockConfig)
      await expect(
        client.model("res.partner").findOne({ id: 1, fields: ["name"] })
      ).rejects.toThrow(expect.objectContaining({ code: 401 }))
    })
  })

  describe("auth getter", () => {
    it("should return null before authentication", () => {
      const client = createOdooClient(mockConfig)
      expect(client.auth).toBeNull()
    })

    it("should return the session object after setAuth()", () => {
      const client = createOdooClient(mockConfig)
      client.setAuth({ cookie: "session_id=abc", username: "admin", name: "Admin", uid: 1 })
      expect(client.auth).toEqual({
        type: "session",
        cookie: "session_id=abc",
        username: "admin",
        name: "Admin",
        uid: 1
      })
    })

    it("should not be mutated after setAuth() is called", () => {
      const client = createOdooClient(mockConfig)
      client.setAuth({ cookie: "session_id=first", username: "u1", name: "U1", uid: 1 })
      client.setAuth({ cookie: "session_id=second", username: "u2", name: "U2", uid: 2 })
      expect(client.auth).toMatchObject({ cookie: "session_id=second", uid: 2 })
    })
  })

  describe("model() CRUD operations", () => {
    let resModel: any

    beforeEach(() => {
      resModel = createAuthenticatedClient().model("res.partner")
    })

    it("should throw 401 when client is not authenticated", async () => {
      const unauthModel = createOdooClient(mockConfig).model("res.partner")
      await expect(unauthModel.findOne({ id: 1, fields: ["name"] })).rejects.toThrow(
        expect.objectContaining({ code: 401 })
      )
    })

    it("should include Cookie header from the current session", async () => {
      mockFetchSuccess({ id: 42 })

      await resModel.create({ body: { name: "John" } })

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Cookie: "session_id=mock_session_123" })
        })
      )
    })

    describe("create()", () => {
      it("should call the create RPC method with correct params", async () => {
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

      it("should throw OdooError on RPC error", async () => {
        mockFetchError("Access denied")
        await expect(resModel.create({ body: { name: "X" } })).rejects.toThrow(
          OdooError
        )
      })
    })

    describe("findOne()", () => {
      it("should call the read RPC method with correct params", async () => {
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
    })

    describe("findMany()", () => {
      it("should call the search_read RPC method with correct params", async () => {
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
    })

    describe("update()", () => {
      it("should call the write RPC method with correct params", async () => {
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
    })

    describe("remove()", () => {
      it("should call the unlink RPC method with correct params", async () => {
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

  describe("accessControl()", () => {
    it("should throw 401 when not authenticated", async () => {
      const client = createOdooClient(mockConfig)
      await expect(client.accessControl()).rejects.toThrow(
        expect.objectContaining({ code: 401 })
      )
    })

    it("should return an empty array when user has no groups with a category", async () => {
      const client = createAuthenticatedClient()
      mockFetchSuccess([{ groups_id: [1] }])
      mockFetchSuccess([
        { id: 1, name: "Internal User", category_id: false, implied_ids: [] }
      ])

      const result = await client.accessControl()

      expect(result).toEqual([])
    })

    it("should return the top-level group per category (implied groups excluded)", async () => {
      const client = createAuthenticatedClient()
      mockFetchSuccess([{ groups_id: [1, 2] }])
      mockFetchSuccess([
        { id: 1, name: "User", category_id: [10, "Sales"], implied_ids: [] },
        { id: 2, name: "Manager", category_id: [10, "Sales"], implied_ids: [1] }
      ])

      const result = await client.accessControl()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        appId: 10,
        appName: "Sales",
        level: "Manager",
        allLevels: ["User", "Manager"]
      })
    })

    it("should return one entry per app category", async () => {
      const client = createAuthenticatedClient()
      mockFetchSuccess([{ groups_id: [1, 2] }])
      mockFetchSuccess([
        { id: 1, name: "Admin", category_id: [10, "Sales"], implied_ids: [] },
        { id: 2, name: "User", category_id: [20, "Inventory"], implied_ids: [] }
      ])

      const result = await client.accessControl()

      expect(result).toHaveLength(2)
      expect(result.find((r: any) => r.appId === 10)).toEqual({
        appId: 10,
        appName: "Sales",
        level: "Admin",
        allLevels: ["Admin"]
      })
      expect(result.find((r: any) => r.appId === 20)).toEqual({
        appId: 20,
        appName: "Inventory",
        level: "User",
        allLevels: ["User"]
      })
    })

    it("should first query res.users then res.groups with the correct RPC params", async () => {
      const client = createAuthenticatedClient()
      mockFetchSuccess([{ groups_id: [5, 6] }])
      mockFetchSuccess([
        { id: 5, name: "Admin", category_id: [10, "Sales"], implied_ids: [] },
        { id: 6, name: "User", category_id: [20, "HR"], implied_ids: [] }
      ])

      await client.accessControl()

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "https://mock-odoo.com/web/dataset/call_kw",
        expect.objectContaining({
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
              model: "res.users",
              method: "read",
              args: [[1], ["groups_id"]],
              kwargs: {}
            }
          })
        })
      )
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "https://mock-odoo.com/web/dataset/call_kw",
        expect.objectContaining({
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
              model: "res.groups",
              method: "search_read",
              kwargs: {
                domain: [["id", "in", [5, 6]]],
                fields: ["name", "category_id", "implied_ids"]
              },
              args: []
            }
          })
        })
      )
    })
  })
})
