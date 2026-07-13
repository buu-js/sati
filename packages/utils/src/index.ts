import { type HTTPException } from "hono/http-exception"

type AssertError = string | Error | HTTPException

export function assert(condition: unknown, error: AssertError): asserts condition {
  if (condition) {
    return
  }

  if (error instanceof Error) {
    throw error
  }

  throw new Error(error)
}
