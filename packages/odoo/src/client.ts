import {
  AppAccess,
  GroupDetail,
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

  async function login({ login, password, db }: Omit<OdooLogin, "type">) {
    const { result, cookie } = (await odooFetch(`${host}/web/session/authenticate`, {
      params: {
        login,
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

  async function accessControl(): Promise<AppAccess[]> {
    assert(
      auth?.type === "session" && !!auth.uid,
      new OdooError({ code: 401, message: "Odoo unauthenticated" })
    )

    const userResult: any = await exec({
      params: {
        model: "res.users",
        method: "read",
        args: [[auth?.uid], ["groups_id"]]
      }
    })

    const groupIds: number[] = userResult[0].groups_id
    const groups: any = await exec({
      params: {
        model: "res.groups",
        method: "search_read",
        kwargs: {
          domain: [["id", "in", groupIds]],
          fields: ["name", "category_id", "implied_ids"]
        }
      }
    })

    return computeAccessControl(groups)

    function computeAccessControl(groups: GroupDetail[]): AppAccess[] {
      const byCategory: Record<number, GroupDetail[]> = {}

      for (const g of groups) {
        if (!g.category_id) continue // grup teknis tanpa app, skip
        const catId = g.category_id[0]
        ;(byCategory[catId] ??= []).push(g)
      }

      const result: AppAccess[] = []

      for (const [catIdStr, groupsInCat] of Object.entries(byCategory)) {
        const catId = Number(catIdStr)

        const impliedSet = new Set<number>()
        for (const g of groupsInCat) {
          g.implied_ids.forEach((id) => impliedSet.add(id))
        }

        const topGroups = groupsInCat.filter((g) => !impliedSet.has(g.id))

        result.push({
          appId: catId,
          appName: (groupsInCat[0].category_id as [number, string])[1],
          level: topGroups.map((g) => g.name).join(" / "),
          allLevels: groupsInCat.map((g) => g.name)
        })
      }

      return result
    }
  }

  function setAuth<Session extends OdooSession>(_auth: Omit<Session, "type">) {
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
    accessControl,
    get auth() {
      return auth
    },
    setAuth,
    model: (name: string) => {
      const model = {} as any
      Object.entries(methods).forEach(([key, fn]) => {
        model[key] = (opt: any) => fn(name, opt)
      })
      return model as OdooClientMethods
    }
  }
}
