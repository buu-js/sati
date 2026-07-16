import {
  OdooConfig,
  OdooFetchOptions,
  OdooLogin,
  OdooParams,
  OdooResponse,
  OdooSession
} from "./types"
import { OdooError } from "./errors"
import { assert } from "@buujs/sati-utils"

export const createOdooClient = (config: OdooConfig) => {
  const { host, dispatcher } = config
  let auth: OdooSession | OdooLogin | null = null

  async function odooFetch<T>(
    url: string,
    { params, cookie, dispatcher }: OdooFetchOptions
  ) {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie && { Cookie: cookie })
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params
      }),
      dispatcher
    }

    const response = await fetch(url, options)
    const data = (await response.json()) as OdooResponse<T>

    assert(!data?.error, new OdooError({ ...data.error!, code: 400 }))
    const setCookie = response.headers.get("set-cookie")!

    return { result: data.result, cookie: setCookie }
  }

  async function login({ username, password, db }: Omit<OdooLogin, "type">) {
    const { result, cookie } = (await odooFetch(`${host}/web/session/authenticate`, {
      params: {
        username,
        password,
        db
      },
      dispatcher
    })) as { result: Record<string, any>; cookie?: string }

    return {
      cookie,
      username: result.username,
      name: result.name,
      uid: result.uid
    }
  }

  function refreshAuth<Session extends OdooSession>(_auth: Omit<Session, "type">) {
    auth = { type: "session", ..._auth }
  }

  const exec = async <T>({ params }: { params: OdooParams }): Promise<T> => {
    assert(
      auth?.type === "session" && !!auth.cookie,
      new OdooError({ code: 401, message: "Odoo unauthenticated" })
    )
    if (!params.args) params.args = []
    if (!params.kwargs) params.kwargs = {}

    const { result } = await odooFetch(`${host}/web/dataset/call_kw`, {
      params,
      cookie: auth.cookie
    })

    return result as Promise<T>
  }

  const create = async <T>(
    model: string,
    options: {
      body: Record<string, any>
    }
  ) =>
    await exec<T>({
      params: {
        model,
        method: "create",
        args: [options.body]
      }
    })

  const findOne = async <T>(
    model: string,
    options: {
      id: number
      fields: string[]
    }
  ) =>
    await exec<T>({
      params: {
        model,
        method: "read",
        args: [[options.id], options.fields]
      }
    })

  const findMany = async <T>(
    model: string,
    options: {
      fields: string[]
      limit: number
      domain: [string, string, string][]
    }
  ) =>
    await exec<T>({
      params: {
        model,
        method: "search_read",
        kwargs: {
          domain: options.domain,
          fields: options.fields,
          limit: options.limit
        }
      }
    })

  const update = async <T>(
    model: string,
    options: {
      id: number
      body: Record<string, any>
    }
  ) =>
    await exec<T>({
      params: {
        model,
        method: "write",
        args: [[options.id], options.body]
      }
    })

  const remove = async <T>(
    model: string,
    options: {
      id: number
    }
  ) =>
    await exec<T>({
      params: {
        model,
        method: "unlink",
        args: [[options.id]]
      }
    })

  const methods = { create, findOne, findMany, update, remove }

  type OdooClientMethods = {
    [K in keyof typeof methods]: (typeof methods)[K] extends (
      _: string,
      ...args: infer O
    ) => any
      ? <T>(...args: O) => Promise<T>
      : never
  }

  return {
    login,
    refreshAuth,
    model: (name: string) => {
      const model = {} as any
      Object.entries(methods).forEach(([key, fn]) => {
        model[key] = (opt: any) => fn(name, opt)
      })
      return model as OdooClientMethods
    }
  }
}
