export type OdooSession = {
  type: "session"
  cookie: string
  username: string
  name: string
  uid: number
}

export type OdooLogin = {
  type: "login"
  username: string
  password: string
  db: string
}

export interface OdooConfig {
  host: string
  dispatcher?: unknown
}

export type OdooFetchOptions = {
  params: Record<string, any>
  cookie?: string
  dispatcher?: unknown
}

export interface OdooParams {
  model: string
  method: string
  args?: any[]
  kwargs?: Record<string, any>
}

export interface OdooResponse<T = any> {
  jsonrpc: string
  id: number | null
  result?: T
  error?: {
    code: number
    message: string
    data: any
  }
}

export type OdooCreate<T> = (
  model: string,
  options: {
    body: Record<string, any>
  }
) => Promise<OdooResponse<T>>

export type OdooFind<T> = (
  model: string,
  options: { fields: string[]; limit: number; query: string[] }
) => Promise<OdooResponse<T>>

export type OdooUpdate<T> = (
  model: string,
  { id, body }: { id: number; body: Record<string, any> }
) => Promise<OdooResponse<T>>
